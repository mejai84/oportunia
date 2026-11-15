"use client";
import Link from "next/link";
import {useCallback,useEffect,useMemo,useState,type FormEvent} from "react";
import {oportuniaClient} from "@/lib/oportuniaSupabase";
import {displayPreviewNumber,parsePreviewNumber} from "@/lib/previewReservations";

type Draw={draw_id:string;authority_name:string;operator_name:string;authorization_reference:string;
 authorization_document_url:string;rules_url:string;sales_enabled:boolean;authorized_from:string|null;
 authorized_until:string|null;price_cop:number;max_orders:number};
type Order={id:string;draw_id:string;user_id:string;selection_mode:string;payment_plan:string;
 paid_cop:number;price_cop:number;status:string;expires_at:string;review_due_at:string|null;created_at:string};
type Num={order_id:string;number:number;category:string};
type Receipt={id:string;order_id:string;destination_bank:string;claimed_reference:string;amount_cop:number;
 status:string;created_at:string;rejection_reason:string|null};
type Bank={bank:string;account_number:string;account_holder:string;account_type:string;enabled:boolean};
type GroupConsent={order_id:string;consented_at:string|null;revoked_at:string|null};
type Group={draw_id:string;group_name:string;invite_url:string};
const money=(n:number)=>new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(n);
const plans=[{value:"contado",label:"Un pago de $50.000"},{value:"dos-cuotas",label:"Dos pagos de $25.000"},{value:"tres-cuotas",label:"Tres pagos: $20.000 + $15.000 + $15.000"}];
function nextAmount(o:Order):number {
 if(o.status==="paid")return 0;
 if(o.payment_plan==="contado")return o.paid_cop===0?50000:0;
 if(o.payment_plan==="dos-cuotas")return [0,25000].includes(o.paid_cop)?25000:0;
 return o.paid_cop===0?20000:[20000,35000].includes(o.paid_cop)?15000:0;
}
const customerStatus:Record<string,string>={
 reserved:"Reservada · pendiente de comprobante",
 proof_pending:"Comprobante recibido · pendiente de verificación manual (números protegidos)",
 part_paid:"Abono confirmado · números bloqueados hasta completar",
 paid:"Pago completo confirmado manualmente · consulta las condiciones de participación",
 expired:"Reserva vencida · números liberados",
 cancelled:"Reserva cancelada"
};

