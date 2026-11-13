"use client";
import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { drawCatalog, salesProgressPercent } from "@/lib/domain";

export function DrawCarousel() {
  const { state, hydrated, chooseDraw } = useApp();
  const [index, setIndex] = useState(0);
  const draws = drawCatalog(state).filter((draw) => draw.enabled);
  if (!hydrated) return <section id="sorteos" className="container draw-carousel-section"><p className="muted">Cargando sorteos de prueba…</p></section>;
  if (!draws.length) return <section id="sorteos" className="container draw-carousel-section">
    <div className="draw-carousel-empty"><span className="f-kicker">PRÓXIMAS EDICIONES</span><h2>Pronto conocerás nuevos sorteos.</h2>
      <p>En este momento no hay sorteos habilitados en esta demostración.</p></div>
  </section>;
  const currentIndex = Math.min(index, draws.length - 1);
  const draw = draws[currentIndex];
  const progress = salesProgressPercent(state, draw.id);
  const percent = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(progress);
  return <section id="sorteos" className="container draw-carousel-section" aria-label="Sorteos disponibles en demostración">
    <div className="draw-carousel-header"><div><span className="f-kicker">EXPLORA LAS EDICIONES</span>
      <h2>{draws.length === 1 ? "Un sorteo para descubrir." : "Un premio. Muchas posibilidades."}</h2>
      <p>{draws.length === 1 ? "Conoce la edición disponible." : "Desliza entre los sorteos habilitados y elige el que te interese."}</p></div>
      {draws.length > 1 && <div className="draw-carousel-controls">
        <button type="button" aria-label="Sorteo anterior" onClick={() => setIndex((currentIndex + draws.length - 1) % draws.length)}>←</button>
        <button type="button" aria-label="Sorteo siguiente" onClick={() => setIndex((currentIndex + 1) % draws.length)}>→</button>
      </div>}
    </div>
    <div className="draw-carousel-card" key={draw.id}>
      <div className="draw-carousel-copy">
        <span className="draw-carousel-edition">EDICIÓN {String(currentIndex + 1).padStart(2, "0")} · DEMO</span>
        <h3>{draw.prize}</h3>
        <p className="draw-carousel-title">{draw.title}</p>
        <p className="draw-carousel-description">{draw.description || "Escoge tus diez números o recíbelos automáticamente."}</p>
        <div className="draw-carousel-progress-label"><span>Avance de compras (simulación local)</span><strong>{percent}%</strong></div>
        <div className="draw-carousel-progress"><div style={{ width: progress + "%" }} /></div>
        <Link href="/numeros" onClick={() => chooseDraw(draw.id)} className="f-button f-button-primary">Conocer este sorteo <span aria-hidden="true">↗</span></Link>
      </div>
      <div className="draw-carousel-art" aria-hidden="true">
        <div className="draw-art-halo" />
        <div className="draw-art-phone"><div className="draw-art-camera"><i/><i/><i/></div><span>✦</span></div>
        <div className="draw-art-caption">OPORTUNIA <strong>EDICIÓN {String(currentIndex + 1).padStart(2, "0")}</strong></div>
      </div>
    </div>
    {draws.length > 1 && <div className="draw-carousel-dots" role="group" aria-label="Seleccionar sorteo">
      {draws.map((item, i) => <button key={item.id} type="button" aria-label={"Ver " + item.title}
        aria-current={i === currentIndex ? "true" : undefined}
        className={i === currentIndex ? "active" : ""} onClick={() => setIndex(i)} />)}
    </div>}
    <p className="draw-carousel-disclaimer">Porcentajes de prueba calculados únicamente con datos de este navegador. No representan ventas reales ni sorteos autorizados.</p>
  </section>;
}
