"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";
import { oportuniaClient } from "@/lib/oportuniaSupabase";
type Review={id:string;draw_id:string;user_id:string;rating:number;comment:string;display_name:string;created_at:string;draw_catalog:{title:string;prize_image_url:string|null}|null};
type Result={id:string;draw_id:string;draw_date:string;winning_number:string;winner_display_name:string;result_source:string;draw_catalog:{title:string;prize_image_url:string|null}|null};
function uniqueRandom(reviews:Review[],limit:number) {
  const shuffled=[...reviews].sort(()=>Math.random()-.5);
  const seen=new Set<string>();
  return shuffled.filter(r=>{if(seen.has(r.user_id))return false;seen.add(r.user_id);return true;}).slice(0,limit);
}
export function SocialProofSections(){
 const client=useMemo(()=>oportuniaClient(),[]);
 const [reviews,setReviews]=useState<Review[]>([]);
 const [results,setResults]=useState<Result[]>([]);
 const [ready,setReady]=useState(false);
 const [reviewError,setReviewError]=useState(false);
 const [resultError,setResultError]=useState(false);
 useEffect(()=>{
  let live=true;
  void Promise.all([
   client.from("draw_reviews").select("id,draw_id,user_id,rating,comment,display_name,created_at,draw_catalog(title,prize_image_url)").eq("status","published").order("created_at",{ascending:false}).limit(100),
   client.from("draw_results").select("id,draw_id,draw_date,winning_number,winner_display_name,result_source,draw_catalog(title,prize_image_url)").not("verified_at","is",null).order("draw_date",{ascending:false}).limit(24)
  ]).then(([a,b])=>{
   if(!live)return;
   if(a.error)setReviewError(true);else setReviews((a.data||[]) as unknown as Review[]);
   if(b.error)setResultError(true);else setResults((b.data||[]) as unknown as Result[]);
   setReady(true);
  });
  return()=>{live=false;};
 },[client]);
 const [rotation,setRotation]=useState(0);
 const featured=useMemo(()=>uniqueRandom(reviews,6),[reviews,rotation]);
 return <>
  <section className="container social-proof-section" id="opiniones">
   <div className="social-proof-heading"><div><span className="f-kicker">TU OPINIÓN IMPORTA</span><h2>⭐ Lo que dice nuestra comunidad</h2><p>Valoraciones reales, publicadas después de revisión. Cada persona aparece una sola vez en cada selección.</p></div>
   {reviews.length>6&&<button type="button" className="btn btn-secondary" onClick={()=>setRotation(n=>n+1)}>Ver otras opiniones ↻</button>}</div>
   {!ready&&<p role="status">Cargando opiniones…</p>}
   {reviewError&&<p role="status">No fue posible consultar las opiniones.</p>}
   {ready&&!reviewError&&featured.length===0&&<div className="social-empty"><span className="social-empty-icon">☆ ☆ ☆ ☆ ☆</span><h3>Las primeras opiniones están por llegar.</h3><p>Cuando los clientes participen y califiquen los sorteos, sus comentarios verificados aparecerán aquí.</p><a className="btn btn-secondary" href="/acceso">Ingresar a mi cuenta</a></div>}
   {featured.length>0&&<div className="social-review-grid">{featured.map(r=><article className="social-review-card" key={r.id}>
    <div className="social-review-top"><span aria-label={r.rating+" de 5 estrellas"} className="social-stars">{"★".repeat(r.rating)}<span>{"☆".repeat(5-r.rating)}</span></span><span className="social-verified">Opinión publicada</span></div>
    <p className="social-review-text">“{r.comment}”</p>
    <div className="social-review-footer"><div className="social-avatar">{r.display_name.trim().charAt(0).toUpperCase()}</div>
    <div><strong>{r.display_name}</strong><small>{r.draw_catalog?.title||"Sorteo Oportunia"}</small></div>
    {r.draw_catalog?.prize_image_url&&<img src={r.draw_catalog.prize_image_url} alt="" className="social-draw-thumb"/>}</div>
   </article>)}</div>}
  </section>
  <section className="container social-proof-section social-results" id="resultados">
   <div className="social-proof-heading"><div><span className="f-kicker">HISTORIAL TRANSPARENTE</span><h2>Sorteos realizados y ganadores</h2><p>Publicaremos únicamente resultados comprobados, con fecha, número ganador y fuente de verificación.</p></div></div>
   {resultError&&<p role="status">No fue posible consultar los resultados.</p>}
   {ready&&!resultError&&results.length===0&&<div className="social-empty social-empty-result">
    <span className="social-empty-icon">✦</span><h3>Estamos preparando nuestra primera edición.</h3>
    <p>Aún no se han registrado sorteos realizados ni ganadores verificados en Oportunia.</p>
    <div className="social-placeholder"><span>IMAGEN ILUSTRATIVA</span><img src="/raffles/iphone18-product.svg" alt="Ilustración de teléfono del próximo sorteo"/><strong>Próximo sorteo: iPhone 18</strong><small>En preparación · Sin ganador anunciado</small></div>
   </div>}
   {results.length>0&&<div className="social-result-grid">{results.map(r=><article className="social-result-card" key={r.id}>
    {r.draw_catalog?.prize_image_url&&<img src={r.draw_catalog.prize_image_url} alt={"Premio de "+r.draw_catalog.title}/>}
    <div><span className="social-verified">Resultado verificado</span><h3>{r.draw_catalog?.title||"Sorteo Oportunia"}</h3>
    <p>Número ganador: <strong>{r.winning_number}</strong></p><p>Ganador: <strong>{r.winner_display_name}</strong></p>
    <small>{new Date(r.draw_date+"T12:00:00").toLocaleDateString("es-CO")} · Fuente: {r.result_source}</small></div>
   </article>)}</div>}
  </section>
 </>;
}
