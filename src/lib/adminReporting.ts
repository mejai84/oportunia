/** Pure CSV/period helpers: no bank details, passwords or browser storage. */
export type ReportDaily={day:string;reports:number;movements:number;previews:number};
export type ReportSummary={
 period:{from:string;to:string;time_zone:string;status_basis:string};
 customers:{new_accounts:number};
 bank_claims:{total:number;pending:number;matched:number;rejected:number;amount_declared_cop:number;amount_matched_claims_cop:number};
 bank_movements:{total:number;matched:number;unmatched:number;ignored:number;amount_imported_cop:number;amount_matched_file_cop:number};
 preview:{created:number;active_now:number;expired_now:number;cancelled:number;extra_demo_blocks:number;extra_demo_numbers:number};
 followups:{created:number;pending:number;done:number;cancelled:number};
 audit:{role_changes:number;content_changes:number;bank_actions:number};
 daily:ReportDaily[];
};
export type ReportEvent={
 id:string;created_at:string;category:string;action:string;actor:string;reference:string;detail:string;source:string;
};
export type ReportActivity={total:number;offset:number;limit:number;items:ReportEvent[]};
export type ExportRequest={
 id:number;actor_id:string|null;report_type:"summary"|"activity";period_start:string;period_end:string;
 rows_requested:number;requested_at:string;
};

export const reportsLabels=[
 ["Cuentas nuevas","customers.new_accounts","conteo"],
 ["Referencias reportadas","bank_claims.total","conteo"],
 ["Referencias pendientes","bank_claims.pending","conteo"],
 ["Referencias cotejadas con extracto","bank_claims.matched","conteo"],
 ["Referencias rechazadas","bank_claims.rejected","conteo"],
 ["Valor total declarado por clientes","bank_claims.amount_declared_cop","COP declarados (NO ingresos)"],
 ["Valor declarado de referencias cotejadas","bank_claims.amount_matched_claims_cop","COP declarados (NO ingresos)"],
 ["Movimientos importados","bank_movements.total","conteo"],
 ["Movimientos cotejados con archivo","bank_movements.matched","conteo"],
 ["Movimientos sin coincidencia","bank_movements.unmatched","conteo"],
 ["Movimientos excluidos","bank_movements.ignored","conteo"],
 ["Valor de movimientos importados","bank_movements.amount_imported_cop","COP de archivo (NO ingreso certificado)"],
 ["Valor de movimientos cotejados","bank_movements.amount_matched_file_cop","COP de archivo (NO ingreso certificado)"],
 ["Ensayos creados","preview.created","conteo"],
 ["Ensayos vigentes hoy","preview.active_now","conteo"],
 ["Ensayos vencidos","preview.expired_now","conteo"],
 ["Ensayos cancelados","preview.cancelled","conteo"],
 ["Hitos extra de simulación ejecutados","preview.extra_demo_blocks","conteo"],
 ["Números adicionales ficticios generados","preview.extra_demo_numbers","conteo"],
 ["Tareas de seguimiento creadas","followups.created","conteo"],
 ["Tareas pendientes","followups.pending","conteo"],
 ["Tareas completadas","followups.done","conteo"],
 ["Tareas canceladas","followups.cancelled","conteo"],
 ["Cambios de rol auditados","audit.role_changes","conteo"],
 ["Cambios de contenido auditados","audit.content_changes","conteo"],
 ["Acciones bancarias auditadas","audit.bank_actions","conteo"],
] as const;
export function metricValue(report:ReportSummary,key:string):number {
  const [section,field]=key.split(".");
  if(section==="customers")return report.customers[field as keyof ReportSummary["customers"]];
  if(section==="bank_claims")return report.bank_claims[field as keyof ReportSummary["bank_claims"]];
  if(section==="bank_movements")return report.bank_movements[field as keyof ReportSummary["bank_movements"]];
  if(section==="preview")return report.preview[field as keyof ReportSummary["preview"]];
  if(section==="followups")return report.followups[field as keyof ReportSummary["followups"]];
  if(section==="audit")return report.audit[field as keyof ReportSummary["audit"]];
  throw new Error("Clave de indicador desconocida");
}
export function bogotaIsoDate(date:Date):string {
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Bogota",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
  const part=(k:string)=>parts.find(p=>p.type===k)?.value||"";
  return part("year")+"-"+part("month")+"-"+part("day");
}
export function reportPeriodError(start:string,end:string):string|null {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end))return "Selecciona ambas fechas.";
  function parseIso(value:string):number|null {
    const [y,m,d]=value.split("-").map(Number);
    const ms=Date.UTC(y,m-1,d);
    const date=new Date(ms);
    return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d?ms:null;
  }
  const a=parseIso(start),b=parseIso(end);
  if(a===null||b===null)return "Las fechas no son válidas.";
  if(a>b)return "La fecha final debe ser posterior o igual a la inicial.";
  if((b-a)/86400000>365)return "El período máximo es de 366 días.";
  return null;
}
function safeCsvCell(value:string|number|boolean|null|undefined):string{
  let content=String(value??"").replace(/[\r\n\t]+/g," ").replace(/\u0000/g,"");
  // Block spreadsheet formula injection from user-supplied descriptions and references.
  if(/^[\s]*[=+\-@]/.test(content))content="'"+content;
  return '"'+content.replace(/"/g,'""')+'"';
}
export function writeCsv(header:readonly string[],rows:readonly (readonly (string|number|boolean|null|undefined)[])[]):string{
  return [header,...rows].map(row=>row.map(safeCsvCell).join(";")).join("\r\n")+"\r\n";
}
export function summaryCsv(summary:ReportSummary):string {
  return writeCsv(["Módulo","Indicador","Valor","Unidad","Inicio","Fin","Fuente"],reportsLabels.map(([label,key,unit])=>[
    key.split(".")[0],label,metricValue(summary,key),unit,summary.period.from,summary.period.to,"Supabase"
  ]));
}
export const activityCsvHeaders=["Fecha","Categoría","Acción","Actor (ID parcial)","Registro (ID parcial)","Detalle","Origen Supabase"];
export function eventsCsv(rows:readonly ReportEvent[]):string{
  return writeCsv(activityCsvHeaders,rows.map(row=>[row.created_at,row.category,row.action,row.actor,row.reference,row.detail,row.source]));
}
export function isValidReportSummary(value:unknown):value is ReportSummary {
  if(!value||typeof value!=="object")return false;
  const r=value as Partial<ReportSummary>;
  return Array.isArray(r.daily)&&typeof r.customers?.new_accounts==="number"&&
    typeof r.bank_claims?.total==="number"&&typeof r.bank_movements?.total==="number"&&
    typeof r.preview?.created==="number"&&typeof r.followups?.created==="number"&&
    typeof r.audit?.role_changes==="number"&&typeof r.period?.from==="string";
}
export function isValidActivity(value:unknown):value is ReportActivity {
  if(!value||typeof value!=="object")return false;
  const r=value as Partial<ReportActivity>;
  return typeof r.total==="number"&&typeof r.offset==="number"&&Array.isArray(r.items)&&
    r.items.every(item=>typeof item.id==="string"&&typeof item.created_at==="string");
}
