import {
  activeOrders, drawIdOf, isEligible, isReservationExpired,
  TOTAL_NUMBERS, PRICE, type DemoState,
} from "./domain";
export type LocalNumberState = "libre"|"reservado"|"parcial"|"habilitado"|"inconsistente";
export type NumberRecord = {
  number:string; status:LocalNumberState; orderId:string;
  customerName:string; origin:"elegido"|"aleatorio"; paid:number;
};
export type NumberAudit = {
  entries: Map<string,NumberRecord>;
  anomalies:string[];
  totals:Record<LocalNumberState,number>;
  orders:number;
  count:number;
};

export function buildLocalNumberAudit(state:DemoState, drawId:string,now=new Date()):NumberAudit {
  const entries=new Map<string,NumberRecord>();
  const anomalies:string[]=[];
  const active=activeOrders(state,drawId,now);
  for(const order of active){
    if(drawIdOf(order)!==drawId || isReservationExpired(order,now))continue;
    if(order.selected.length!==10)anomalies.push("Orden "+order.id+" tiene "+order.selected.length+" números seleccionados (esperados: 10).");
    if(order.random.length>40)anomalies.push("Orden "+order.id+" tiene más de 40 números aleatorios.");
    if(order.paid<0 || order.paid>PRICE)anomalies.push("Orden "+order.id+" tiene un abono local fuera de rango.");
    const status:LocalNumberState=isEligible(order)?"habilitado":
      order.paid===0?"reservado":order.paid<PRICE?"parcial":"inconsistente";
    for(const [origin,numbers] of [["elegido",order.selected],["aleatorio",order.random]] as const){
      for(const number of numbers){
        if(!/^[0-9]{4}$/.test(number)) {
          anomalies.push("Orden "+order.id+": número inválido "+String(number).slice(0,40));
          continue;
        }
        const old=entries.get(number);
        if(old) {
          anomalies.push("Número "+number+" duplicado entre "+old.orderId+" y "+order.id+".");
          continue;
        }
        entries.set(number,{number,status,orderId:order.id,customerName:order.customer.name,origin,paid:order.paid});
      }
    }
  }
  const totals:Record<LocalNumberState,number>={libre:TOTAL_NUMBERS, reservado:0,parcial:0,habilitado:0,inconsistente:0};
  for(const item of entries.values()){totals[item.status]++;totals.libre--;}
  return {entries,anomalies,totals,orders:active.length,count:entries.size};
}
export function numbersWithStatus(audit:NumberAudit,status:LocalNumberState|"todos",search:string):string[] {
  const term=search.trim();
  if(term && !/^[0-9]{1,4}$/.test(term))return [];
  const matches:string[]=[];
  for(let index=0;index<TOTAL_NUMBERS;index++){
    const n=String(index).padStart(4,"0");
    const state=audit.entries.get(n)?.status||"libre";
    if(status!=="todos" && status!==state)continue;
    if(term && !n.includes(term))continue;
    matches.push(n);
  }
  return matches;
}
