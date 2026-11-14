"use client";
import Link from "next/link";
import {useCallback,useEffect,useMemo,useState} from "react";
import {AdminAccessGate} from "@/components/AdminAccessGate";
import {oportuniaClient} from "@/lib/oportuniaSupabase";

type AuditRow={id:string;category:string;action:string;target:string;actor:string;created:string;details:string};
function AuditorPage(){
 const client=useMemo(()=>oportuniaClient(),[]);
 const [rows,setRows]=useState<AuditRow[]>([]);
 const [category,setCategory]=useState("all");
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const refresh=useCallback(async()=>{
  const [staff,content,banks,followups,preview]=await Promise.all([
   client.from("oportunia_staff_audit").select("id,actor_id,target_user_id,event_type,old_role,new_role,created_at").order("created_at",{ascending:false}).limit(100),
   client.from("oportunia_admin_action_audit").select("id,actor_id,entity,record_id,action,old_status,new_status,created_at").order("created_at",{ascending:false}).limit(100),
   client.from("bank_recon_audit").select("id,actor_id,action,claim_id,movement_id,created_at").order("created_at",{ascending:false}).limit(100),
   client.from("crm_followup_events").select("id,actor_id,followup_id,event_type,old_status,new_status,created_at").order("created_at",{ascending:false}).limit(100),
   client.from("preview_extra_events").select("id,actor_id,reservation_id,milestone,created_at").order("created_at",{ascending:false}).limit(100),
  ]);
  if(staff.error||content.error||banks.error||followups.error||preview.error)
   throw new Error("No se pudieron consultar todos los eventos. Verifica el rol auditor y las políticas RLS.");
  const list:AuditRow[]=[
   ...(staff.data||[]).map(e=>({id:"staff-"+e.id,category:"roles",action:e.event_type,target:(e.target_user_id||"").slice(0,8),
    actor:(e.actor_id||"").slice(0,8),created:e.created_at,details:(e.old_role||"Sin rol")+" → "+(e.new_role||"Sin rol")})),
   ...(content.data||[]).map(e=>({id:"content-"+e.id,category:"contenido",action:e.action+" · "+e.entity,target:e.record_id,
    actor:(e.actor_id||"").slice(0,8),created:e.created_at,details:(e.old_status||"—")+" → "+(e.new_status||"—")})),
   ...(banks.data||[]).map(e=>({id:"bank-"+e.id,category:"bancos",action:e.action,target:(e.claim_id||e.movement_id||"").slice(0,8),
    actor:(e.actor_id||"").slice(0,8),created:e.created_at,details:"Evento de conciliación registrado (no equivale a verificación por API)."})),
   ...(followups.data||[]).map(e=>({id:"followup-"+e.id,category:"seguimiento",action:e.event_type,target:e.followup_id.slice(0,8),
    actor:(e.actor_id||"").slice(0,8),created:e.created_at,details:(e.old_status||"—")+" → "+e.new_status})),
   ...(preview.data||[]).map(e=>({id:"preview-"+e.id,category:"ensayos",action:"Hito adicional "+e.milestone,target:e.reservation_id.slice(0,8),
    actor:(e.actor_id||"").slice(0,8),created:e.created_at,details:"10 números ficticios, sin pago ni participación"})),
  ];
  list.sort((a,b)=>b.created.localeCompare(a.created));
  setRows(list);
 },[client]);
 useEffect(()=>{let mounted=true;void refresh().catch(e=>{if(mounted)setError(e instanceof Error?e.message:"Error de auditoría");})
   .finally(()=>{if(mounted)setLoading(false);});return()=>{mounted=false;};},[refresh]);
 const filtered=category==="all"?rows:rows.filter(e=>e.category===category);
 async function reload(){setBusy(true);setError("");try{await refresh()}catch(e){setError(e instanceof Error?e.message:"Error de carga")}finally{setBusy(false)}}
 return <div className="container page-space staff-page">
  <div className="staff-head"><div><span className="overline">AUDITORÍA · SOLO LECTURA</span>
   <h1>Historial de <span className="gradient-text">operaciones.</span></h1>
   <p>Consulta quién cambió accesos, sorteos, resultados, referencias y ensayos. Esta vista no permite modificaciones.</p></div>
   <Link href="/admin" className="btn btn-secondary">Volver al menú</Link></div>
  <div className="staff-explainer"><strong>Registro informativo:</strong> una coincidencia con un archivo importado no es validación bancaria automática. Los números de ensayo no son participaciones oficiales. Los eventos no reemplazan la evidencia original ni los requisitos legales.</div>
  {error&&<div className="alert alert-error" role="alert">{error}</div>}
  <section className="staff-panel"><div className="staff-audit-tools">
   <div><h2>Eventos recientes</h2><p className="muted">{rows.length} eventos recuperados, hasta 100 de cada categoría.</p></div>
   <label>Tipo de evento<select value={category} onChange={e=>setCategory(e.target.value)}>
     <option value="all">Todos</option><option value="roles">Roles</option><option value="contenido">Sorteos / resultados</option>
     <option value="bancos">Conciliación</option><option value="seguimiento">Agenda</option><option value="ensayos">Ensayos</option>
    </select></label>
   <button type="button" className="btn btn-secondary btn-small" disabled={busy} onClick={()=>void reload()}>Actualizar</button>
   </div>
   {loading?<p className="muted">Cargando eventos de Supabase…</p>:filtered.length===0?
     <p className="muted">No hay eventos registrados para el filtro seleccionado.</p>:
     <div className="staff-audit-table"><table className="data-table"><thead><tr>
      <th>Fecha</th><th>Tipo</th><th>Acción</th><th>Registro</th><th>Responsable (ID)</th><th>Detalle</th>
     </tr></thead><tbody>{filtered.map(e=><tr key={e.id}>
       <td>{new Date(e.created).toLocaleString("es-CO")}</td><td>{e.category}</td><td>{e.action}</td>
       <td>{e.target||"—"}</td><td>{e.actor||"—"}</td><td>{e.details}</td>
     </tr>)}</tbody></table></div>}
  </section>
 </div>;
}
export default function AdminAuditPage(){return <AdminAccessGate requiredPermission="audit.read"><AuditorPage/></AdminAccessGate>;}
