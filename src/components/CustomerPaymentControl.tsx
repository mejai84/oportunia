"use client";
import Link from "next/link";
import {useCallback,useEffect,useMemo,useState} from "react";
import {oportuniaClient} from "@/lib/oportuniaSupabase";
import {paymentCOP,paymentEvidenceLabels,type PaymentControlCase,type PaymentControlEvent,type PaymentInboxNotice} from "@/lib/paymentControl";

export function CustomerPaymentControl(){
 const client=useMemo(()=>oportuniaClient(),[]);
 const [userId,setUserId]=useState<string|null>(null);
 const [checked,setChecked]=useState(false);
 const [cases,setCases]=useState<PaymentControlCase[]>([]);
 const [events,setEvents]=useState<PaymentControlEvent[]>([]);
 const [notices,setNotices]=useState<PaymentInboxNotice[]>([]);
 const [loading,setLoading]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");

 useEffect(()=>{
  let active=true;
  void client.auth.getUser().then(({data})=>{if(active){setUserId(data.user?.id??null);setChecked(true);}})
   .catch(()=>{if(active)setChecked(true);});
  const {data:sub}=client.auth.onAuthStateChange((_event,session)=>{
   if(active){setUserId(session?.user?.id??null);setChecked(true);}
  });
  return()=>{active=false;sub.subscription.unsubscribe();};
 },[client]);

 const refresh=useCallback(async(id:string)=>{
  const [a,b,c]=await Promise.all([
   client.from("payment_control_cases").select("*").eq("customer_user_id",id).order("created_at",{ascending:false}).limit(100),
   client.from("payment_control_case_events").select("*").order("created_at",{ascending:false}).limit(250),
   client.from("payment_notification_inbox").select("*").eq("customer_user_id",id).order("created_at",{ascending:false}).limit(100),
  ]);
  if(a.error||b.error||c.error)throw new Error("No fue posible consultar el seguimiento de tus pagos. Verifica tu sesión.");
  setCases((a.data||[]) as PaymentControlCase[]);
  setEvents((b.data||[]) as PaymentControlEvent[]);
  setNotices((c.data||[]) as PaymentInboxNotice[]);
 },[client]);

 useEffect(()=>{
  let mounted=true;
  if(!userId){setCases([]);setEvents([]);setNotices([]);setLoading(false);return;}
  setLoading(true);setError("");
  void refresh(userId).catch(e=>{if(mounted)setError(e instanceof Error?e.message:"Error leyendo seguimiento");})
   .finally(()=>{if(mounted)setLoading(false);});
  return()=>{mounted=false;};
 },[userId,refresh]);
 const unread=notices.filter(n=>!n.read_at).length;
 async function markRead(noticeId:string){
  if(!userId||busy)return;
  setBusy(true);setError("");
  try{
   const {error:writeError}=await client.from("payment_notification_inbox")
    .update({read_at:new Date().toISOString()}).eq("id",noticeId).eq("customer_user_id",userId).is("read_at",null);
   if(writeError)throw writeError;
   await refresh(userId);
  }catch(e){setError(e instanceof Error?e.message:"No se pudo marcar el aviso");}
  finally{setBusy(false);}
 }

 return <section className="payctrl-panel" aria-label="Mis reportes vinculados y notificaciones automáticas">
  <div className="payctrl-heading"><div><span className="overline">MI CUENTA · SEGUIMIENTO BANCARIO</span>
   <h2>Mis referencias y avisos</h2>
   <p>Historial centralizado, vinculado a tu usuario. No constituye prueba de abono ni participación de sorteo.</p></div>
   <Link className="btn btn-secondary btn-small" href="/ensayo-reservas">Ver mis ensayos</Link>
  </div>
  <div className="payctrl-note"><strong>No hay confirmación bancaria automática.</strong> Una coincidencia con un extracto cargado no demuestra que el banco recibió el pago. Oportunia no envía SMS, correos ni WhatsApp desde este módulo.</div>
  {!checked?<p className="muted">Comprobando sesión…</p>:!userId?<p className="muted">Para consultar tus reportes, <Link href="/acceso">inicia sesión</Link>.</p>:
    loading?<p className="muted">Cargando trazabilidad…</p>:<>
     {error&&<div role="alert" className="alert alert-error">{error}</div>}
     <div className="payctrl-metrics"><div><strong>{cases.length}</strong><span>Referencias declaradas</span></div>
       <div><strong>{cases.filter(c=>c.evidence_status==="file_matched").length}</strong><span>Cotejadas con archivo</span></div>
       <div><strong>0</strong><span>Abonos certificados</span></div>
       <div><strong>{unread}</strong><span>Avisos sin leer</span></div></div>
     <div className="payctrl-two">
      <div><h3>Seguimiento de mis referencias</h3>
       {cases.length===0?<p className="muted">No tienes referencias declaradas. Puedes consultar el formulario de reporte en Pagos.</p>:
        <div className="payctrl-list">{cases.map(c=><article key={c.id}>
         <div className="payctrl-line"><strong>{paymentCOP(c.declared_amount_cop)} declarados</strong><span>{paymentEvidenceLabels[c.evidence_status]}</span></div>
         <small>Cuenta receptora: {c.bank_account_alias==="BANCOLOMBIA_PRINCIPAL"?"Bancolombia":"Nequi"} · Registro {new Date(c.created_at).toLocaleDateString("es-CO")}</small>
         <div className="payctrl-steps">{events.filter(e=>e.case_id===c.id).map(e=><p key={e.id}>
           {new Date(e.created_at).toLocaleString("es-CO")} · {e.event_type==="linked"?"Referencia vinculada":e.event_type==="file_matched"?"Coincidencia en archivo":e.event_type==="rejected"?"Rechazada":"En revisión"}
         </p>)}</div>
         <small>ID de seguimiento: {c.id.slice(0,8).toUpperCase()} · Sin acreditación de pago ni números oficiales</small>
        </article>)}</div>}
      </div>
      <div><h3>Notificaciones del control de pagos</h3>
       {notices.length===0?<p className="muted">No hay notificaciones adicionales. Las alertas de reportes generales se encuentran en tu buzón habitual.</p>:
        <div className="payctrl-list">{notices.map(n=><article className={!n.read_at?"payctrl-new":""} key={n.id}>
         <div className="payctrl-line"><strong>{n.title}</strong>{!n.read_at&&<span>Nuevo</span>}</div>
         <p>{n.message}</p><small>{new Date(n.created_at).toLocaleString("es-CO")}</small>
         {!n.read_at&&<button type="button" className="btn btn-secondary btn-small" disabled={busy} onClick={()=>void markRead(n.id)}>Marcar como leído</button>}
        </article>)}</div>}
      </div>
     </div>
    </>}
 </section>;
}
