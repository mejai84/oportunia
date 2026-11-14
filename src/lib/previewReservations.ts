/** PostgreSQL-backed preview selection only: never represents a paid opportunity. */
export type PreviewMode = "manual" | "automatic";
export type PreviewPlan = "contado" | "dos-cuotas" | "tres-cuotas";
export type PreviewStatus = "active" | "expired" | "cancelled";
export type PreviewDraw = {
  id:string;title:string;enabled:boolean;status:"preview"|"coming_soon"|"closed";
};
export type PreviewReservation = {
  id:string;draw_id:string;user_id:string;selection_mode:PreviewMode;
  preferred_plan:PreviewPlan;status:PreviewStatus;
  created_at:string;expires_at:string;closed_at:string|null;
};
export type PreviewNumber = {
  draw_id:string;reservation_id:string;number:number;created_at:string;
  category?:"initial"|"extra_demo";milestone?:number;
};
export type PreviewEvent = {
  id:number;reservation_id:string;actor_id:string|null;
  event_type:"created"|"expired"|"cancelled";numbers:number[];created_at:string;
};

export function displayPreviewNumber(number:number) {
  if(!Number.isInteger(number)||number<0||number>9999)throw new Error("Número fuera de rango.");
  return String(number).padStart(4,"0");
}
export function parsePreviewNumber(value:string):number|null {
  if(!/^\d{1,4}$/.test(value.trim()))return null;
  const number=Number(value);
  return number>=0&&number<=9999?number:null;
}
export function validatePreviewSelection(numbers:readonly number[]):string|null {
  if(numbers.length!==10)return "Debes escoger exactamente diez números.";
  if(numbers.some(n=>!Number.isInteger(n)||n<0||n>9999))return "Solo se aceptan números del 0000 al 9999.";
  if(new Set(numbers).size!==10)return "Los diez números deben ser diferentes.";
  return null;
}
export function effectivePreviewStatus(reservation:Pick<PreviewReservation,"status"|"expires_at">,now=new Date()):PreviewStatus {
  if(reservation.status!=="active")return reservation.status;
  return new Date(reservation.expires_at).getTime()<=now.getTime()?"expired":"active";
}
export function summarizePreviewReservations(
  reservations:readonly PreviewReservation[], numbers:readonly PreviewNumber[],drawId:string,now=new Date()
) {
  const scoped=reservations.filter(r=>r.draw_id===drawId);
  const active=scoped.filter(r=>effectivePreviewStatus(r,now)==="active");
  const activeIds=new Set(active.map(r=>r.id));
  const selected=numbers.filter(n=>n.draw_id===drawId&&activeIds.has(n.reservation_id));
  return {
    active:active.length,expired:scoped.filter(r=>effectivePreviewStatus(r,now)==="expired").length,
    cancelled:scoped.filter(r=>r.status==="cancelled").length,
    selectedNumbers:selected.length,
    freeNumbers:Math.max(0,10000-selected.length),
    opportunitiesRemaining:Math.max(0,200-active.length),
  };
}