export function CommerceCustomer({accountOnly=false}:{accountOnly?:boolean}){
 const client=useMemo(()=>oportuniaClient(),[]);
 const [userId,setUserId]=useState<string|null>(null),[checked,setChecked]=useState(false);
 const [draws,setDraws]=useState<Draw[]>([]),[drawId,setDrawId]=useState("");
 const [titles,setTitles]=useState<Record<string,string>>({});
 const [banks,setBanks]=useState<Bank[]>([]),[orders,setOrders]=useState<Order[]>([]);
 const [numbers,setNumbers]=useState<Num[]>([]),[receipts,setReceipts]=useState<Receipt[]>([]);
 const [consents,setConsents]=useState<GroupConsent[]>([]),[groups,setGroups]=useState<Group[]>([]);
 const [taken,setTaken]=useState<Set<number>>(new Set());
 const [chosen,setChosen]=useState<number[]>([]),[mode,setMode]=useState<"manual"|"automatic">("manual");
 const [plan,setPlan]=useState("contado"),[entry,setEntry]=useState(""),[page,setPage]=useState(0);
 const [terms,setTerms]=useState(false);
 const [paymentOrder,setPaymentOrder]=useState("");
 const [bank,setBank]=useState(""),[origin,setOrigin]=useState("NEQUI");
 const [reference,setReference]=useState(""),[receiptFile,setReceiptFile]=useState<File|null>(null);
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(false);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");

 useEffect(()=>{
  let live=true;
  void client.auth.getUser().then(({data})=>{if(live){setUserId(data.user?.id??null);setChecked(true);}})
    .catch(()=>{if(live)setChecked(true);});
  const {data:sub}=client.auth.onAuthStateChange((_e,s)=>{
   if(live){setUserId(s?.user?.id??null);setChecked(true);}
  });
  return()=>{live=false;sub.subscription.unsubscribe();};
 },[client]);

 const refresh=useCallback(async(u:string)=>{
  const [d,t,b,o,n,rc,c,g]=await Promise.all([
   client.from("commerce_draws").select("draw_id,authority_name,operator_name,authorization_reference,authorization_document_url,rules_url,sales_enabled,authorized_from,authorized_until,price_cop,max_orders"),
   client.from("draw_catalog").select("id,title").eq("enabled",true),
   client.from("commerce_payment_channels").select("bank,account_number,account_holder,account_type,enabled").eq("enabled",true),
   client.from("commerce_orders").select("id,draw_id,user_id,selection_mode,payment_plan,paid_cop,price_cop,status,expires_at,review_due_at,created_at").eq("user_id",u).order("created_at",{ascending:false}).limit(40),
   client.from("commerce_numbers").select("order_id,number,category").limit(2000),
   client.from("commerce_receipts").select("id,order_id,destination_bank,claimed_reference,amount_cop,status,created_at,rejection_reason").eq("user_id",u).order("created_at",{ascending:false}).limit(80),
   client.from("commerce_group_consent").select("order_id,consented_at,revoked_at").eq("user_id",u),
   client.from("commerce_whatsapp_groups").select("draw_id,group_name,invite_url"),
  ]);
  const results=[d,t,b,o,n,rc,c,g];
  if(results.some(x=>x.error))throw new Error("No fue posible consultar tu historial comercial. Comprueba tu sesión y la conexión.");
  const list=(d.data||[]) as Draw[];
  setDraws(list);setDrawId(prev=>list.some(x=>x.draw_id===prev)?prev:(list.find(x=>x.sales_enabled)?.draw_id||list[0]?.draw_id||""));
  setTitles(Object.fromEntries((t.data||[]).map(x=>[x.id,x.title])));
  setBanks((b.data||[]) as Bank[]);
  setOrders((o.data||[]) as Order[]);
  setNumbers((n.data||[]) as Num[]);
  setReceipts((rc.data||[]) as Receipt[]);
  setConsents((c.data||[]) as GroupConsent[]);
  setGroups((g.data||[]) as Group[]);
 },[client]);
 const loadTaken=useCallback(async(id:string)=>{
  const {data,error:rpcError}=await client.rpc("get_commerce_taken_numbers",{p_draw_id:id});
  if(rpcError)throw new Error("No fue posible consultar la disponibilidad. Confirma que esta edición tenga ventas autorizadas.");
  if(!Array.isArray(data))throw new Error("Respuesta de disponibilidad inválida.");
  setTaken(new Set(data as number[]));
 },[client]);

 useEffect(()=>{
  let live=true;
  if(!userId){setOrders([]);setNumbers([]);setReceipts([]);setLoading(false);return;}
  setLoading(true);setError("");
  void refresh(userId).catch(e=>{if(live)setError(e instanceof Error?e.message:"Error de carga");})
   .finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;};
 },[userId,refresh]);
 const activeDraw=draws.find(d=>d.draw_id===drawId);
 const live=!!activeDraw?.sales_enabled && !!activeDraw.authorized_from &&
 !!activeDraw.authorized_until && new Date().toISOString().slice(0,10)>=activeDraw.authorized_from
 && new Date().toISOString().slice(0,10)<=activeDraw.authorized_until;
 useEffect(()=>{
  let active=true;
  if(!userId||!drawId||!live){setTaken(new Set());return;}
  void loadTaken(drawId).catch(e=>{if(active)setError(e instanceof Error?e.message:"Error de números");});
  return()=>{active=false;};
 },[userId,drawId,live,loadTaken]);

 const current=orders.find(o=>o.draw_id===drawId &&
 (["reserved","proof_pending","part_paid"].includes(o.status)) &&
 !(o.status==="reserved" && new Date(o.expires_at).getTime()<=Date.now()));
 const validBanks=banks.filter(x=>x.enabled);
 const reviewPending=orders.some(o=>o.status==="proof_pending");

 function addNumber(s:string){
  const n=parsePreviewNumber(s);
  if(n===null){setError("Ingresa un número válido de 0000 a 9999.");return;}
  if(taken.has(n)){setError("Número ocupado en el inventario central.");return;}
  if(chosen.includes(n)){setError("Ese número ya fue elegido.");return;}
  if(chosen.length>=10){setError("Ya escogiste diez números.");return;}
  setError("");setChosen(prev=>[...prev,n]);setEntry("");
 }
 async function reserve(e:FormEvent){
  e.preventDefault();if(!userId||busy||!drawId)return;
  if(current){setError("Ya tienes una selección activa en esta edición.");return;}
  if(mode==="manual"&&chosen.length!==10){setError("Selecciona exactamente diez números.");return;}
  setBusy(true);setError("");setNotice("");
  try{
   const {data,error:rpcError}=await client.rpc("create_commerce_order",{
    p_draw_id:drawId,p_mode:mode,p_numbers:mode==="manual"?chosen:[],
    p_plan:plan,p_accept_terms:terms,
   });
   if(rpcError)throw rpcError;
   await Promise.all([refresh(userId),loadTaken(drawId)]);
   setChosen([]);setTerms(false);setPaymentOrder(String(data));
   setNotice("Tus números quedaron bloqueados por 24 horas. Envía el comprobante antes del vencimiento.");
  }catch(e){setError(e instanceof Error?e.message:"No se pudo reservar.");
   await loadTaken(drawId).catch(()=>undefined);}
  finally{setBusy(false);}
 }
 async function cancel(id:string){
  if(!userId||busy||!window.confirm("¿Liberar los diez números de esta reserva sin comprobante?"))return;
  setBusy(true);setError("");
  try{
   const {error:rpcError}=await client.rpc("cancel_commerce_order",{p_order_id:id});
   if(rpcError)throw rpcError;
   await Promise.all([refresh(userId),loadTaken(drawId)]);
   setNotice("Reserva cancelada y números liberados.");
  }catch(e){setError(e instanceof Error?e.message:"No fue posible cancelar.");}
  finally{setBusy(false);}
 }
 async function uploadReceipt(e:FormEvent){
  e.preventDefault();if(!userId||busy||!paymentOrder||!receiptFile)return;
  const order=orders.find(x=>x.id===paymentOrder);
  if(!order)return;
  const accepted=["image/jpeg","image/png","image/webp","application/pdf"];
  if(!accepted.includes(receiptFile.type)||receiptFile.size>5242880){
   setError("Adjunta JPG, PNG, WebP o PDF de máximo 5 MB.");return;}
  const expected=nextAmount(order);if(!expected){setError("No hay una cuota pendiente en este pedido.");return;}
  setBusy(true);setError("");setNotice("");
  try{
   const ext=receiptFile.type==="application/pdf"?"pdf":receiptFile.type==="image/png"?"png":receiptFile.type==="image/webp"?"webp":"jpg";
   const filename=userId+"/"+order.id+"/"+crypto.randomUUID()+"."+ext;
   const {error:uploadError}=await client.storage.from("oportunia-receipts").upload(filename,receiptFile,
    {contentType:receiptFile.type,upsert:false});
   if(uploadError)throw uploadError;
   const {error:reportError}=await client.rpc("submit_commerce_receipt",{
    p_order_id:order.id,p_destination_bank:bank,p_origin_channel:origin,
    p_reference:reference.trim(),p_amount_cop:expected,p_receipt_path:filename,
   });
   if(reportError)throw reportError;
   await refresh(userId);setReceiptFile(null);setReference("");setPaymentOrder("");
   setNotice("Comprobante recibido. Tus números están PROTEGIDOS hasta que tesorería lo revise. Esto aún no confirma el pago.");
  }catch(e){setError(e instanceof Error?e.message:"No se pudo enviar el comprobante.");}
  finally{setBusy(false);}
 }
 async function consent(id:string,accept:boolean){
  if(!userId||busy)return;setBusy(true);setError("");
  try{
   const {error:rpcError}=await client.rpc("set_commerce_whatsapp_consent",{p_order_id:id,p_accept:accept});
   if(rpcError)throw rpcError;await refresh(userId);
   setNotice(accept?"Puedes consultar la invitación privada al grupo de tu edición.":"Se retiró el consentimiento de WhatsApp.");
  }catch(e){setError(e instanceof Error?e.message:"No se pudo guardar el consentimiento.");}
  finally{setBusy(false);}
 }
 const waiting=orders.filter(o=>o.status==="proof_pending").length;

 return <section className="commerce-customer">
  {!checked?<p role="status">Comprobando tu sesión…</p>:!userId?
   <div className="panel"><h2>Inicia sesión para elegir números y enviar comprobantes</h2>
    <p>La reserva y su comprobante quedarán asociados a tu cuenta.</p>
    <Link href="/acceso" className="btn btn-primary">Entrar o crear una cuenta</Link></div>:
  <>
   {error&&<p className="alert alert-error" role="alert">{error}</p>}
   {notice&&<p className="alert alert-success" role="status">{notice}</p>}
   {loading&&<p role="status">Consultando inventario y tus pedidos…</p>}
   {!accountOnly&&<section className="panel">
    <h2>Elegir y reservar números</h2>
    {draws.length===0?<p className="alert alert-warning">No hay ediciones comerciales configuradas. Administración debe cargar la autorización y publicar las cuentas receptoras.</p>:<>
     <label>Edición<select value={drawId} onChange={e=>{setDrawId(e.target.value);setChosen([]);setPage(0);}}>
      {draws.map(d=><option key={d.draw_id} value={d.draw_id}>{titles[d.draw_id]||d.draw_id}</option>)}
     </select></label>
     {!live?<p className="alert alert-warning">La venta de esta edición aún no está habilitada o su autorización no está vigente. No envíes dinero.</p>:
     <form className="form-stack" onSubmit={reserve}>
      <p>Valor de la oportunidad: <strong>{money(activeDraw?.price_cop||50000)}</strong> · 10 números iniciales y hasta 40 adicionales según pagos confirmados. Solo participa con el 100 % confirmado.</p>
      {current?<p className="alert alert-warning">Ya tienes una reserva o pago parcial vigente en esta edición. Consulta el estado más abajo.</p>:<>
      <div className="row-actions">
       <label><input type="radio" checked={mode==="manual"} onChange={()=>setMode("manual")}/> Yo elijo los diez</label>
       <label><input type="radio" checked={mode==="automatic"} onChange={()=>setMode("automatic")}/> Diez automáticos</label>
      </div>
      {mode==="manual"&&<>
       <div className="row-actions"><input aria-label="Número de cuatro cifras" inputMode="numeric" maxLength={4}
        value={entry} onChange={e=>setEntry(e.target.value.replace(/\D/g,""))} placeholder="0007"/>
        <button className="btn btn-secondary btn-small" type="button" onClick={()=>addNumber(entry)}>Agregar</button>
        <strong>{chosen.length}/10</strong></div>
       <div className="number-grid">{Array.from({length:100},(_,i)=>page*100+i).map(n=>
        <button key={n} type="button" disabled={taken.has(n)||!!current||busy}
         className={"number-cell"+(chosen.includes(n)?" chosen":"")+(taken.has(n)?" busy":"")}
         aria-pressed={chosen.includes(n)}
         onClick={()=>chosen.includes(n)?setChosen(c=>c.filter(x=>x!==n)):addNumber(String(n))}>
         {displayPreviewNumber(n)}</button>)}</div>
       <div className="row-actions"><button type="button" className="btn btn-secondary btn-small"
        disabled={page===0} onClick={()=>setPage(p=>p-1)}>Anterior</button>
        <span>Página {page+1} / 100</span>
        <button type="button" className="btn btn-secondary btn-small" disabled={page===99}
         onClick={()=>setPage(p=>p+1)}>Siguiente</button>
        <button type="button" className="btn btn-ghost btn-small" onClick={()=>void loadTaken(drawId)}>Actualizar disponibilidad</button></div>
       <div className="chips">{chosen.map(n=><button type="button" className="chip" key={n}
        onClick={()=>setChosen(c=>c.filter(x=>x!==n))}>{displayPreviewNumber(n)} ×</button>)}</div>
      </>}
      <label>Forma de pago<select value={plan} onChange={e=>setPlan(e.target.value)}>
       {plans.map(p=><option value={p.value} key={p.value}>{p.label}</option>)}</select></label>
      <label><input type="checkbox" required checked={terms} onChange={e=>setTerms(e.target.checked)}/>
       Acepto el reglamento publicado, el tratamiento de los datos necesarios y las condiciones de reserva.</label>
      <p>Consulta el <a href={activeDraw?.rules_url} target="_blank" rel="noopener noreferrer">reglamento oficial de esta edición</a>
       {" "}y la <a href={activeDraw?.authorization_document_url} target="_blank" rel="noopener noreferrer">autorización registrada</a>.</p>
      <button className="btn btn-primary" type="submit"
       disabled={busy||(mode==="manual"&&chosen.length!==10)||!terms}>Reservar números por 24 horas</button>
      </>}
     </form>}
    </>}
   </section>}
   <section className="panel">
    <h2>Mis reservas y pagos</h2>
    <p>Sin comprobante: 24 horas. Con comprobante: los números quedan protegidos durante toda la revisión manual; plazo objetivo de revisión: 72 horas, incluso si el trámite tarda más.</p>
    {waiting>0&&<p className="alert alert-warning">{waiting} comprobante(s) pendiente(s) de revisión. No se puede duplicar la reserva ni usar esos números en otra cuenta.</p>}
    {orders.length===0?<p>Aún no tienes pedidos comerciales.</p>:<div className="stack">
     {orders.map(o=>{
      const expired=o.status==="reserved"&&new Date(o.expires_at).getTime()<=Date.now();
      const effective=expired?"expired":o.status;
      const ownNumbers=numbers.filter(n=>n.order_id===o.id).sort((a,b)=>a.number-b.number);
      const ownReceipts=receipts.filter(x=>x.order_id===o.id);
      const next=nextAmount(o);
      const group=groups.find(x=>x.draw_id===o.draw_id);
      const opted=consents.some(x=>x.order_id===o.id&&x.consented_at&&!x.revoked_at);
      return <article className="account-card" key={o.id}>
       <div className="panel-heading"><div><strong>{titles[o.draw_id]||o.draw_id}</strong>
        <p className="small muted">Pedido {o.id.slice(0,8).toUpperCase()}</p></div>
        <span className="tag">{customerStatus[effective]||effective}</span></div>
       <div className="info-grid three">
        <div className="info-tile"><span>Valor</span><strong>{money(o.price_cop)}</strong></div>
        <div className="info-tile"><span>Abonos confirmados</span><strong>{money(o.paid_cop)}</strong></div>
        <div className="info-tile"><span>Números</span><strong>{ownNumbers.length} / 50</strong></div>
       </div>
       {effective==="reserved"&&<p>Reserva sin comprobante hasta {new Date(o.expires_at).toLocaleString("es-CO")}.</p>}
       {effective==="proof_pending"&&<p className="alert alert-warning">Comprobante recibido; tus números no se liberarán por vencimiento mientras tesorería decide. Fecha objetivo de revisión: {o.review_due_at?new Date(o.review_due_at).toLocaleString("es-CO"):"Pendiente"}.</p>}
       {effective==="part_paid"&&<p>Los números ya asignados permanecen bloqueados. Falta confirmar el saldo.</p>}
       {effective==="paid"&&<p className="alert alert-success">Pago total confirmado por tesorería mediante revisión bancaria manual. Conserva tu comprobante; la validación de la participación y el sorteo se sujetan al reglamento y al operador autorizado.</p>}
       <div className="chips">{ownNumbers.map(n=><span className="chip" key={n.number}
        title={n.category==="extra"?"Asignado tras abono confirmado":"Número inicial"}>
        {displayPreviewNumber(n.number)}</span>)}</div>
       {ownReceipts.map(rc=><p className="small muted" key={rc.id}>Comprobante {rc.claimed_reference} · {money(rc.amount_cop)} · {rc.status==="approved"?"Confirmado manualmente":rc.status==="rejected"?"Rechazado":"En revisión"}{rc.rejection_reason?" · "+rc.rejection_reason:""}</p>)}
       {["reserved","part_paid"].includes(effective)&&next>0&&<button type="button"
        className="btn btn-primary btn-small" onClick={()=>{setPaymentOrder(o.id);setBank(validBanks[0]?.bank||"");}}>
        Enviar comprobante de {money(next)}</button>}
       {effective==="reserved"&&<button type="button" disabled={busy}
        className="btn btn-ghost btn-small" onClick={()=>void cancel(o.id)}>Cancelar reserva</button>}
       {effective==="paid"&&<div className="panel">
        <h3>Grupo privado de WhatsApp</h3>
        <p>El acceso es opcional. Los demás integrantes podrán ver tu número y nombre de WhatsApp.</p>
        {!opted?<button type="button" disabled={busy} className="btn btn-secondary btn-small"
         onClick={()=>void consent(o.id,true)}>Acepto participar y quiero el enlace del grupo</button>:
         <><p>Consentimiento registrado.</p>{group?
          <a className="btn btn-primary btn-small" href={group.invite_url} target="_blank" rel="noopener noreferrer">
           Entrar en {group.group_name}</a>:
          <p>El equipo aún no ha publicado una invitación para esta edición.</p>}
          <button type="button" className="btn btn-ghost btn-small" disabled={busy}
           onClick={()=>void consent(o.id,false)}>Retirar mi consentimiento</button></>}
       </div>}
      </article>;
     })}</div>}
   </section>
   {paymentOrder&&<section className="panel" id="reportar-pago">
    <h2>Enviar comprobante · verificación manual</h2>
    <p>Pedido {paymentOrder.slice(0,8).toUpperCase()} · cuota {money(nextAmount(orders.find(o=>o.id===paymentOrder)!))}.</p>
    {validBanks.length===0?<p className="alert alert-warning">No hay cuentas receptoras publicadas por administración. No envíes dinero a cuentas no verificadas en Oportunia.</p>:
    <form className="form-stack" onSubmit={uploadReceipt}>
     <label>Cuenta receptora<select required value={bank} onChange={e=>setBank(e.target.value)}>
      <option value="">Selecciona banco</option>
      {validBanks.map(x=><option value={x.bank} key={x.bank}>{x.bank} · {x.account_number}</option>)}</select></label>
     {validBanks.filter(x=>x.bank===bank).map(x=><div className="alert alert-warning" key={x.bank}>
      <strong>{x.bank}</strong> · {x.account_type} · {x.account_number} · Titular: {x.account_holder}.
      Verifica estos datos antes de transferir.</div>)}
     <label>Envié desde<select value={origin} onChange={e=>setOrigin(e.target.value)}>
      {["NEQUI","BANCOLOMBIA","BRE-B","DAVIPLATA","OTRO"].map(x=><option value={x} key={x}>{x}</option>)}
     </select></label>
     <label>Referencia de la transferencia<input required minLength={4} maxLength={100}
      value={reference} onChange={e=>setReference(e.target.value.toUpperCase().replace(/[^A-Z0-9._/-]/g,""))}/></label>
     <label>Comprobante JPG, PNG, WebP o PDF (máximo 5 MB)<input type="file" required
      accept="image/jpeg,image/png,image/webp,application/pdf"
      onChange={e=>setReceiptFile(e.target.files?.[0]||null)}/></label>
     <p>Al enviarlo, los números quedarán bloqueados hasta la revisión humana. <strong>No se confirmará el pago automáticamente.</strong></p>
     <div className="row-actions"><button type="submit" disabled={busy||!bank||!receiptFile}
      className="btn btn-primary">{busy?"Enviando…":"Enviar y proteger mis números"}</button>
      <button type="button" className="btn btn-secondary" onClick={()=>setPaymentOrder("")}>Cerrar</button></div>
    </form>}
   </section>}
  </>}
 </section>;
}
