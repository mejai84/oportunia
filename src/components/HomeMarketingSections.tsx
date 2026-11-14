import Link from "next/link";
import type { ReactNode } from "react";

export type HomeIconName =
  | "shield" | "zap" | "wallet" | "bell" | "smartphone" | "numbers"
  | "credit-card" | "trophy" | "arrow-right" | "clock" | "sparkles";

export function HomeIcon({ name, size=28, className="" }:{
  name:HomeIconName;size?:number;className?:string;
}){
  const paths:Record<HomeIconName,ReactNode>={
    shield:<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
    zap:<path d="m13 2-10 12h8l-1 8 11-12h-8l1-8Z"/>,
    wallet:<><rect x="2" y="5" width="20" height="16" rx="3"/><path d="M2 9h20M16 15h2"/></>,
    bell:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/></>,
    smartphone:<><rect x="5" y="2" width="14" height="20" rx="3"/><path d="M11 18h2"/></>,
    numbers:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    "credit-card":<><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h5"/></>,
    trophy:<><path d="M8 3h8v8a4 4 0 0 1-8 0V3ZM8 5H4v3a4 4 0 0 0 4 4M16 5h4v3a4 4 0 0 1-4 4M12 15v5M8 21h8"/></>,
    "arrow-right":<><path d="M5 12h14m-6-6 6 6-6 6"/></>,
    clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    sparkles:<><path d="m12 2 2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2L12 2ZM19 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1Z"/></>,
  };
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" focusable="false" aria-hidden="true">{paths[name]}</svg>;
}

export const publicBenefits=[
  {icon:"shield" as const,title:"Seguro y confiable",detail:"Historial de tus reportes y acceso protegido a tu cuenta."},
  {icon:"zap" as const,title:"Fácil de participar",detail:"Conoce las reglas y ensaya tus números antes de la apertura."},
  {icon:"wallet" as const,title:"Opciones de pago",detail:"Consulta las modalidades previstas. El recaudo real aún no está habilitado."},
  {icon:"bell" as const,title:"Seguimiento en tiempo real",detail:"Revisa los cambios registrados en tu cuenta y tus avisos."},
] as const;

export const publicParticipationSteps=[
  {icon:"smartphone" as const,title:"Regístrate",detail:"Crea tu cuenta para consultar avisos y guardar tu historial.",href:"/acceso",action:"Ir a mi cuenta"},
  {icon:"numbers" as const,title:"Elige tus números",detail:"Prueba cómo seleccionar 10 números o recibirlos automáticamente.",href:"/ensayo-reservas",action:"Probar números"},
  {icon:"credit-card" as const,title:"Realiza tu pago",detail:"Cuando se autorice la apertura, consulta los canales y la verificación oficial.",href:"/reglas",action:"Conocer condiciones"},
  {icon:"trophy" as const,title:"¡Listo!",detail:"Solo una oportunidad confirmada conforme al reglamento podrá participar.",href:"/reglas",action:"Consultar reglas"},
] as const;

export function HomeBenefits(){
  return <section className="container o-home-benefits" aria-label="Beneficios de Oportunia">
    <div className="o-home-benefits-grid">
      {publicBenefits.map(item=><article className="o-home-benefit" key={item.title}>
        <span className="o-home-benefit-icon"><HomeIcon name={item.icon} size={34}/></span>
        <div><h2>{item.title}</h2><p>{item.detail}</p></div>
      </article>)}
    </div>
  </section>;
}

export function HomeParticipation(){
  return <section className="container o-home-participation" id="como-funciona" aria-labelledby="o-home-participation-title">
    <div className="o-home-participation-head">
      <div><span className="f-kicker">GUÍA DE PARTICIPACIÓN</span>
        <h2 id="o-home-participation-title">¿Cómo <span>participar?</span></h2></div>
      <p>Cuatro pasos sencillos. Por ahora puedes explorar el proceso y probar tus números sin comprar.</p>
    </div>
    <ol className="o-home-participation-grid">
      {publicParticipationSteps.map((step,index)=><li className="o-home-step" key={step.title}>
        <span className="o-home-step-number" aria-label={"Paso "+(index+1)}>{index+1}</span>
        <span className="o-home-step-icon"><HomeIcon name={step.icon} size={31}/></span>
        <div className="o-home-step-content"><h3>{step.title}</h3><p>{step.detail}</p>
          <Link href={step.href}>{step.action}<HomeIcon name="arrow-right" size={15}/></Link>
        </div>
        {index<publicParticipationSteps.length-1&&<span className="o-home-step-arrow"><HomeIcon name="arrow-right" size={20}/></span>}
      </li>)}
    </ol>
    <p className="o-home-participation-note"><HomeIcon name="shield" size={17}/>
      Las ventas y participaciones reales siguen cerradas hasta cumplir las verificaciones y autorizaciones aplicables.</p>
  </section>;
}
