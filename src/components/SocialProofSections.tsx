"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";
import { oportuniaClient } from "@/lib/oportuniaSupabase";
type Review={id:string;draw_id:string;user_id:string;rating:number;comment:string;display_name:string;created_at:string;draw_catalog:{title:string;prize_image_url:string|null}|null};
type Result={id:string;draw_id:string;draw_date:string;winning_number:string;winner_display_name:string;result_source:string;draw_catalog:{title:string;prize_image_url:string|null}|null};
const EXAMPLE_REVIEWS = [
  {
    "id": "ejemplo-1",
    "user_id": "ejemplo-usuario-1",
    "display_name": "Ejemplo 01",
    "rating": 5,
    "comment": "Me encanta la idea de poder escoger mis números desde el celular, sin complicaciones.",
    "draw_id": "principal",
    "created_at": "",
    "draw_catalog": null
  },
  {
    "id": "ejemplo-2",
    "user_id": "ejemplo-usuario-2",
    "display_name": "Ejemplo 02",
    "rating": 5,
    "comment": "El diseño es muy claro; así es fácil entender cómo funcionaría cada sorteo.",
    "draw_id": "principal",
    "created_at": "",
    "draw_catalog": null
  },
  {
    "id": "ejemplo-3",
    "user_id": "ejemplo-usuario-3",
    "display_name": "Ejemplo 03",
    "rating": 5,
    "comment": "Ver las reglas antes de participar me parece un detalle muy importante.",
    "draw_id": "principal",
    "created_at": "",
    "draw_catalog": null
  },
  {
    "id": "ejemplo-4",
    "user_id": "ejemplo-usuario-4",
    "display_name": "Ejemplo 04",
    "rating": 5,
    "comment": "Poder consultar todos mis números desde mi cuenta sería bastante cómodo.",
    "draw_id": "principal",
    "created_at": "",
    "draw_catalog": null
  },
  {
    "id": "ejemplo-5",
    "user_id": "ejemplo-usuario-5",
    "display_name": "Ejemplo 05",
    "rating": 5,
    "comment": "La opción de elegir números o recibirlos automáticamente me parece genial.",
    "draw_id": "principal",
    "created_at": "",
    "draw_catalog": null
  },
  {
    "id": "ejemplo-6",
    "user_id": "ejemplo-usuario-6",
    "display_name": "Ejemplo 06",
    "rating": 5,
    "comment": "Me gustan los colores y lo sencillo que resulta explorar los premios.",
    "draw_id": "principal",
    "created_at": "",
    "draw_catalog": null
  },
  {
    "id": "ejemplo-7",
    "user_id": "ejemplo-usuario-7",
    "display_name": "Ejemplo 07",
    "rating": 4,
    "comment": "Que se explique cuándo queda habilitada una oportunidad me da tranquilidad.",
    "draw_id": "principal",
    "created_at": "",
    "draw_catalog": null
  },
  {
    "id": "ejemplo-8",
    "user_id": "ejemplo-usuario-8",
    "display_name": "Ejemplo 08",
    "rating": 5,
    "comment": "El esquema de abonos se entiende muy bien con el simulador.",
    "draw_id": "principal",
    "created_at": "",
    "draw_catalog": null
  },
  {
    "id": "ejemplo-9",
    "user_id": "ejemplo-usuario-9",
    "display_name": "Ejemplo 09",
    "rating": 4,
    "comment": "Las imágenes de los premios hacen que navegar por los sorteos sea más agradable.",
    "draw_id": "principal",
    "created_at": "",
    "draw_catalog": null
  },
  {
    "id": "ejemplo-10",
    "user_id": "ejemplo-usuario-10",
    "display_name": "Ejemplo 10",
    "rating": 5,
    "comment": "Me parece excelente que se preparen resultados con fuentes verificables.",
    "draw_id": "principal",
    "created_at": "",
    "draw_catalog": null
  }
] satisfies Review[];
/** Fisher–Yates shuffle; one review per user in each displayed selection. */
function uniqueRandom(reviews:Review[],limit:number) {
 const shuffled=[...reviews];
 for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
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
 const isExample=ready&&!reviewError&&reviews.length===0;
 const featured=useMemo(()=>reviews.length?uniqueRandom(reviews,10):EXAMPLE_REVIEWS,[reviews,rotation]);
 return <>
  <section className="container social-proof-section" id="opiniones">
   <div className="social-proof-heading"><div><span className="f-kicker">TU OPINIÓN IMPORTA</span>
    <h2>⭐ {isExample?"Así se verán las opiniones":"Lo que dice nuestra comunidad"}</h2>
    <p>{isExample?"Diez textos ilustrativos para mostrar el diseño. No son reseñas de clientes ni experiencias verificadas.":"Valoraciones reales publicadas tras revisión, sin repetir al mismo cliente en cada selección."}</p></div>
   {reviews.length>10&&<button type="button" className="btn btn-secondary" onClick={()=>setRotation(n=>n+1)}>Ver otras opiniones ↻</button>}</div>
   {!ready&&<p role="status">Cargando opiniones…</p>}
   {reviewError&&<p role="status">No fue posible consultar las opiniones reales. No se muestran testimonios no verificados como auténticos.</p>}
   {isExample&&<div className="social-example-banner" role="note"><strong>VISTA ILUSTRATIVA</strong> · Las siguientes 10 reseñas son ejemplos de diseño, no comentarios publicados por clientes.</div>}
   {ready&&!reviewError&&<div className="social-review-grid">{featured.map(r=><article className={"social-review-card"+(isExample?" is-example":"")} key={r.id}>
    <div className="social-review-top"><span aria-label={r.rating+" de 5 estrellas"} className="social-stars">{"★".repeat(r.rating)}<span>{"☆".repeat(5-r.rating)}</span></span>
     <span className={isExample?"social-example-label":"social-verified"}>{isExample?"EJEMPLO":"Opinión publicada"}</span></div>
    <p className="social-review-text">“{r.comment}”</p>
    <div className="social-review-footer"><div className="social-avatar">{isExample?"✦":r.display_name.trim().charAt(0).toUpperCase()}</div>
    <div><strong>{r.display_name}</strong><small>{isExample?"Texto ilustrativo · Sin cliente real":r.draw_catalog?.title||"Sorteo Oportunia"}</small></div>
    {!isExample&&r.draw_catalog?.prize_image_url&&<img src={r.draw_catalog.prize_image_url} alt="" className="social-draw-thumb"/>}</div>
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
