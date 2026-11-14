"use client";
import Link from "next/link";
import {useCallback,useEffect,useMemo,useState} from "react";
import {AdminAccessGate} from "@/components/AdminAccessGate";
import {oportuniaClient} from "@/lib/oportuniaSupabase";
import {paymentCOP,paymentEvidenceLabels,paymentControlStats,type PaymentControlCase,type PaymentControlEvent} from "@/lib/paymentControl";

function Workspace(){
 const client=useMemo(()=>oportuniaClient(),[]);
 const [items,setItems]=useState<PaymentControlCase[]>([]);
 const [events,setEvents]=useState<PaymentControlEvent[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [filter,setFilter]=useState("all");
 const refresh=useCallback(async()=>{
  const [a,b]=await Promise.all([
    client.from("payment_control_cases").select("*").order("created_at",{ascending:false}).limit(500),
    client.from("payment_control_case_events").select("*").order("created_at",{ascending:false}).limit(1000),
  ]);
  if(a.error||b.error)throw new Error("No se pudo leer el control de pagos. Comprueba los permisos de tesorería.");
  setItems((a.data||[]) as PaymentControlCase[]);
  setEvents((b.data||[]) as PaymentControlEvent[]);
 },[client]);
 useEffect(()=>{let live=true;
  void refresh().catch(e=>{if(live)setError(e instanceof Error?e.message:"Error de lectura");})
    .finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;};
 },[refresh]);
 const stats=paymentControlStats(items);
 const visible=items.filter(x=>filter==="all"||x.evidence_status===filter);
 return <div className="container page-space payctrl-admin">
  <div className="payctrl-heading"><div><span className="overline">TESORERÍA · PRUEBAS NO COMERCIALES</span>
   <h1>Control de <span className="gradient-text">pagos.</span></h1>
   <p>Relación comprobable entre referencia declarada, reserva de ensayo y cambios de estado.</p></div>
   <Link href="/admin" className="btn btn-secondary">Volver al menú</Link></div>
  <div className="payctrl-note"><strong>El registro no verifica dinero auténtico:</strong> Bancolombia y Nequi todavía no están conectados mediante una fuente autorizada. Las coincidencias de extractos son solo cotejos de archivos aportados por operadores. Ninguna acción de esta pantalla acredita participaciones.</div>
  {error&&<div role="alert" className="alert alert-error">{error}</div>}
  {loading?<section className="payctrl-panel">Consultando controles bancarios de Supabase…</section>:<>
   <div className="payctrl-metrics"><div><strong>{stats.total}</strong><span>Reportes vinculados</span></div>
    <div><strong>{stats.reported}</strong><span>Solo declarados</span></div>
    <div><strong>{stats.fileMatched}</strong><span>Cotejados con archivo</span></div>
    <div><strong>{stats.rejected}</strong><span>Rechazados</span></div>
    <div><strong>0</strong><span>Auténticos confirmados</span></div></div>
   <section className="payctrl-panel"><div className="payctrl-heading"><div>
    <h2>Trazabilidad y evidencias</h2><p>Se muestran los últimos 500 casos, sin contraseñas ni cuentas completas.</p></div>
    <div className="payctrl-actions"><label>Estado<select value={filter} onChange={e=>setFilter(e.target.value)}>
       <option value="all">Todos</option><option value="reported">Declarados</option>
       <option value="file_matched">Coincide con archivo</option><option value="rejected">Rechazados</option>
      </select></label><button className="btn btn-secondary btn-small" type="button" onClick={()=>void refresh().catch(e=>setError(e instanceof Error?e.message:"Error de lectura"))}>Actualizar</button></div></div>
    {visible.length===0?<p className="muted">Aún no hay referencias vinculadas en el ensayo.</p>:
     <div className="payctrl-list">{visible.map(c=><article key={c.id}>
      <div className="payctrl-line"><strong>{paymentCOP(c.declared_amount_cop)} reportados</strong>
        <span>{paymentEvidenceLabels[c.evidence_status]}</span></div>
      <small>ID caso {c.id.slice(0,8)} · Reserva {c.reservation_id.slice(0,8)} · Cuenta receptora {c.bank_account_alias==="BANCOLOMBIA_PRINCIPAL"?"Bancolombia":"Nequi"}</small>
      <div className="payctrl-steps">{events.filter(e=>e.case_id===c.id).map(e=><p key={e.id}>{new Date(e.created_at).toLocaleString("es-CO")}: {e.event_type} · {e.current_status}</p>)}</div>
      <small>Confirmación bancaria: no verificada · Participaciones oficiales: 0</small>
     </article>)}</div>}
   </section>
   <div className="payctrl-footer"><Link className="btn btn-secondary" href="/admin/conciliacion">Conciliación de archivos</Link>
    <Link className="btn btn-secondary" href="/admin/seguridad">Ver condiciones de producción</Link></div>
  </>}
 </div>;
}
export default function PaymentControlPage(){return <AdminAccessGate requiredPermission="bank.read"><Workspace/></AdminAccessGate>;}
