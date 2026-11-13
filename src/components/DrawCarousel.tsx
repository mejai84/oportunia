"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { usePublicDraws } from "@/lib/usePublicDraws";

export function DrawCarousel() {
  const { draws, loading, error } = usePublicDraws();
  const [index, setIndex] = useState(0);
  const current = Math.min(index, Math.max(0, draws.length - 1));
  const draw = draws[current];
  return <section id="sorteos" className="container draw-carousel-section" aria-label="Catálogo de sorteos">
    <div className="draw-carousel-header"><div><span className="f-kicker">EXPLORA OPORTUNIA</span>
      <h2>Premios que ilusionan.</h2>
      <p>Descubre los próximos sorteos y conoce cómo funcionará cada edición.</p></div>
      {draws.length > 1 && <div className="draw-carousel-controls">
        <button type="button" aria-label="Sorteo anterior" onClick={() => setIndex((current + draws.length - 1) % draws.length)}>←</button>
        <button type="button" aria-label="Sorteo siguiente" onClick={() => setIndex((current + 1) % draws.length)}>→</button>
      </div>}
    </div>
    {loading && <p role="status">Consultando próximos sorteos…</p>}
    {error && <div className="alert alert-warning" role="status">{error} Intenta actualizar la página.</div>}
    {!loading && !error && !draw && <div className="draw-carousel-empty"><h3>Pronto habrá novedades.</h3><p>Estamos preparando nuevas ediciones.</p></div>}
    {draw && <div className="draw-carousel-card" key={draw.id}>
      <div className="draw-carousel-copy">
        <span className="draw-carousel-edition">EDICIÓN {String(current + 1).padStart(2, "0")} · {draw.status === "closed" ? "CERRADA" : "EN PREPARACIÓN"}</span>
        <h3>{draw.prize}</h3><p className="draw-carousel-title">{draw.title}</p>
        <p className="draw-carousel-description">{draw.description}</p>
        <p className="draw-carousel-disclaimer"><strong>Próximamente:</strong> aún no se aceptan compras, reservas ni pagos. Publicaremos fechas y condiciones cuando estén definidas.</p>
        <a href="#registro" className="f-button f-button-primary">Conocer novedades <span aria-hidden="true">↗</span></a>
      </div>
      <div className="draw-carousel-art" aria-hidden="true">
        {draw.prize_image_url ? <img className="draw-prize-upload" src={draw.prize_image_url} alt="" /> : <span className="draw-art-gift">✦</span>}
        <div className="draw-art-caption">OPORTUNIA <strong>PRÓXIMA EDICIÓN</strong></div>
      </div>
    </div>}
    {draws.length > 1 && <div className="draw-carousel-dots" role="group" aria-label="Seleccionar sorteo">
      {draws.map((d,i)=><button key={d.id} type="button" aria-label={"Ver "+d.title}
        aria-current={i===current?"true":undefined} className={i===current?"active":""} onClick={()=>setIndex(i)}/>)}
    </div>}
  </section>;
}
