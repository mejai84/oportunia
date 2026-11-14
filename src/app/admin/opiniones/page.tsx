"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {AdminAccessGate} from "@/components/AdminAccessGate";
import {oportuniaClient} from "@/lib/oportuniaSupabase";

type Review={id:string;draw_id:string;display_name:string;rating:number;comment:string;status:string;created_at:string};
type Draw={id:string;title:string};
type Result={id:string;draw_id:string;draw_date:string;winning_number:string;winner_display_name:string;result_source:string;verified_at:string|null};

function ContentModeration(){
 const client=useMemo(()=>oportuniaClient(),[]);
 const [reviews,setReviews]=useState<Review[]>([]);
 const [draws,setDraws]=useState<Draw[]>([]);
 const [results,setResults]=useState<Result[]>([]);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const refresh=useCallback(async()=>{
  const [a,b,c]=await Promise.all([
   client.from("draw_reviews").select("id,draw_id,display_name,rating,comment,status,created_at").order("created_at",{ascending:false}).limit(100),
   client.from("draw_catalog").select("id,title").order("display_order"),
   client.from("draw_results").select("id,draw_id,draw_date,winning_number,winner_display_name,result_source,verified_at").order("draw_date",{ascending:false}),
  ]);
  if(a.error||b.error||c.error)throw Error("No se pudieron consultar las opiniones o resultados. Verifica permisos.");
  setReviews((a.data||[]) as Review[]);
  setDraws((b.data||[]) as Draw[]);
  setResults((c.data||[]) as Result[]);
 },[client]);
 useEffect(()=>{
  let live=true;
  void refresh().catch(e=>{if(live)setError(e instanceof Error?e.message:"Error de lectura");})
   .finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;};
 },[refresh]);
 async function hide(id:string){
  if(!window.confirm("¿Ocultar esta opinión del sitio público?"))return;
  setBusy(true);setError("");setNotice("");
  try{
   const {error:updateError}=await client.from("draw_reviews")
    .update({status:"hidden",updated_at:new Date().toISOString()}).eq("id",id);
   if(updateError)throw updateError;
   await refresh();setNotice("Opinión retirada de la vista pública.");
  }catch(e){setError(e instanceof Error?e.message:"No se pudo ocultar la opinión.");}
  finally{setBusy(false);}
 }
 return <section className="container page-space">
  <div className="admin-back-row"><Link href="/admin" className="btn btn-primary">‹ Volver a administración</Link></div>
  <div className="page-title"><span className="overline">REVISIÓN DE CONFIANZA</span><h1>Opiniones y resultados</h1>
   <p>La publicación comercial permanece cerrada hasta contar con participaciones comprobables y una fuente de resultados verificable.</p></div>
  {error&&<div className="alert alert-error" role="alert">{error}</div>}
  {notice&&<div className="alert alert-success" role="status">{notice}</div>}
  {loading&&<p role="status">Consultando registros…</p>}
  <div className="two-col-layout">
   <section className="panel">
    <h2>Opiniones existentes</h2>
    <p className="muted">La recepción y publicación de nuevas opiniones está suspendida hasta poder comprobar una participación real. No hay comentarios de ejemplo.</p>
    {reviews.length===0?<p>No hay opiniones registradas.</p>:
     <div className="stack">{reviews.map(r=><article key={r.id} className="review-moderation-item">
      <strong>{r.display_name} · {r.rating}/5</strong>
      <small>{draws.find(d=>d.id===r.draw_id)?.title||r.draw_id} · {r.status}</small>
      <p>{r.comment}</p>
      {r.status==="published"&&<button disabled={busy} className="btn btn-secondary btn-small" onClick={()=>void hide(r.id)}>Ocultar opinión</button>}
     </article>)}</div>}
   </section>
   <section className="panel">
    <h2>Historial de resultados</h2>
    <p className="alert alert-warning">La publicación de ganadores está bloqueada: la confirmación manual no constituye verificación independiente de un resultado ni acredita las autorizaciones correspondientes.</p>
    {results.length===0?<p>No hay resultados registrados.</p>:
     <div className="stack">{results.map(r=><article key={r.id} className="review-moderation-item">
      <strong>{draws.find(d=>d.id===r.draw_id)?.title||r.draw_id}</strong>
      <p>{r.winning_number} · {r.winner_display_name} · {r.draw_date}</p>
      <small>{r.verified_at?"Marcado como verificado anteriormente":"Borrador no publicado"}</small>
     </article>)}</div>}
   </section>
  </div>
 </section>;
}
export default function AdminOpinionesPage(){return <AdminAccessGate requiredPermission="reviews.write"><ContentModeration/></AdminAccessGate>;}
