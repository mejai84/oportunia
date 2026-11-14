"use client";
import Link from "next/link";
import {useCallback,useEffect,useMemo,useState,type FormEvent} from "react";
import {AdminAccessGate} from "@/components/AdminAccessGate";
import {oportuniaClient} from "@/lib/oportuniaSupabase";
import {bogotaIsoDate,reportPeriodError,isValidActivity,isValidReportSummary,
 summaryCsv,eventsCsv,reportsLabels,metricValue,
 type ReportSummary,type ReportActivity,type ReportDaily,type ReportEvent,type ExportRequest} from "@/lib/adminReporting";

const PAGE=100;
const money=(value:number)=>new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(value);
const nf=(value:number)=>new Intl.NumberFormat("es-CO").format(value);
type Applied={from:string;to:string;revision:number};

function DailyTrend({daily}:{daily:ReportDaily[]}){
 const days=daily.slice(-30);
 const peak=Math.max(1,...days.map(d=>Math.max(d.reports,d.movements,d.previews)));
 const point=(value:number,i:number)=>String(45+i*755/Math.max(1,days.length-1))+","+String(183-value/peak*145);
 const lines=[
  {key:"reports" as const,label:"Reportes declarados",color:"#37bd8d"},
  {key:"movements" as const,label:"Movimientos de extracto",color:"#4d8eef"},
  {key:"previews" as const,label:"Reservas de ensayo",color:"#f3b45f"},
 ];
 return <div className="reports-trend">
  <div className="reports-trend-head"><h3>Actividad diaria</h3><small>Últimos {days.length} días del período seleccionado · Conteos, no COP</small></div>
  <div className="reports-legend">{lines.map(l=><span key={l.key}><i style={{background:l.color}}/>{l.label}</span>)}</div>
  <svg viewBox="0 0 845 225" role="img" aria-label="Gráfico diario de referencias, movimientos importados y ensayos" className="reports-svg">
   {[0,1,2,3,4].map(i=><g key={i}><line x1="45" x2="800" y1={183-i*36} y2={183-i*36} stroke="#d7e8e0" strokeDasharray="4 6"/>
    <text x="39" y={187-i*36} fill="#587468" fontSize="11" textAnchor="end">{Math.round(peak*i/4)}</text></g>)}
   {lines.map(l=><polyline key={l.key} fill="none" stroke={l.color} strokeWidth="3.2" strokeLinejoin="round"
     strokeLinecap="round" points={days.map((d,i)=>point(d[l.key],i)).join(" ")}/>)}
   <text x="45" y="208" fontSize="11" fill="#587468">{days[0]?.day||"—"}</text>
   <text x="800" y="208" textAnchor="end" fontSize="11" fill="#587468">{days[days.length-1]?.day||"—"}</text>
  </svg>
 </div>;
}

