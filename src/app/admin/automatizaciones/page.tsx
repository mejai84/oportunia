"use client";
import Link from "next/link";
import {useCallback,useEffect,useMemo,useState} from "react";
import {AdminAccessGate} from "@/components/AdminAccessGate";
import {oportuniaClient} from "@/lib/oportuniaSupabase";
import {type PaymentWorkflow,type PaymentWorkflowRun} from "@/lib/paymentControl";

type WorkflowAudit={id:number;workflow_key:string;was_enabled:boolean;now_enabled:boolean;actor_id:string|null;changed_at:string};
function WorkflowsWorkspace(){
 const client=useMemo(()=>oportuniaClient(),[]);
 const [workflows,setWorkflows]=useState<PaymentWorkflow[]>([]);
 const [runs,setRuns]=useState<PaymentWorkflowRun[]>([]);
 const [history,setHistory]=useState<WorkflowAudit[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState<string|null>(null);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const refresh=useCallback(async()=>{
  const [a,b,c]=await Promise.all([
    client.from("payment_notification_workflows").select("*").order("workflow_key"),
    client.from("payment_notification_runs").select("*").order("created_at",{ascending:false}).limit(150),
    client.from("payment_notification_workflow_audit").select("*").order("changed_at",{ascending:false}).limit(100),
  ]);
  if(a.error||b.error||c.error)throw new Error("No se pudieron leer las automatizaciones. Comprueba que la migración está aplicada.");
  setWorkflows((a.data||[]) as PaymentWorkflow[]);
  setRuns((b.data||[]) as PaymentWorkflowRun[]);
  setHistory((c.data||[]) as WorkflowAudit[]);
 },[client]);
 useEffect(()=>{let mounted=true;
  void refresh().catch(e=>{if(mounted)setError(e instanceof Error?e.message:"Error");})
    .finally(()=>{if(mounted)setLoading(false);});
  return()=>{mounted=false;};
 },[refresh]);
 async function toggle(w:PaymentWorkflow){
  if(busy)return;
  const next=!w.enabled;
  if(!window.confirm((next?"¿Activar":"¿Desactivar")+" el flujo de avisos internos «"+w.label+"»? No se enviará ningún mensaje por WhatsApp, correo o SMS."))return;
  setBusy(w.workflow_key);setError("");setNotice("");
  try{
   const {error:writeError}=await client.rpc("set_payment_notification_workflow",{
     p_workflow_key:w.workflow_key,p_enabled:next,
   });
   if(writeError)throw writeError;
   await refresh();
   setNotice("El cambio quedó registrado en Supabase. Solo modifica futuros eventos.");
  }catch(e){setError(e instanceof Error?e.message:"No se pudo cambiar el flujo.");}
  finally{setBusy(null);}
 }
 const generated=runs.filter(r=>r.result==="in_app_created").length;
 return <div className="container page-space payctrl-admin">
  <div className="payctrl-heading"><div><span className="overline">AUTOMATIZACIONES · MOTOR INTERNO</span>
   <h1>Flujos de <span className="gradient-text">notificaciones.</span></h1>
   <p>Automatizaciones basadas en eventos de Supabase, similares a un flujo n8n, sin instalar n8n ni conectarse a servicios externos.</p></div>
   <Link href="/admin" className="btn btn-secondary">Volver al menú</Link></div>
  <div className="payctrl-note"><strong>Canal habilitado: bandeja privada en Oportunia.</strong> No hay envío por WhatsApp, SMS ni correo; ningún flujo confirma pagos auténticos o libera participaciones. Los cambios solo afectan a eventos futuros.</div>
  {error&&<div className="alert alert-error" role="alert">{error}</div>}
  {notice&&<div className="alert alert-success" role="status">{notice}</div>}
  {loading?<section className="payctrl-panel">Cargando automatizaciones…</section>:<>
    <div className="payctrl-metrics"><div><strong>{workflows.length}</strong><span>Flujos configurados</span></div>
     <div><strong>{workflows.filter(w=>w.enabled).length}</strong><span>Flujos activados</span></div>
     <div><strong>{generated}</strong><span>Avisos internos registrados</span></div>
     <div><strong>0</strong><span>Mensajes externos enviados</span></div></div>
    <section className="payctrl-panel"><h2>Reglas activas y condiciones</h2>
     <div className="payctrl-workflows">{workflows.map(w=><article key={w.workflow_key}>
       <div className="payctrl-line"><strong>{w.label}</strong><span>{w.enabled?"Activado":"Desactivado"}</span></div>
       <p>{w.description}</p>
       <small>Disparador: {w.workflow_key} · Destino: bandeja interna · Sin canal externo</small>
       <button type="button" className="btn btn-secondary btn-small" disabled={busy!==null} onClick={()=>void toggle(w)}>
        {busy===w.workflow_key?"Guardando…":w.enabled?"Desactivar flujo":"Activar flujo"}</button>
     </article>)}</div>
    </section>
    <div className="payctrl-two">
     <section className="payctrl-panel"><h2>Ejecuciones recientes</h2>
      <p className="muted">Un registro por evento: el motor evita duplicados del mismo flujo y evento.</p>
      {runs.length===0?<p className="muted">Todavía no hay ejecuciones. Se registrarán al vincular o revisar referencias en el ensayo.</p>:
       <div className="payctrl-list">{runs.map(r=><article key={r.id}><div className="payctrl-line"><strong>{r.workflow_key}</strong>
        <span>{r.result==="in_app_created"?"Aviso interno creado":"Flujo desactivado"}</span></div>
        <small>Evento {r.case_event_id} · {new Date(r.created_at).toLocaleString("es-CO")}</small></article>)}</div>}
     </section>
     <section className="payctrl-panel"><h2>Auditoría de configuración</h2>
      {history.length===0?<p className="muted">No hay modificaciones de reglas. Los tres flujos están configurados inicialmente.</p>:
       <div className="payctrl-list">{history.map(h=><article key={h.id}>
        <strong>{h.workflow_key}</strong><p>{h.was_enabled?"Activo":"Inactivo"} → {h.now_enabled?"Activo":"Inactivo"}</p>
        <small>{new Date(h.changed_at).toLocaleString("es-CO")} · Responsable {h.actor_id?.slice(0,8)||"Cuenta retirada"}</small></article>)}</div>}
     </section>
    </div>
  </>}
 </div>;
}
export default function AdminAutomationsPage(){return <AdminAccessGate requiredPermission="staff.manage"><WorkflowsWorkspace/></AdminAccessGate>;}
