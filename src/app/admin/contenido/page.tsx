"use client";
/* eslint-disable @next/next/no-img-element */
import {useEffect,useMemo,useState,type ChangeEvent,type FormEvent} from "react";
import Link from "next/link";
import {AdminAccessGate} from "@/components/AdminAccessGate";
import {oportuniaClient} from "@/lib/oportuniaSupabase";
import {defaultHomeContent,normalizeHomeContent,type HomeContentData,type HomeCard} from "@/lib/homeContent";
import {selectPrizeImage} from "@/lib/prizePhotography";

type PageTab="portada"|"beneficios"|"tarjetas"|"imagenes";
type TextKey=Exclude<keyof HomeContentData,"trustLabels"|"benefits">;
type Featured={id:string;title:string;prize:string;hero_image_url:string|null;prize_image_url:string|null};
const fields:{key:TextKey;label:string;long?:boolean}[]=[
 {key:"heroEyebrow",label:"Etiqueta pequeña de portada"},
 {key:"heroPrefix",label:"Frase antes del nombre del premio"},
 {key:"heroDescription",label:"Descripción principal",long:true},
 {key:"primaryButton",label:"Texto del botón principal"},
 {key:"secondaryButton",label:"Texto del botón secundario"},
 {key:"carouselKicker",label:"Etiqueta de la sección de premios"},
 {key:"carouselTitle",label:"Título de la sección de premios"},
 {key:"carouselDescription",label:"Descripción de la sección de premios",long:true}
];
function Editor(){
 const client=useMemo(()=>oportuniaClient(),[]);
 const [tab,setTab]=useState<PageTab>("portada");
 const [form,setForm]=useState<HomeContentData>(defaultHomeContent);
 const [cards,setCards]=useState<HomeCard[]>([]);
 const [featured,setFeatured]=useState<Featured|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [notice,setNotice]=useState(""),[error,setError]=useState("");
 async function refresh(){
  const [a,b,c]=await Promise.all([
   client.from("home_content").select("content").eq("id","homepage").single(),
   client.from("home_cards").select("*").order("display_order"),
   client.from("draw_catalog").select("id,title,prize,hero_image_url,prize_image_url").eq("id","principal").maybeSingle()
  ]);
  if(a.error||b.error||c.error)throw new Error("No se pudo cargar el contenido editorial. Comprueba tus permisos y las migraciones.");
  setForm(normalizeHomeContent(a.data?.content as Partial<HomeContentData>));
  setCards((b.data||[]) as HomeCard[]);
  setFeatured(c.data as Featured|null);
 }
 useEffect(()=>{let active=true;
  void refresh().catch(e=>{if(active)setError(e instanceof Error?e.message:"No se pudo cargar");})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[]);
 async function saveHome(e:FormEvent){
  e.preventDefault();if(busy)return;setBusy(true);setError("");setNotice("");
  try{
   const data=normalizeHomeContent(form);
   const {data:updated,error:err}=await client.from("home_content").update({content:data,updated_at:new Date().toISOString()})
    .eq("id","homepage").select("id").single();
   if(err||!updated)throw err||Error("No se guardaron cambios");
   setForm(data);setNotice("Los textos quedaron publicados en Supabase.");
  }catch(e){setError(e instanceof Error?e.message:"No se pudieron guardar los textos");}
  finally{setBusy(false);}
 }
 function editCard(id:string,patch:Partial<HomeCard>){
  setCards(old=>old.map(c=>c.id===id?{...c,...patch}:c));
 }
 async function saveCard(card:HomeCard){
  if(busy)return;setBusy(true);setError("");setNotice("");
  try{
   if(card.title.trim().length<3)throw Error("Escribe un título de al menos 3 caracteres.");
   const {data,error:err}=await client.from("home_cards").update({
    title:card.title.trim(),description:card.description.trim(),image_url:card.image_url||null,
    display_order:card.display_order,enabled:card.enabled,updated_at:new Date().toISOString()
   }).eq("id",card.id).select("id").single();
   if(err||!data)throw err||Error("No se guardaron cambios");
   setNotice("Tarjeta guardada en Supabase. Los visitantes verán el cambio al actualizar.");
  }catch(e){setError(e instanceof Error?e.message:"No se pudo guardar la tarjeta");}
  finally{setBusy(false);}
 }
 async function addCard(){
  if(busy)return;setBusy(true);setError("");setNotice("");
  const id="idea-"+crypto.randomUUID().slice(0,12);
  try{
   const {error:err}=await client.from("home_cards").insert({
    id,title:"Nueva idea de premio",description:"Agrega una descripción de esta idea de premio.",
    display_order:cards.length+2,enabled:false
   });
   if(err)throw err;
   await refresh();setTab("tarjetas");setNotice("Nueva tarjeta creada como oculta. Edita y activa cuando esté lista.");
  }catch(e){setError(e instanceof Error?e.message:"No fue posible crear la tarjeta");}
  finally{setBusy(false);}
 }
 async function uploadImage(event:ChangeEvent<HTMLInputElement>,itemId:string,kind:"hero"|"prize"|"card"){
  const file=event.target.files?.[0];event.target.value="";if(!file||busy)return;
  setError("");setNotice("");
  if(file.size>6*1024*1024||!["image/jpeg","image/png","image/webp"].includes(file.type)){
   setError("Utiliza JPG, PNG o WebP de máximo 6 MB. Recomendado: 800 × 1000 px (4:5).");return;
  }
  setBusy(true);
  try{
   const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
   const path="home/"+itemId+"/"+kind+"-"+crypto.randomUUID()+"."+ext;
   const {error:upErr}=await client.storage.from("draw-media").upload(path,file,{contentType:file.type,upsert:false});
   if(upErr)throw upErr;
   const url=client.storage.from("draw-media").getPublicUrl(path).data.publicUrl;
   const target=itemId==="principal"?"draw_catalog":"home_cards";
   const column=kind==="hero"?"hero_image_url":kind==="prize"?"prize_image_url":"image_url";
   const {data,error:writeErr}=await client.from(target).update({[column]:url,updated_at:new Date().toISOString()})
    .eq("id",itemId).select("id").single();
   if(writeErr||!data)throw writeErr||Error("No se vinculó la imagen");
   await refresh();setNotice("Imagen subida y publicada. Se recorta automáticamente al formato fijo.");
  }catch(e){setError(e instanceof Error?e.message:"No se pudo subir la imagen");}
  finally{setBusy(false);}
 }
 const updateText=(key:TextKey,value:string)=>setForm(prev=>({...prev,[key]:value}));
 const updateBenefit=(i:number,key:"title"|"detail",value:string)=>setForm(prev=>({
  ...prev,benefits:prev.benefits.map((b,n)=>i===n?{...b,[key]:value}:b)
 }));
 const tabnames:Record<PageTab,string>={portada:"Portada y botones",beneficios:"Beneficios e iconos",tarjetas:"Tarjetas del carrusel",imagenes:"Imágenes de portada"};
 return <section className="container page-space">
  <div className="admin-back-row"><Link href="/admin" className="btn btn-secondary">‹ Volver al dashboard</Link></div>
  <div className="page-title"><span className="overline">EDITOR DE CONTENIDO · SUPABASE</span>
   <h1>Contenido <span className="gradient-text">web.</span></h1>
   <p>Actualiza títulos, descripciones e imágenes sin tocar el código. El carrusel se mueve automáticamente y las imágenes conservan proporción fija.</p>
  </div>
  <p className="o-home-cms-help">Las ediciones anunciadas se editan en <Link href="/admin/catalogo">Catálogo e imágenes</Link>. Las ideas para futuras ediciones se editan aquí y no habilitan ventas ni números.</p>
  {error&&<div className="alert alert-error" role="alert">{error}</div>}
  {notice&&<div className="alert alert-success" role="status">{notice}</div>}
  {loading?<p>Cargando ajustes…</p>:<>
   <div className="o-home-cms-tabs">{(Object.keys(tabnames) as PageTab[]).map(k=>
    <button type="button" key={k} className={tab===k?"btn btn-primary":"btn btn-secondary"} onClick={()=>setTab(k)}>{tabnames[k]}</button>)}</div>
   {(tab==="portada"||tab==="beneficios")&&<form onSubmit={saveHome} className="panel form-stack">
    {tab==="portada"?<div className="o-home-cms-fieldgrid">
     {fields.map(field=><label key={field.key}>{field.label}
      {field.long?<textarea rows={3} maxLength={300} value={form[field.key]} onChange={e=>updateText(field.key,e.target.value)}/>:
       <input maxLength={85} value={form[field.key]} onChange={e=>updateText(field.key,e.target.value)}/>}
     </label>)}
    </div>:<>
     <h2>Iconos de la parte superior</h2><p className="o-home-cms-help">El escudo, los números y la campana permanecen alineados. Puedes cambiar sus textos.</p>
     <div className="o-home-cms-fieldgrid">{form.trustLabels.map((text,i)=><label key={i}>Icono {i+1}
      <input maxLength={45} value={text} onChange={e=>setForm(prev=>({...prev,trustLabels:prev.trustLabels.map((t,j)=>j===i?e.target.value:t) as HomeContentData["trustLabels"]}))}/>
     </label>)}</div>
     <h2>Franja de cuatro beneficios</h2>
     <div className="o-home-cms-fieldgrid">{form.benefits.map((b,i)=><div className="o-home-cms-card" key={i}>
      <strong>Beneficio {i+1}</strong><label>Título<input maxLength={80} value={b.title} onChange={e=>updateBenefit(i,"title",e.target.value)}/></label>
      <label>Descripción<textarea rows={2} maxLength={160} value={b.detail} onChange={e=>updateBenefit(i,"detail",e.target.value)}/></label>
     </div>)}</div>
    </>}
    <button className="btn btn-primary" type="submit" disabled={busy}>{busy?"Guardando…":"Guardar y publicar textos"}</button>
   </form>}
   {tab==="tarjetas"&&<section className="panel">
    <div className="panel-heading"><div><h2>Ideas de premios del carrusel</h2><p>Ordena, muestra u oculta y cambia las fotografías. Cada tarjeta usa proporción 4:5.</p></div>
      <button type="button" className="btn btn-secondary" disabled={busy} onClick={()=>void addCard()}>+ Nueva tarjeta</button></div>
    <div className="o-home-cms-fieldgrid">{cards.map(card=>{
     const photo=selectPrizeImage(card.id,card.image_url,"/raffles/iphone18-product.svg");
     return <article key={card.id} className="o-home-cms-card">
      <div className="o-home-cms-photo"><img src={photo.src} alt={"Vista de "+card.title}/></div>
      <label>Nombre del premio<input maxLength={90} value={card.title} onChange={e=>editCard(card.id,{title:e.target.value})}/></label>
      <label>Descripción<textarea rows={3} maxLength={240} value={card.description} onChange={e=>editCard(card.id,{description:e.target.value})}/></label>
      <label>Orden<input type="number" min="0" max="10000" value={card.display_order} onChange={e=>editCard(card.id,{display_order:Number(e.target.value)})}/></label>
      <label className="terms-accept"><input type="checkbox" checked={card.enabled} onChange={e=>editCard(card.id,{enabled:e.target.checked})}/><span>Mostrar idea en la web</span></label>
      <label className="o-home-cms-upload">Subir fotografía (JPG, PNG, WebP)
       <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>void uploadImage(e,card.id,"card")}/></label>
      <button type="button" className="btn btn-primary" disabled={busy} onClick={()=>void saveCard(card)}>{busy?"Procesando…":"Guardar tarjeta"}</button>
     </article>;
    })}</div>
   </section>}
   {tab==="imagenes"&&<section className="panel">
    <h2>Imágenes de la edición principal</h2>
    <p className="o-home-cms-help">Puedes cambiar la fotografía grande de portada y la tarjeta del premio. Para cambiar el nombre y la descripción, utiliza el catálogo.</p>
    {featured?<div className="o-home-cms-fieldgrid">{(["hero","prize"] as const).map(kind=>{
     const selected=selectPrizeImage(featured.id,kind==="hero"?featured.hero_image_url:featured.prize_image_url,"/raffles/iphone18-product.svg");
     return <article className="o-home-cms-card" key={kind}>
      <h3>{kind==="hero"?"Imagen grande de portada":"Imagen del premio en carrusel"}</h3>
      <div className="o-home-cms-photo"><img src={selected.src} alt={"Vista de "+featured.title}/></div>
      <p className="o-home-cms-help">Formato recomendado: 800 × 1000 px (4:5), máximo 6 MB. La portada utiliza marco 4:3.</p>
      <label className="o-home-cms-upload">Subir fotografía
       <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>void uploadImage(e,featured.id,kind)}/></label>
     </article>;
    })}</div>:<p>No se encontró la edición principal.</p>}
   </section>}
  </>}
 </section>;
}
export default function AdminHomeContentPage(){return <AdminAccessGate requiredPermission="catalog.write"><Editor/></AdminAccessGate>;}
