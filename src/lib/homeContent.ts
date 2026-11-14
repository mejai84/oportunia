export type HomeContentData={
 heroEyebrow:string;heroPrefix:string;heroDescription:string;
 primaryButton:string;secondaryButton:string;
 carouselKicker:string;carouselTitle:string;carouselDescription:string;
 trustLabels:[string,string,string];
 benefits:{title:string;detail:string}[];
};
export type HomeCard={id:string;title:string;description:string;image_url:string|null;display_order:number;enabled:boolean};
export const defaultHomeContent:HomeContentData={
 heroEyebrow:"OPORTUNIDAD DESTACADA",heroPrefix:"¡Descubre el próximo",
 heroDescription:"Descubre premios, conoce cómo elegir tus números y sigue las novedades de cada edición.",
 primaryButton:"Explorar oportunidades",secondaryButton:"Cómo funciona",
 carouselKicker:"EXPLORA OPORTUNIA",carouselTitle:"Premios que emocionan.",
 carouselDescription:"Descubre los premios y las ideas para futuras ediciones.",
 trustLabels:["Reglas claras","Elige tus números","Mantente informado"],
 benefits:[
  {title:"Seguro y confiable",detail:"Historial de tus reportes y acceso protegido a tu cuenta."},
  {title:"Fácil de participar",detail:"Conoce las reglas y descubre cómo elegir tus números."},
  {title:"Opciones de pago",detail:"Explora las modalidades de pago definidas para cada edición."},
  {title:"Seguimiento en tiempo real",detail:"Revisa los cambios registrados en tu cuenta y tus avisos."}
 ]
};
export const fallbackHomeCards:HomeCard[]=[
 {id:"concepto-consola",title:"Consola de videojuegos",description:"Una propuesta de premio para quienes disfrutan jugar.",image_url:null,display_order:2,enabled:true},
 {id:"concepto-televisor",title:"Smart TV 55″",description:"Una idea para futuras ediciones de entretenimiento en casa.",image_url:null,display_order:3,enabled:true},
 {id:"concepto-moto",title:"Motocicleta urbana",description:"Una idea de premio para disfrutar de nuevas aventuras.",image_url:null,display_order:4,enabled:true},
 {id:"concepto-portatil",title:"Computador portátil",description:"Una idea de premio para estudiar, crear o trabajar.",image_url:null,display_order:5,enabled:true},
 {id:"concepto-tablet",title:"Tablet de última generación",description:"Una propuesta para una futura edición.",image_url:null,display_order:6,enabled:true}
];
export function normalizeHomeContent(raw:Partial<HomeContentData>|null|undefined):HomeContentData{
 if(!raw)return defaultHomeContent;
 const clean=(value:unknown,fallback:string,max=300)=>
  typeof value==="string"&&value.trim().length>0?value.trim().slice(0,max):fallback;
 const benefits=Array.isArray(raw.benefits)?defaultHomeContent.benefits.map((b,i)=>{
  const item=raw.benefits?.[i];
  return {title:clean(item?.title,b.title,80),detail:clean(item?.detail,b.detail,160)};
 }):defaultHomeContent.benefits;
 const trustLabels:HomeContentData["trustLabels"]=defaultHomeContent.trustLabels.map((t,i)=>
  clean(Array.isArray(raw.trustLabels)?raw.trustLabels[i]:null,t,45)
 ) as HomeContentData["trustLabels"];
 return {
  heroEyebrow:clean(raw.heroEyebrow,defaultHomeContent.heroEyebrow,80),
  heroPrefix:clean(raw.heroPrefix,defaultHomeContent.heroPrefix,85),
  heroDescription:clean(raw.heroDescription,defaultHomeContent.heroDescription,300),
  primaryButton:clean(raw.primaryButton,defaultHomeContent.primaryButton,50),
  secondaryButton:clean(raw.secondaryButton,defaultHomeContent.secondaryButton,50),
  carouselKicker:clean(raw.carouselKicker,defaultHomeContent.carouselKicker,80),
  carouselTitle:clean(raw.carouselTitle,defaultHomeContent.carouselTitle,85),
  carouselDescription:clean(raw.carouselDescription,defaultHomeContent.carouselDescription,300),
  trustLabels,benefits
 };
}
