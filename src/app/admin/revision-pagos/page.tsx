"use client";
import Link from "next/link";
import {useCallback,useEffect,useMemo,useState,type FormEvent} from "react";
import {AdminAccessGate} from "@/components/AdminAccessGate";
import {oportuniaClient} from "@/lib/oportuniaSupabase";

type Order={id:string;draw_id:string;user_id:string;status:string;paid_cop:number;price_cop:number;
 review_due_at:string|null;created_at:string};
type Receipt={id:string;order_id:string;user_id:string;destination_bank:string;origin_channel:string;
 claimed_reference:string;amount_cop:number;receipt_path:string;status:string;created_at:string;
 reviewed_by:string|null;rejection_reason:string|null};
type Credit={id:string;order_id:string;receipt_id:string;bank:string;bank_transaction_reference:string;
 amount_cop:number;bank_credit_date:string;verified_at:string};
const money=(n:number)=>new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(n);
function ManualTreasury(){
 const client=useMemo(()=>oportuniaClient(),[]);
 const [orders,setOrders]=useState<Order[]>([]),[receipts,setReceipts]=useState<Receipt[]>([]);
 const [credits,setCredits]=useState<Credit[]>([]);
 const [selected,setSelected]=useState("");
 const [bankReference,setBankReference]=useState(""),[bankDate,setBankDate]=useState("");
 const [note,setNote]=useState(""),[decision,setDecision]=useState<"approve"|"reject">("approve");
 const [filter,setFilter]=useState("pending");
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 const refresh=useCallback(async()=>{
  const [o,r,c]=await Promise.all([
   client.from("commerce_orders").select("id,draw_id,user_id,status,paid_cop,price_cop,review_due_at,created_at")
    .order("created_at",{ascending:false}).limit(500),
   client.from("commerce_receipts").select("id,order_id,user_id,destination_bank,origin_channel,claimed_reference,amount_cop,receipt_path,status,created_at,reviewed_by,rejection_reason")
    .order("created_at",{ascending:false}).limit(500),
   client.from("commerce_confirmed_credits").select("id,order_id,receipt_id,bank,bank_transaction_reference,amount_cop,bank_credit_date,verified_at")
    .order("verified_at",{ascending:false}).limit(250),
  ]);
  if(o.error||r.error||c.error)throw Error("Error consultando tesorería: revisa el permiso bank.write y las migraciones.");
  setOrders((o.data||[]) as Order[]);setReceipts((r.data||[]) as Receipt[]);
  setCredits((c.data||[]) as Credit[]);
 },[client]);
 useEffect(()=>{let live=true;
  void refresh().catch(e=>{if(live)setError(e instanceof Error?e.message:"Error de lectura");})
   .finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;};
 },[refresh]);
 const current=receipts.find(x=>x.id===selected);
 const overdue=receipts.filter(x=>x.status==="pending"&&
  orders.some(o=>o.id===x.order_id&&o.review_due_at&&new Date(o.review_due_at).getTime()<Date.now())).length;
 async function viewReceipt(path:string){
  setError("");
  const {data,error:signError}=await client.storage.from("oportunia-receipts").createSignedUrl(path,60);
  if(signError||!data?.signedUrl){setError("No se pudo abrir el comprobante privado.");return;}
  window.open(data.signedUrl,"_blank","noopener,noreferrer");
 }
 async function submit(e:FormEvent){
  e.preventDefault();if(!current||busy)return;
  const approve=decision==="approve";
  if(!window.confirm(approve?
    "¿CONFIRMAS que revisaste directamente la cuenta receptora y viste un abono REAL único con este valor y referencia? Un error asignará números.":
    "¿Confirmas que NO existe un abono válido y deseas rechazar el comprobante?"))return;
  setBusy(true);setError("");setNotice("");
  try{
   const {data,error:rpcError}=await client.rpc("review_commerce_receipt",{
    p_receipt_id:current.id,p_approve:approve,
    p_bank_transaction_reference:approve?bankReference.trim():null,
    p_bank_credit_date:approve?bankDate:null,p_note:note.trim(),
   });
   if(rpcError)throw rpcError;
   await refresh();setSelected("");setNote("");setBankReference("");setBankDate("");
   setNotice(approve?
    "Ingreso confirmado manualmente. El saldo y los números adicionales se actualizaron dentro de la misma transacción.":
    "Comprobante rechazado. El cliente tendrá seis horas para corregirlo si no tenía abonos previos.");
   if(data?.order_status==="paid")setNotice("Pago completo confirmado manualmente. Los 50 números quedaron asignados; el cliente podrá optar por recibir la invitación a WhatsApp.");
  }catch(e){setError(e instanceof Error?e.message:"No se pudo registrar la revisión.");}
  finally{setBusy(false);}
 }
 const visible=receipts.filter(r=>filter==="all"||r.status===filter);
 return <div className="container page-space">
  <div className="page-title"><span className="overline">TESORERÍA · CONTROL MANUAL</span>
   <h1>Verificar pagos por transferencia</h1>
   <p>La presencia del comprobante solo protege la reserva. Antes de aprobar, consulta el ingreso real en la cuenta bancaria de destino. No existe conexión automática con Bancolombia ni Nequi.</p>
   <Link href="/admin" className="btn btn-secondary btn-small">Volver a administración</Link>
  </div>
  {error&&<p className="alert alert-error" role="alert">{error}</p>}
  {notice&&<p className="alert alert-success" role="status">{notice}</p>}
  <div className="info-grid three">
   <div className="info-tile"><span>Por revisar</span><strong>{receipts.filter(r=>r.status==="pending").length}</strong></div>
   <div className="info-tile"><span>Revisión retrasada (más de 72 h)</span><strong>{overdue}</strong></div>
   <div className="info-tile"><span>Abonos confirmados manualmente</span><strong>{money(credits.reduce((s,c)=>s+c.amount_cop,0))}</strong></div>
  </div>
  <section className="panel">
   <div className="panel-heading"><h2>Cola de comprobantes</h2>
    <div className="row-actions"><label>Estado<select value={filter} onChange={e=>setFilter(e.target.value)}>
     <option value="pending">Pendientes</option><option value="approved">Aprobados</option>
     <option value="rejected">Rechazados</option><option value="all">Todos</option>
    </select></label><button type="button" className="btn btn-secondary btn-small" onClick={()=>void refresh().catch(e=>setError(e instanceof Error?e.message:"Error"))}>Actualizar</button></div></div>
   {loading?<p>Consultando…</p>:visible.length===0?<p>No hay comprobantes con ese estado.</p>:
   <div className="stack">{visible.map(rc=>{
    const o=orders.find(x=>x.id===rc.order_id);
    const isLate=rc.status==="pending"&&o?.review_due_at&&new Date(o.review_due_at).getTime()<Date.now();
    return <article className="account-card" key={rc.id}>
     <div className="panel-heading"><strong>{rc.destination_bank} · {money(rc.amount_cop)}</strong>
      <span className="tag">{rc.status==="pending"?(isLate?"URGENTE · VENCIMIENTO DE REVISIÓN":"PENDIENTE"):rc.status==="approved"?"APROBADO MANUALMENTE":"RECHAZADO"}</span></div>
     <p>Ref. cliente: <strong>{rc.claimed_reference}</strong> · Origen {rc.origin_channel}
      {" "}· Pedido {rc.order_id.slice(0,8).toUpperCase()} · Usuario {rc.user_id.slice(0,8)}…</p>
     <p className="muted">Enviado {new Date(rc.created_at).toLocaleString("es-CO")}
      {" "}· Pedido {o?.status||"—"} · Abonado confirmado {money(o?.paid_cop||0)}</p>
     {isLate&&<p className="alert alert-warning">Revisión fuera del plazo objetivo. Los números continúan protegidos hasta que se tome una decisión.</p>}
     <div className="row-actions">
      <button className="btn btn-secondary btn-small" type="button"
       onClick={()=>void viewReceipt(rc.receipt_path)}>Abrir comprobante privado</button>
      {rc.status==="pending"&&<button type="button" className="btn btn-primary btn-small"
       onClick={()=>{setSelected(rc.id);setDecision("approve");setBankReference("");setNote("");setBankDate("");}}>
       Revisar ingreso bancario</button>}
     </div>
    </article>;
   })}</div>}
  </section>
  {current&&<section className="panel">
   <h2>Decisión de tesorería</h2>
   <p>Cliente: {current.user_id.slice(0,8)}… · Destino: {current.destination_bank} · Valor reclamado {money(current.amount_cop)}.</p>
   <p>Comprueba en el banco receptor el nombre de la cuenta, importe, fecha, naturaleza del abono y referencia única. Una imagen no prueba que se recibió dinero.</p>
   <form className="form-stack" onSubmit={submit}>
    <label>Decisión<select value={decision} onChange={e=>setDecision(e.target.value as typeof decision)}>
     <option value="approve">Confirmar que el dinero ingresó</option><option value="reject">Rechazar el comprobante</option></select></label>
    {decision==="approve"&&<>
     <label>Identificador único del movimiento visto en el banco<input required minLength={4} maxLength={100}
      value={bankReference} onChange={e=>setBankReference(e.target.value.toUpperCase().replace(/[^A-Z0-9._/-]/g,""))}/></label>
     <label>Fecha real del abono<input required type="date" max={new Date().toISOString().slice(0,10)}
      value={bankDate} onChange={e=>setBankDate(e.target.value)}/></label>
    </>}
    <label>{decision==="approve"?"Observaciones de la comprobación bancaria (mínimo 20 caracteres)":"Motivo del rechazo (mínimo 12 caracteres)"}
     <textarea required rows={3} minLength={decision==="approve"?20:12} maxLength={decision==="approve"?1000:500}
      value={note} onChange={e=>setNote(e.target.value)}/></label>
    <div className="row-actions"><button type="submit" disabled={busy} className="btn btn-primary">
     {busy?"Procesando…":decision==="approve"?"Confirmar abono y asignar números":"Rechazar y avisar estado"}</button>
     <button type="button" className="btn btn-secondary" onClick={()=>setSelected("")}>Cancelar revisión</button></div>
   </form>
  </section>}
  <section className="panel">
   <h2>Control contable</h2>
   <p>Los créditos de esta sección han sido confirmados manualmente por una persona con permisos de tesorería. No son verificaciones automáticas de los bancos.</p>
   <p>{credits.length} movimiento(s) confirmados · cada identificador bancario puede acreditarse una sola vez.</p>
   {receipts.length>=500&&<p>Se muestran los últimos 500 comprobantes. Usa los informes para revisar períodos anteriores.</p>}
  </section>
 </div>;
}
export default function ManualPaymentsPage(){
 return <AdminAccessGate requiredPermission="bank.write"><ManualTreasury/></AdminAccessGate>;
}