function ReportsWorkspace(){
 const client=useMemo(()=>oportuniaClient(),[]);
 const [start,setStart]=useState(()=>bogotaIsoDate(new Date(Date.now()-29*86400000)));
 const [end,setEnd]=useState(()=>bogotaIsoDate(new Date()));
 const [applied,setApplied]=useState<Applied>(()=>({from:bogotaIsoDate(new Date(Date.now()-29*86400000)),to:bogotaIsoDate(new Date()),revision:0}));
 const [page,setPage]=useState(0);
 const [summary,setSummary]=useState<ReportSummary|null>(null);
 const [activity,setActivity]=useState<ReportActivity|null>(null);
 const [logs,setLogs]=useState<ExportRequest[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState<"summary"|"activity"|null>(null);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");

 const refresh=useCallback(async(range:Applied,pageIndex:number)=>{
   const [summaryR,activityR,logsR]=await Promise.all([
    client.rpc("get_admin_reporting_summary",{p_from:range.from,p_to:range.to}),
    client.rpc("get_admin_reporting_activity",{p_from:range.from,p_to:range.to,p_offset:pageIndex*PAGE,p_limit:PAGE}),
    client.from("admin_report_export_requests").select("id,actor_id,report_type,period_start,period_end,rows_requested,requested_at")
      .order("requested_at",{ascending:false}).limit(15),
   ]);
   if(summaryR.error||activityR.error||logsR.error)throw new Error("No fue posible consultar los informes. Verifica tu sesión, permisos y migración de Supabase.");
   if(!isValidReportSummary(summaryR.data)||!isValidActivity(activityR.data))throw new Error("Supabase devolvió un informe incompleto; la descarga está bloqueada.");
   setSummary(summaryR.data);setActivity(activityR.data);setLogs((logsR.data||[]) as ExportRequest[]);
 },[client]);
 useEffect(()=>{
  let active=true;
  setLoading(true);setError("");
  void refresh(applied,page).catch(e=>{if(active){setSummary(null);setActivity(null);setError(e instanceof Error?e.message:"Error de consulta");}})
    .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[applied,page,refresh]);

 function apply(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  const issue=reportPeriodError(start,end);
  if(issue){setError(issue);return;}
  setError("");setNotice("");setPage(0);setApplied(old=>({from:start,to:end,revision:old.revision+1}));
 }
 async function saveCsv(type:"summary"|"activity"){
   if(busy||loading||!summary||!activity)return;
   setBusy(type);setError("");setNotice("");
   try{
     let csv:string,numberRows:number;
     if(type==="summary"){
       csv=summaryCsv(summary);numberRows=reportsLabels.length;
     }else{
       if(activity.total>20000)throw new Error("Hay más de 20.000 eventos en este período. Reduce las fechas para obtener una exportación completa, sin recortes.");
       const all:ReportEvent[]=[];const ids=new Set<string>();
       for(let offset=0;offset<activity.total;offset+=200){
         const {data,error:rpcError}=await client.rpc("get_admin_reporting_activity",{
           p_from:applied.from,p_to:applied.to,p_offset:offset,p_limit:200,
         });
         if(rpcError||!isValidActivity(data))throw new Error("Falló una página de eventos. No se generó un CSV incompleto.");
         if(data.total!==activity.total)throw new Error("El historial cambió durante la exportación. Actualiza e inténtalo nuevamente.");
         for(const event of data.items){
           if(ids.has(event.id))throw new Error("Se detectó una página duplicada. Actualiza para exportar nuevamente.");
           ids.add(event.id);all.push(event);
         }
       }
       if(all.length!==activity.total)throw new Error("No se recibieron todos los eventos solicitados. Se canceló la descarga.");
       numberRows=all.length;csv=eventsCsv(all);
     }
     const {error:logError}=await client.rpc("register_admin_report_export",{
       p_type:type,p_from:applied.from,p_to:applied.to,p_rows:numberRows,
     });
     if(logError)throw new Error("No se pudo registrar la solicitud de exportación. Por seguridad, no se generó el archivo.");
     const blob=new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8"});
     const url=URL.createObjectURL(blob);
     const link=document.createElement("a");
     link.href=url;link.download="oportunia_"+type+"_"+applied.from+"_"+applied.to+".csv";
     document.body.appendChild(link);link.click();link.remove();
     window.setTimeout(()=>URL.revokeObjectURL(url),1000);
     setNotice(type==="summary"?"Resumen CSV preparado.":"Historial CSV completo preparado, "+nf(numberRows)+" eventos.");
     const {data}=await client.from("admin_report_export_requests")
       .select("id,actor_id,report_type,period_start,period_end,rows_requested,requested_at")
       .order("requested_at",{ascending:false}).limit(15);
     if(data)setLogs(data as ExportRequest[]);
   }catch(e){setError(e instanceof Error?e.message:"No fue posible generar el archivo.");}
   finally{setBusy(null);}
 }
 const first=activity&&activity.total>0?page*PAGE+1:0;
 const last=activity?Math.min((page+1)*PAGE,activity.total):0;
 const metricGroups=[
  {heading:"Referencias declaradas",keys:reportsLabels.filter(x=>x[1].startsWith("bank_claims."))},
  {heading:"Extractos importados",keys:reportsLabels.filter(x=>x[1].startsWith("bank_movements."))},
  {heading:"Ensayos y seguimiento",keys:reportsLabels.filter(x=>x[1].startsWith("preview.")||x[1].startsWith("followups."))},
  {heading:"Clientes y control",keys:reportsLabels.filter(x=>x[1].startsWith("customers.")||x[1].startsWith("audit."))},
 ];
 return <div className="container page-space reports-page">
  <div className="reports-header"><div><span className="overline">ADMINISTRACIÓN · INFORMES DE SUPABASE</span>
    <h1>Informes y <span className="gradient-text">exportaciones.</span></h1>
    <p>Indicadores calculados en PostgreSQL, con filtros por fechas, eventos auditados y descargas CSV controladas.</p></div>
    <Link href="/admin" className="btn btn-secondary">Volver al menú</Link>
  </div>
  <div className="reports-warning"><strong>Importante:</strong> esta plataforma no dispone de confirmación bancaria automática ni de ventas reales. Los importes declarados y los movimientos de archivos cargados <strong>no son ingresos verificados</strong>. Los números de ensayo no participan en sorteos.</div>
  <form className="reports-filters" onSubmit={apply}>
    <label>Desde (Colombia)<input type="date" value={start} onChange={e=>setStart(e.target.value)} required/></label>
    <label>Hasta (Colombia)<input type="date" value={end} onChange={e=>setEnd(e.target.value)} required/></label>
    <button className="btn btn-primary" disabled={loading||busy!==null} type="submit">Consultar período</button>
  </form>
  {error&&<div className="alert alert-error" role="alert">{error}</div>}
  {notice&&<div className="alert alert-success" role="status">{notice}</div>}
  {loading?<section className="reports-panel"><p>Consultando datos autorizados de Supabase…</p></section>:
  summary&&activity?<>
    <div className="reports-period"><span>Período: <strong>{applied.from} a {applied.to}</strong></span>
      <span>Zona horaria: <strong>America/Bogota</strong></span></div>
    <div className="reports-kpis">
      <article><span>Cuentas nuevas</span><strong>{nf(summary.customers.new_accounts)}</strong><small>Registradas en Supabase</small></article>
      <article><span>Reportes de referencia</span><strong>{nf(summary.bank_claims.total)}</strong><small>Declaraciones, no cobros</small></article>
      <article><span>Movimientos importados</span><strong>{nf(summary.bank_movements.total)}</strong><small>Extractos suministrados</small></article>
      <article><span>Ensayos creados</span><strong>{nf(summary.preview.created)}</strong><small>Sin participaciones reales</small></article>
      <article><span>Acciones bancarias</span><strong>{nf(summary.audit.bank_actions)}</strong><small>Eventos auditados</small></article>
    </div>
    <section className="reports-panel">
      <div className="reports-heading"><div><h2>Movimiento de la operación</h2><p>Conteos diarios de registros, no facturación ni dinero recibido.</p></div>
        <button type="button" className="btn btn-secondary btn-small" disabled={busy!==null} onClick={()=>void saveCsv("summary")}>
          {busy==="summary"?"Preparando…":"Exportar resumen CSV"}</button></div>
      <DailyTrend daily={summary.daily}/>
    </section>
    <section className="reports-panel">
      <div className="reports-heading"><div><h2>Indicadores detallados</h2><p>Los estados corresponden al estado actual de registros que ingresaron durante el período seleccionado.</p></div></div>
      <div className="reports-groups">{metricGroups.map(group=><article key={group.heading}>
        <h3>{group.heading}</h3><div className="reports-rows">{group.keys.map(([label,key,unit])=><div key={key}>
          <span>{label}<small>{unit}</small></span>
          <strong>{unit.startsWith("COP")?money(metricValue(summary,key)):nf(metricValue(summary,key))}</strong>
        </div>)}</div>
      </article>)}</div>
    </section>
    <section className="reports-panel">
      <div className="reports-heading"><div><h2>Actividad y trazabilidad</h2>
        <p>{nf(activity.total)} eventos en el período. Se omiten correos, cuentas completas y referencias bancarias sensibles.</p></div>
        <button type="button" className="btn btn-primary btn-small" disabled={busy!==null||activity.total>20000} onClick={()=>void saveCsv("activity")}>
          {busy==="activity"?"Recopilando eventos…":"Exportar todos los eventos CSV"}</button></div>
      {activity.total>20000&&<p className="alert alert-warning">Más de 20.000 registros. Reduce el período para exportar todos sin recortes.</p>}
      {activity.items.length===0?<p className="muted">No hay actividad registrada para estas fechas.</p>:
        <div className="reports-table-scroll"><table><thead><tr>
          <th>Fecha y hora</th><th>Categoría</th><th>Acción</th><th>Responsable</th><th>Referencia</th><th>Detalle</th>
        </tr></thead><tbody>{activity.items.map(event=><tr key={event.id}>
          <td>{new Date(event.created_at).toLocaleString("es-CO",{timeZone:"America/Bogota"})}</td>
          <td>{event.category}</td><td>{event.action}</td><td>{event.actor}</td><td>{event.reference}</td><td>{event.detail}</td>
        </tr>)}</tbody></table></div>}
      <div className="reports-pagination"><span>Mostrando {first}–{last} de {nf(activity.total)}</span>
        <div><button type="button" className="btn btn-secondary btn-small" disabled={page===0||loading||busy!==null} onClick={()=>setPage(p=>p-1)}>Anterior</button>
          <span>Página {page+1} de {Math.max(1,Math.ceil(activity.total/PAGE))}</span>
          <button type="button" className="btn btn-secondary btn-small" disabled={last>=activity.total||loading||busy!==null} onClick={()=>setPage(p=>p+1)}>Siguiente</button></div>
      </div>
    </section>
    <section className="reports-panel"><div className="reports-heading"><div><h2>Solicitudes de exportación</h2>
      <p>Registra quién solicitó preparar un CSV y qué período abarcaba. No demuestra que se haya guardado en el dispositivo.</p></div></div>
      {logs.length===0?<p className="muted">Todavía no se han solicitado exportaciones.</p>:
      <div className="reports-export-history">{logs.map(log=><div key={log.id}>
        <strong>{log.report_type==="summary"?"Resumen de indicadores":"Historial de eventos"}</strong>
        <span>{log.period_start} a {log.period_end} · {nf(log.rows_requested)} registros</span>
        <small>{new Date(log.requested_at).toLocaleString("es-CO",{timeZone:"America/Bogota"})} · Actor {log.actor_id?.slice(0,8)||"Cuenta retirada"}</small>
      </div>)}</div>}
    </section>
  </>:<section className="reports-panel"><p>No se pudo cargar la información.</p></section>}
 </div>;
}
export default function ReportsPage(){return <AdminAccessGate requiredPermission="audit.read"><ReportsWorkspace/></AdminAccessGate>;}
