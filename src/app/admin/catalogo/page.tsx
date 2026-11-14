"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState, type FormEvent, type ChangeEvent } from "react";
import { AdminAccessGate } from "@/components/AdminAccessGate";
import Link from "next/link";
import { oportuniaClient, SUPABASE_URL } from "@/lib/oportuniaSupabase";
type Draw = { id:string; title:string; prize:string; description:string; enabled:boolean; status:string; display_order:number; hero_image_url:string|null; prize_image_url:string|null };
function CatalogEditor() {
  const client = useMemo(()=>oportuniaClient(),[]);
  const [draws,setDraws]=useState<Draw[]>([]);
  const [selected,setSelected]=useState("");
  const [form,setForm]=useState<Draw|null>(null);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  async function refresh(){
    const {data,error:err}=await client.from("draw_catalog").select("*").order("display_order");
    if(err){setError("No fue posible consultar los sorteos.");return;}
    setDraws((data||[]) as Draw[]);
  }
  useEffect(()=>{void refresh();},[]);
  useEffect(()=>{setForm(draws.find(d=>d.id===selected)||null);},[selected,draws]);
  async function save(e:FormEvent){
    e.preventDefault();if(!form)return;setBusy(true);setError("");setNotice("");
    const {error:err}=await client.from("draw_catalog").update({
      title:form.title.trim(),prize:form.prize.trim(),description:form.description.trim(),
      enabled:form.enabled,status:form.status,display_order:form.display_order,
      updated_at:new Date().toISOString(),
    }).eq("id",form.id);
    if(err)setError("No se pudieron guardar los cambios. Verifica permisos y campos.");
    else{setNotice("Sorteo actualizado en Supabase.");await refresh();}
    setBusy(false);
  }
  async function create(){
    setError("");setNotice("");
    const id="sorteo-"+crypto.randomUUID().slice(0,8);
    const {error:err}=await client.from("draw_catalog").insert({
      id,title:"Nuevo sorteo",prize:"Premio por definir",description:"Próxima edición",enabled:false,status:"preview",display_order:draws.length+1,
    });
    if(err)setError("No fue posible crear el sorteo.");else{await refresh();setSelected(id);setNotice("Sorteo creado como no publicado.");}
  }
  async function upload(e:ChangeEvent<HTMLInputElement>,kind:"hero"|"prize"){
    const file=e.target.files?.[0];e.target.value="";if(!file||!form)return;
    setError("");setNotice("");
    if(file.size>6*1024*1024||!["image/png","image/jpeg","image/webp"].includes(file.type)){
      setError("Solo JPG, PNG o WebP de hasta 6 MB.");return;
    }
    setBusy(true);
    const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
    const path=form.id+"/"+kind+"-"+crypto.randomUUID()+"."+ext;
    const {error:err}=await client.storage.from("draw-media").upload(path,file,{contentType:file.type,upsert:false});
    if(err){setError("No se pudo subir la imagen. Revisa permisos.");setBusy(false);return;}
    const url=SUPABASE_URL+"/storage/v1/object/public/draw-media/"+path;
    const field=kind==="hero"?"hero_image_url":"prize_image_url";
    const {error:updateErr}=await client.from("draw_catalog").update({[field]:url,updated_at:new Date().toISOString()}).eq("id",form.id);
    if(updateErr){setError("La imagen se subió pero no se vinculó. Revisa permisos.");}
    else{setNotice("Imagen publicada en Supabase.");await refresh();}
    setBusy(false);
  }
  return <section className="container page-space">
    <div className="admin-back-row"><Link href="/admin" className="btn btn-primary">‹ Ver menú de todos los módulos</Link></div>
    <div className="page-title"><span className="overline">ADMINISTRACIÓN PROTEGIDA</span><h1>Catálogo e imágenes</h1>
      <p>Gestiona las ediciones públicas y sus dos imágenes independientes en Supabase. <a href="/admin/opiniones">Moderar opiniones y publicar resultados verificados →</a></p></div>
    <div className="alert alert-warning">La publicación de una ficha no habilita pagos ni participación. El catálogo es informativo hasta completar las autorizaciones y la plataforma transaccional.</div>
    <div className="two-col-layout">
      <section className="panel"><h2>Sorteos</h2><button className="btn btn-secondary" onClick={()=>void create()} type="button">+ Crear sorteo</button>
        <div className="stack top-gap">{draws.map(d=><button key={d.id} type="button" className="btn btn-ghost" onClick={()=>setSelected(d.id)}>
          {d.title} · {d.enabled?"Visible":"Oculto"}</button>)}</div>
      </section>
      <section className="panel">
        {!form?<p>Selecciona un sorteo para editar su contenido.</p>:<form className="form-stack" onSubmit={save}>
          <h2>{form.title}</h2>
          <label>Título<input required minLength={5} maxLength={90} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
          <label>Premio<input required minLength={2} maxLength={90} value={form.prize} onChange={e=>setForm({...form,prize:e.target.value})}/></label>
          <label>Descripción<input maxLength={200} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
          <label>Estado<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
            <option value="preview">En preparación</option><option value="coming_soon">Próximamente</option><option value="closed">Cerrado</option>
          </select></label>
          <label>Orden<input type="number" min="0" max="10000" value={form.display_order} onChange={e=>setForm({...form,display_order:Number(e.target.value)})}/></label>
          <label className="terms-accept"><input type="checkbox" checked={form.enabled} onChange={e=>setForm({...form,enabled:e.target.checked})}/> <span>Mostrar en el catálogo público</span></label>
          <button className="btn btn-primary" disabled={busy} type="submit">Guardar en Supabase</button>
        </form>}
        {form&&<div className="admin-image-grid top-gap">
          {(["hero","prize"] as const).map(kind=><div className="admin-image-card" key={kind}>
            <h3>{kind==="hero"?"Portada promocional":"Imagen del premio"}</h3>
            {(kind==="hero"?form.hero_image_url:form.prize_image_url)&&<div className="admin-image-preview">
              <img src={(kind==="hero"?form.hero_image_url:form.prize_image_url)||""} alt={"Vista previa "+kind}/></div>}
            <label className="btn btn-secondary admin-image-picker">Subir imagen
              <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>void upload(e,kind)}/></label>
          </div>)}
        </div>}
        {notice&&<div role="status" className="alert alert-success top-gap">{notice}</div>}
        {error&&<div role="alert" className="alert alert-error top-gap">{error}</div>}
      </section>
    </div>
  </section>;
}
export default function CatalogAdminPage(){return <AdminAccessGate><CatalogEditor/></AdminAccessGate>;}
