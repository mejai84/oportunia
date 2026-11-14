"use client";
/* eslint-disable @next/next/no-img-element */
import {useCallback,useEffect,useRef,useState} from "react";
import {usePublicDraws} from "@/lib/usePublicDraws";
import {HomeIcon} from "@/components/HomeMarketingSections";
import {selectPrizeImage} from "@/lib/prizePhotography";
import type {HomeContentData,HomeCard} from "@/lib/homeContent";

type Card={id:string;prize:string;description:string;image_url:string|null;order:number;idea:boolean;closed:boolean};
type Props={content:HomeContentData;ideas:HomeCard[]};

export function DrawCarousel({content,ideas}:Props){
 const {draws,loading,error}=usePublicDraws();
 const trackRef=useRef<HTMLDivElement>(null);
 const activeRef=useRef(0);
 const pausedRef=useRef(false);
 const [active,setActive]=useState(0);
 const cards:Card[]=[
  ...draws.map(d=>({id:d.id,prize:d.prize,description:d.description,image_url:d.prize_image_url,order:d.display_order,idea:false,closed:d.status==="closed"})),
  ...ideas.filter(d=>d.enabled).map(d=>({id:d.id,prize:d.title,description:d.description,image_url:d.image_url,order:d.display_order,idea:true,closed:false}))
 ].sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
 const goTo=useCallback((position:number,behavior:ScrollBehavior="smooth")=>{
  const track=trackRef.current;
  if(!track||!track.children.length)return;
  const target=Math.max(0,Math.min(track.children.length-1,position));
  const first=track.children[0] as HTMLElement;
  const item=track.children[target] as HTMLElement;
  track.scrollTo({left:item.offsetLeft-first.offsetLeft,behavior});
  activeRef.current=target;setActive(target);
 },[]);
 useEffect(()=>{
  if(cards.length<=1)return;
  const timer=window.setInterval(()=>{
   if(pausedRef.current||document.hidden||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
   const next=(activeRef.current+1)%cards.length;
   goTo(next,next===0?"auto":"smooth");
  },4500);
  return()=>window.clearInterval(timer);
 },[cards.length,goTo]);
 useEffect(()=>{
  if(activeRef.current>=cards.length&&cards.length>0)goTo(0,"auto");
 },[cards.length,goTo]);
 const move=(direction:number)=>{
  if(cards.length<=1)return;
  const next=(activeRef.current+direction+cards.length)%cards.length;
  goTo(next,(direction>0&&next===0)||(direction<0&&next===cards.length-1)?"auto":"smooth");
 };
 const syncScroll=()=>{
  const track=trackRef.current;if(!track||!track.children.length)return;
  const first=track.children[0] as HTMLElement;
  let nearest=0,distance=Infinity;
  for(let i=0;i<track.children.length;i++){
   const child=track.children[i] as HTMLElement;
   const delta=Math.abs(child.offsetLeft-first.offsetLeft-track.scrollLeft);
   if(delta<distance){distance=delta;nearest=i;}
  }
  activeRef.current=nearest;setActive(nearest);
 };
 return <section id="sorteos" className="container draw-carousel-section" aria-label="Oportunidades y premios">
  <div className="draw-carousel-header">
   <div><span className="f-kicker"><HomeIcon name="sparkles" size={17}/> {content.carouselKicker}</span>
    <h2>{content.carouselTitle}</h2>
    <p>{content.carouselDescription}</p></div>
   <div className="draw-carousel-controls draw-row-controls" aria-label="Navegación de premios">
    <button type="button" aria-label="Premio anterior" onClick={()=>move(-1)} disabled={cards.length<=1}>←</button>
    <button type="button" aria-label="Premio siguiente" onClick={()=>move(1)} disabled={cards.length<=1}>→</button>
   </div>
  </div>
  {loading&&<p role="status">Cargando premios…</p>}
  {error&&<div className="alert alert-warning" role="status">{error}</div>}
  <div className="draw-five-track" ref={trackRef} onScroll={syncScroll}
   onMouseEnter={()=>{pausedRef.current=true;}} onMouseLeave={()=>{pausedRef.current=false;}}
   onPointerDown={()=>{pausedRef.current=true;}} onPointerUp={()=>{pausedRef.current=false;}}
   onPointerCancel={()=>{pausedRef.current=false;}}
   onFocusCapture={()=>{pausedRef.current=true;}} onBlurCapture={()=>{pausedRef.current=false;}}
   aria-label="Carrusel de premios; avance automático cada cuatro segundos y medio">
   {cards.map((draw,i)=>{
    const photo=selectPrizeImage(draw.id,draw.image_url,"/raffles/iphone18-product.svg");
    return <article className={"draw-mini-card"+(draw.idea?" is-concept":"")} key={draw.id}>
     <div className="draw-mini-art">
      {draw.closed&&<span className="draw-mini-badge">EDICIÓN CERRADA</span>}
      <img className={photo.isStockPhoto?"o-draw-photo":""} src={photo.src} alt={photo.description}
       loading={i>1?"lazy":"eager"}
       onError={event=>{event.currentTarget.onerror=null;event.currentTarget.src="/raffles/iphone18-product.svg";event.currentTarget.classList.remove("o-draw-photo");}}/>
      {photo.isStockPhoto&&<span className="o-draw-photo-note">Fotografía de referencia</span>}
     </div>
     <div className="draw-mini-content">
      <span className="draw-mini-kicker">OPORTUNIA · {draw.idea?"CATÁLOGO OPORTUNIA":"PREMIO DESTACADO"}</span>
      <h3>{draw.prize}</h3>
      <p>{draw.description}</p>
      <div className="draw-mini-foot">
       <span>{draw.idea?"Propuesta de premio":"Conoce sus condiciones"}</span>
       <a href="#registro" aria-label={"Conocer novedades de "+draw.prize}>Conocer más <HomeIcon name="arrow-right" size={18}/></a>
      </div>
     </div>
    </article>;
   })}
  </div>
  {cards.length>1&&<div className="o-carousel-indicator" aria-label={"Tarjeta "+(active+1)+" de "+cards.length}>
   {cards.map((draw,index)=><button type="button" key={draw.id}
    aria-label={"Ir al premio "+(index+1)} aria-current={index===active?"true":undefined}
    className={index===active?"active":""} onClick={()=>goTo(index)}/>)}
  </div>}
 </section>;
}
