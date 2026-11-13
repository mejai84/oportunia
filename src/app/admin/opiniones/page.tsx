"use client";
import { useEffect,useMemo,useState,type FormEvent } from "react";
import { AdminAccessGate } from "@/components/AdminAccessGate";
import { oportuniaClient } from "@/lib/oportuniaSupabase";
type Review={id:string;draw_id:string;display_name:string;rating:number;comment:string;status:string;created_at:string};
type Draw={id:string;title:string};
type Result={id:string;draw_id:string;draw_date:string;winning_number:string;winner_display_name:string;result_source:string;verified_at:string|null};
function ContentModeration(){
 const client=useMemo(()=>oportuniaClient(),[]);
 const [reviews,setReviews]=useState<Review[]>([]);
 const [draws,setDraws]=useState<Draw[]>([]);
 const [results,setResults]=useState<Result[]>([]);
 const [drawId,setDrawId]=useState("");
 const [date,setDate]=useState("");
 const [number,setNumber]=useState("");
 const [winner,setWinner]=useState("");
 const [source,setSource]=useState("");
 const [verified,setVerified]=useState(false);
 const [notice,setNotice]=useState("");
 const [busy,setBusy]=useState(false);
 async function refresh(){
  const [a,b,c]=await Promise.all([
   client.from("draw_reviews").select("id,draw_id,display_name,rating,comment,status,created_at").order("created_at",{ascending:false}).limit(100),
   client.from("draw_catalog").select("id,title").order("display_order"),
   client.from("draw_results").select("id,draw_id,draw_date,winning_number,winner_display_name,result_source,verified_at").order("draw_date",{ascending:false})
  ]);
  if(a.error||b.error||c.error){setNotice("No se pudieron consultar los datos. Verifica el permiso de administrador.");return;}
  setReviews((a.data||[]) as Review[]);setDraws((b.data||[]) as Draw[]);setResults((c.data||[]) as Result[]);
  if(!drawId&&b.data?.length)setDrawId(b.data[0].id);
 }
 useEffect(()=>{void refresh();},[]);
 async function moderate(id:string,status:"published"|"hidden"){
  setBusy(true);setNotice("");
  const {error}=await client.from("draw_reviews").update({status,updated_at:new Date().toISOString()}).eq("id",id);
  setNotice(error?"No se pudo actualizar la opinión.":"Opinión actualizada.");
  if(!error)await refresh();setBusy(false);
 }
 async function saveResult(e:FormEvent){
  e.preventDefault();setNotice("");
  if(!verified){setNotice("Debes confirmar que tienes un resultado real y verificable. No se permiten resultados ficticios.");return;}
  setBusy(true);
  const {error}=await client.from("draw_results").insert({
   draw_id:drawId,draw_date:date,winning_number:number,winner_display_name:winner.trim(),result_source:source.trim(),verified_at:new Date().toISOString()
  });
  setNotice(error?"No se pudo registrar el resultado. Comprueba los datos y que el sorteo no tenga ya un resultado.":"Resultado verificado publicado.");
  if(!error){await refresh();setDate("");setNumber("");setWinner("");setSource("");setVerified(false);}
  setBusy(false);
 }
 return <section className="container page-space">
  <div className="page-title"><span className="overline">MODERACIÓN · OPORTUNIA</span><h1>Opiniones y resultados</h1><p>Publica experiencias auténticas y documenta únicamente sorteos realmente realizados.</p></div>
  <div className="two-col-layout">
   <section className="panel"><h2>Opiniones de clientes</h2><p className="small muted">Una por cuenta y sorteo. Puedes publicar u ocultar; las opiniones no se crean desde administración.</p>
    <div className="stack">{reviews.length===0?<p>No hay opiniones recibidas.</p>:reviews.map(r=><article key={r.id} className="review-moderation-item">
     <div className="social-review-top"><strong>{r.display_name}</strong><span className="social-stars">{"★".repeat(r.rating)}</span></div>
     <small>{draws.find(d=>d.id===r.draw_id)?.title||r.draw_id} · {r.status}</small><p>{r.comment}</p>
     <div className="admin-review-actions"><button type="button" disabled={busy} className="btn btn-primary btn-small" onClick={()=>void moderate(r.id,"published")}>Publicar</button>
     <button type="button" disabled={busy} className="btn btn-secondary btn-small" onClick={()=>void moderate(r.id,"hidden")}>Ocultar</button></div>
    </article>)}</div>
   </section>
   <section className="panel"><h2>Resultados verificados</h2><p className="small muted">No se publican ganadores de ejemplo. Registra únicamente el resultado respaldado por un sorteo real.</p>
    <form className="form-stack" onSubmit={saveResult}>
     <label>Sorteo<select required value={drawId} onChange={e=>setDrawId(e.target.value)}>{draws.map(d=><option value={d.id} key={d.id}>{d.title}</option>)}</select></label>
     <label>Fecha real del sorteo<input type="date" required max={new Date().toISOString().slice(0,10)} value={date} onChange={e=>setDate(e.target.value)}/></label>
     <label>Número ganador (4 cifras)<input required pattern="[0-9]{4}" inputMode="numeric" maxLength={4} placeholder="0000" value={number} onChange={e=>setNumber(e.target.value)}/></label>
     <label>Nombre público del ganador (con consentimiento)<input required minLength={2} maxLength={80} value={winner} onChange={e=>setWinner(e.target.value)}/></label>
     <label>Fuente o acta de verificación<textarea required minLength={5} maxLength={500} rows={3} value={source} onChange={e=>setSource(e.target.value)} placeholder="Acta, enlace verificable o referencia de la lotería"/></label>
     <label className="terms-accept"><input type="checkbox" checked={verified} onChange={e=>setVerified(e.target.checked)}/> <span>Confirmo que el sorteo se realizó, el resultado es real, la información es verificable y tengo autorización para publicar el nombre.</span></label>
     <button type="submit" disabled={busy||!drawId||!verified} className="btn btn-primary">Publicar resultado verificado</button>
    </form>
    {results.length>0&&<div className="stack top-gap"><h3>Resultados registrados</h3>{results.map(r=><div key={r.id} className="review-moderation-item"><strong>{draws.find(d=>d.id===r.draw_id)?.title||r.draw_id}</strong><p>{r.winning_number} · {r.winner_display_name} · {r.draw_date}</p><small>{r.verified_at?"Verificado":"Pendiente"}</small></div>)}</div>}
   </section>
  </div>
  {notice&&<p className="alert alert-warning top-gap" role="status">{notice}</p>}
 </section>;
}
export default function AdminOpinionesPage(){return <AdminAccessGate><ContentModeration/></AdminAccessGate>;}
