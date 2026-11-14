"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";
import { oportuniaClient } from "@/lib/oportuniaSupabase";

type Review={id:string;draw_id:string;user_id:string;rating:number;comment:string;display_name:string;created_at:string;draw_catalog:{title:string;prize_image_url:string|null}|null};
type Result={id:string;draw_id:string;draw_date:string;winning_number:string;winner_display_name:string;result_source:string;draw_catalog:{title:string;prize_image_url:string|null}|null};

type SampleReview={id:string;display_name:string;rating:number;comment:string};
/** Fictional copy for visual layout only. Never submit as real reviews or imply a sale. */
const SAMPLE_REVIEWS:SampleReview[]=[
 {id:"ejemplo-01",display_name:"Laura M.",rating:5,comment:"Entré desde el celular y encontré la información sin tener que buscar mucho. Los pasos se entienden bien."},
 {id:"ejemplo-02",display_name:"Andrés R.",rating:4,comment:"Los premios se ven bonitos y la página carga bien. Me gustaría que hubiera más filtros para explorar."},
 {id:"ejemplo-03",display_name:"Diana P.",rating:5,comment:"Me gusta que expliquen cómo se eligen los números. Así uno puede leer las condiciones con calma."},
 {id:"ejemplo-04",display_name:"Camilo G.",rating:4,comment:"El diseño se ve organizado. Sería útil poder guardar mis premios favoritos para revisarlos después."},
 {id:"ejemplo-05",display_name:"Natalia S.",rating:5,comment:"Las secciones son claras y los iconos ayudan bastante, especialmente cuando lo abro desde el teléfono."},
 {id:"ejemplo-06",display_name:"Felipe C.",rating:4,comment:"Vi las oportunidades y la calculadora. Está bien explicada, aunque agregaría un ejemplo más corto."},
 {id:"ejemplo-07",display_name:"María J.",rating:5,comment:"Me gustó encontrar las reglas y los detalles de cada edición sin salir de la página principal."},
 {id:"ejemplo-08",display_name:"Santiago V.",rating:4,comment:"Se nota el cuidado en los colores y en las imágenes. La sección de preguntas me resolvió varias dudas."},
 {id:"ejemplo-09",display_name:"Paola T.",rating:5,comment:"El paso a paso de cómo participar me pareció fácil de seguir. Todo está bastante bien distribuido."},
 {id:"ejemplo-10",display_name:"Julián F.",rating:4,comment:"Desde mi celular pude recorrer las tarjetas sin problemas. Me gustaría ver un buscador en el catálogo."}
];

function uniqueRandom(reviews:Review[],limit:number){
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
 const [rotation,setRotation]=useState(0);
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
  }).catch(()=>{if(live){setReviewError(true);setResultError(true);setReady(true);}});
  return()=>{live=false;};
 },[client]);

 const featured=useMemo(()=>uniqueRandom(reviews,10),[reviews,rotation]);
 return <>
  <section className="container social-proof-section" id="opiniones">
   <div className="social-proof-heading"><div><span className="f-kicker">TU OPINIÓN IMPORTA</span>
    <h2>⭐ Opiniones de nuestra comunidad</h2>
    <p>Conoce las valoraciones que comparten los usuarios de Oportunia.</p></div>
   {reviews.length>10&&<button type="button" className="btn btn-secondary" onClick={()=>setRotation(n=>n+1)}>Ver otras opiniones ↻</button>}</div>
   {!ready&&<p role="status">Cargando opiniones…</p>}
   {reviewError&&<p role="status">No fue posible consultar las opiniones en este momento.</p>}
   {ready&&!reviewError&&(featured.length===0?
    <div className="o-review-examples">
      <p className="o-review-examples-heading"><strong>Así se verían las opiniones en Oportunia.</strong> Estos comentarios son ejemplos redactados para mostrar el diseño; no son reseñas enviadas por clientes.</p>
      <div className="social-review-grid" aria-label="Ejemplos ficticios de comentarios">
        {SAMPLE_REVIEWS.map(r=><article className="social-review-card is-example" key={r.id}>
          <div className="social-review-top"><span aria-label={r.rating+" de 5 estrellas"} className="social-stars">{"★".repeat(r.rating)}<span>{"☆".repeat(5-r.rating)}</span></span>
           <span className="o-review-example-tag">Ejemplo ficticio</span></div>
          <p className="social-review-text">“{r.comment}”</p>
          <div className="social-review-footer"><div className="social-avatar">{r.display_name.charAt(0)}</div>
           <div><strong>{r.display_name}</strong><small>Perfil de ejemplo · sin compra verificada</small></div>
          </div>
        </article>)}
      </div>
    </div>:
    <div className="social-review-grid">{featured.map(r=><article className="social-review-card" key={r.id}>
     <div className="social-review-top"><span aria-label={r.rating+" de 5 estrellas"} className="social-stars">{"★".repeat(r.rating)}<span>{"☆".repeat(5-r.rating)}</span></span>
      <span className="social-verified">Opinión publicada</span></div>
     <p className="social-review-text">“{r.comment}”</p>
     <div className="social-review-footer"><div className="social-avatar">{r.display_name.trim().charAt(0).toUpperCase()}</div>
      <div><strong>{r.display_name}</strong><small>{r.draw_catalog?.title||"Comunidad Oportunia"}</small></div>
      {r.draw_catalog?.prize_image_url&&<img src={r.draw_catalog.prize_image_url} alt="" className="social-draw-thumb"/>}
     </div>
    </article>)}</div>)}
  </section>
  <section className="container social-proof-section social-results" id="resultados">
   <div className="social-proof-heading"><div><span className="f-kicker">HISTORIAL TRANSPARENTE</span>
    <h2>Resultados y ganadores</h2>
    <p>Consulta resultados con fecha, número ganador y fuente de verificación.</p></div></div>
   {resultError&&<p role="status">No fue posible consultar el historial de resultados.</p>}
   {ready&&!resultError&&results.length===0&&<div className="social-empty social-empty-result">
    <span className="social-empty-icon">✦</span><h3>Próximamente, nuestros primeros resultados.</h3>
    <p>Aquí encontrarás el historial de cada edición una vez publicado su resultado.</p>
   </div>}
   {ready&&!resultError&&results.length>0&&<div className="social-result-grid">{results.map(r=><article className="social-result-card" key={r.id}>
    {r.draw_catalog?.prize_image_url&&<img src={r.draw_catalog.prize_image_url} alt={r.draw_catalog.title}/>}
    <div><span className="social-verified">Resultado verificado</span><h3>{r.draw_catalog?.title||"Edición Oportunia"}</h3>
     <p>Número ganador: <strong>{r.winning_number}</strong></p><p>Ganador: <strong>{r.winner_display_name}</strong></p>
     <small>{new Date(r.draw_date+"T12:00:00").toLocaleDateString("es-CO")} · Fuente: {r.result_source}</small>
    </div>
   </article>)}</div>}
  </section>
 </>;
}
