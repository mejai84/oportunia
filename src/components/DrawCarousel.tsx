"use client";
/* eslint-disable @next/next/no-img-element */
import { useRef } from "react";
import { usePublicDraws, type PublicDraw } from "@/lib/usePublicDraws";
import { HomeIcon } from "@/components/HomeMarketingSections";

type DrawCard = PublicDraw & { illustrative?: boolean };
/* Ideas de premios identificadas como tales; no se presentan como sorteos confirmados. */
const EXAMPLE_DRAWS: DrawCard[] = [
  {id:"concepto-consola",title:"Concepto: Consola",prize:"Consola de videojuegos",description:"Una propuesta de premio para quienes disfrutan jugar.",status:"preview",display_order:2,hero_image_url:null,prize_image_url:"/raffles/concept-console.svg",illustrative:true},
  {id:"concepto-televisor",title:"Concepto: Smart TV",prize:"Smart TV 55″",description:"Una idea para futuras ediciones de entretenimiento en casa.",status:"preview",display_order:3,hero_image_url:null,prize_image_url:"/raffles/concept-tv.svg",illustrative:true},
  {id:"concepto-moto",title:"Concepto: Moto",prize:"Motocicleta urbana",description:"Concepto de una futura edición sobre dos ruedas.",status:"preview",display_order:4,hero_image_url:null,prize_image_url:"/raffles/concept-moto.svg",illustrative:true},
  {id:"concepto-portatil",title:"Concepto: Portátil",prize:"Computador portátil",description:"Una idea de premio para estudiar, crear o trabajar.",status:"preview",display_order:5,hero_image_url:null,prize_image_url:"/raffles/concept-laptop.svg",illustrative:true},
  {id:"concepto-tablet",title:"Concepto: Tablet",prize:"Tablet de última generación",description:"Otra opción ilustrativa para una próxima edición.",status:"preview",display_order:6,hero_image_url:null,prize_image_url:"/raffles/concept-tablet.svg",illustrative:true}
];

export function DrawCarousel() {
  const { draws, loading, error } = usePublicDraws();
  const trackRef = useRef<HTMLDivElement>(null);
  // Actual catalog items take priority; visual concepts fill the five slots only
  // while fewer than five public editions exist.
  const cards: DrawCard[] = [...draws, ...EXAMPLE_DRAWS.slice(0,Math.max(0,5-draws.length))];
  function move(direction: number) {
    const track=trackRef.current;
    if(!track)return;
    const first=track.querySelector<HTMLElement>(".draw-mini-card");
    const width=first?.getBoundingClientRect().width||240;
    const gap=Number.parseFloat(getComputedStyle(track).columnGap)||16;
    track.scrollBy({left:direction*(width+gap),behavior:"smooth"});
  }
  return <section id="sorteos" className="container draw-carousel-section" aria-label="Catálogo de sorteos y posibles premios">
    <div className="draw-carousel-header">
      <div><span className="f-kicker"><HomeIcon name="sparkles" size={17}/> EXPLORA OPORTUNIA</span>
      <h2>Premios que <span className="f-highlight">emocionan.</span></h2>
      <p>Descubre los premios anunciados y las ideas que estamos preparando para futuras ediciones.</p></div>
      <div className="draw-carousel-controls draw-row-controls" aria-label="Desplazar premios">
        <button type="button" aria-label="Ver premios anteriores" onClick={()=>move(-1)}>←</button>
        <button type="button" aria-label="Ver premios siguientes" onClick={()=>move(1)}>→</button>
      </div>
    </div>
    {loading&&<p role="status">Consultando el catálogo…</p>}
    {error&&<div className="alert alert-warning" role="status">{error}</div>}
    <div className="draw-five-track" ref={trackRef} aria-label="Premios y propuestas de sorteo">
      {cards.map((draw,i)=><article className={"draw-mini-card"+(draw.illustrative?" is-concept":"")} key={draw.id}>
        <div className="draw-mini-art">
          <span className={"draw-mini-badge"+(draw.illustrative?" is-concept":"")}>
            {draw.illustrative?"IDEA DE PREMIO":draw.status==="closed"?"EDICIÓN CERRADA":"PRÓXIMAMENTE"}
          </span>
          <img src={draw.prize_image_url||"/raffles/iphone18-product.svg"} alt={"Ilustración del premio "+draw.prize} loading={i>1?"lazy":"eager"}/>
        </div>
        <div className="draw-mini-content">
          <span className="draw-mini-kicker">OPORTUNIA · {draw.illustrative?"POSIBLE PREMIO":"PREMIO DESTACADO"}</span>
          <h3>{draw.prize}</h3>
          <p>{draw.description}</p>
          {!draw.illustrative&&<div className="draw-mini-progress">
            <div className="draw-mini-progress-head">
              <span>Estado de la edición</span>
              <strong>{draw.status==="closed"?"Cerrada":"Próximamente"}</strong>
            </div>
          </div>}
          <div className="draw-mini-foot">
            <span>{draw.illustrative?"Idea para una próxima edición":"Conoce sus condiciones"}</span>
            <a href="#registro" aria-label={"Conocer novedades de "+draw.prize}>Conocer más <HomeIcon name="arrow-right" size={18}/></a>
          </div>
        </div>
      </article>)}
    </div>
  </section>;
}
