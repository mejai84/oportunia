"use client";
import Link from "next/link";
import {useCallback,useEffect,useMemo,useState,type FormEvent} from "react";
import {AdminAccessGate} from "@/components/AdminAccessGate";
import {oportuniaClient} from "@/lib/oportuniaSupabase";

type Draw={id:string;title:string;enabled:boolean};
type Settings={draw_id:string;authority_name:string;operator_name:string;
 authorization_reference:string;authorization_document_url:string;rules_url:string;
 authorized_from:string|null;authorized_until:string|null;scheme_10_40_authorized:boolean;
 sales_enabled:boolean;legal_checked_at:string|null};
type Bank={bank:string;account_holder:string;account_number:string;account_type:string;enabled:boolean};
type Group={draw_id:string;group_name:string;invite_url:string};
const empty={authority_name:"",operator_name:"",authorization_reference:"",
 authorization_document_url:"",rules_url:"",authorized_from:"",authorized_until:"",
 scheme_10_40_authorized:false,sales_enabled:false};

function OwnerCommerceSettings(){
 const client=useMemo(()=>oportuniaClient(),[]);
 const [draws,setDraws]=useState<Draw[]>([]),[drawId,setDrawId]=useState("");
 const [settings,setSettings]=useState<Settings[]>([]),[accounts,setAccounts]=useState<Bank[]>([]);
 const [groups,setGroups]=useState<Group[]>([]);
 const [form,setForm]=useState({...empty});
 const [bank,setBank]=useState<"BANCOLOMBIA"|"NEQUI">("BANCOLOMBIA");
 const [accountNumber,setAccountNumber]=useState(""),[accountHolder,setAccountHolder]=useState("");
 const [accountType,setAccountType]=useState("AHORROS"),[bankEnabled,setBankEnabled]=useState(true);
 const [groupName,setGroupName]=useState(""),[groupUrl,setGroupUrl]=useState("");
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const refresh=useCallback(async()=>{
  const [d,s,a,g]=await Promise.all([
   client.from("draw_catalog").select("id,title,enabled").eq("enabled",true).order("display_order"),
   client.from("commerce_draws").select("draw_id,authority_name,operator_name,authorization_reference,authorization_document_url,rules_url,authorized_from,authorized_until,scheme_10_40_authorized,sales_enabled,legal_checked_at"),
   client.from("commerce_payment_channels").select("bank,account_holder,account_number,account_type,enabled"),
   client.from("commerce_whatsapp_groups").select("draw_id,group_name,invite_url"),
  ]);
  if(d.error||s.error||a.error||g.error)throw Error("No se pudo leer la configuración comercial. Comprueba la migración o tus permisos.");
  setDraws((d.data||[]) as Draw[]);setSettings((s.data||[]) as Settings[]);
  setAccounts((a.data||[]) as Bank[]);setGroups((g.data||[]) as Group[]);
  setDrawId(previous=>d.data?.some(x=>x.id===previous)?previous:(d.data?.[0]?.id||""));
 },[client]);
 useEffect(()=>{void refresh().catch(e=>setError(e instanceof Error?e.message:"Error de lectura"));},[refresh]);
 useEffect(()=>{
  const selected=settings.find(x=>x.draw_id===drawId);
  setForm(selected?{
   authority_name:selected.authority_name,operator_name:selected.operator_name,
   authorization_reference:selected.authorization_reference,authorization_document_url:selected.authorization_document_url,
   rules_url:selected.rules_url,authorized_from:selected.authorized_from||"",
   authorized_until:selected.authorized_until||"",scheme_10_40_authorized:selected.scheme_10_40_authorized,
   sales_enabled:selected.sales_enabled
  }:{...empty});
  const group=groups.find(x=>x.draw_id===drawId);
  setGroupName(group?.group_name||"");setGroupUrl(group?.invite_url||"");
 },[settings,drawId,groups]);
 useEffect(()=>{
  const selected=accounts.find(a=>a.bank===bank);
  setAccountHolder(selected?.account_holder||"");setAccountNumber(selected?.account_number||"");
  setAccountType(selected?.account_type||(bank==="NEQUI"?"NEQUI":"AHORROS"));
  setBankEnabled(selected?.enabled??true);
 },[accounts,bank]);
 async function saveBank(e:FormEvent){
  e.preventDefault();if(busy)return;setBusy(true);setError("");setNotice("");
  try{
   const {error:rpcError}=await client.rpc("configure_commerce_payment_channel",{
    p_bank:bank,p_account_number:accountNumber.trim(),p_account_holder:accountHolder.trim(),
    p_account_type:accountType,p_enabled:bankEnabled,
   });
   if(rpcError)throw rpcError;
   await refresh();setNotice("Cuenta receptora guardada. Solo las cuentas habilitadas se mostrarán a los clientes.");
  }catch(e){setError(e instanceof Error?e.message:"No se pudo actualizar la cuenta.");}
  finally{setBusy(false);}
 }
 async function saveDraw(e:FormEvent){
  e.preventDefault();if(busy||!drawId)return;setBusy(true);setError("");setNotice("");
  if(form.sales_enabled&&!window.confirm(
   "¿Confirmas que la autorización, operador y reglamento oficial de esta edición son auténticos y cubren exactamente el modelo 10+40, las cuotas y la venta en línea?")){
   setBusy(false);return;
  }
  try{
   const {error:rpcError}=await client.rpc("configure_commerce_draw",{
    p_draw_id:drawId,p_authority:form.authority_name.trim(),p_operator:form.operator_name.trim(),
    p_reference:form.authorization_reference.trim(),p_document_url:form.authorization_document_url.trim(),
    p_rules_url:form.rules_url.trim(),p_from:form.authorized_from,p_until:form.authorized_until,
    p_scheme_authorized:form.scheme_10_40_authorized,p_enable:form.sales_enabled
   });
   if(rpcError)throw rpcError;
   await refresh();setNotice(form.sales_enabled?
    "Edición activada para reservas comerciales. Solo los abonos aprobados manualmente asignan números adicionales.":
    "Configuración guardada. Las nuevas reservas comerciales siguen desactivadas.");
  }catch(e){setError(e instanceof Error?e.message:"No se pudo guardar el permiso.");}
  finally{setBusy(false);}
 }
 async function saveGroup(e:FormEvent){
  e.preventDefault();if(busy||!drawId)return;setBusy(true);setError("");setNotice("");
  try{
   const {error:rpcError}=await client.rpc("set_commerce_whatsapp_group",{
    p_draw_id:drawId,p_name:groupName.trim(),p_invite_url:groupUrl.trim()
   });
   if(rpcError)throw rpcError;
   await refresh();setNotice("Enlace de grupo guardado. Solo clientes con pago total confirmado y consentimiento pueden verlo.");
  }catch(e){setError(e instanceof Error?e.message:"No fue posible guardar el grupo.");}
  finally{setBusy(false);}
 }
 return <div className="container page-space">
  <div className="page-title"><span className="overline">PROPIETARIO · VENTAS Y AUTORIZACIONES</span>
   <h1>Activación comercial de Oportunia</h1>
   <p>Registra la autorización que ya tienes, el operador autorizado, el reglamento y las cuentas receptoras. El sistema no inventará ningún dato bancario ni documento.</p>
   <Link href="/admin" className="btn btn-secondary btn-small">Volver a administración</Link></div>
  {error&&<div role="alert" className="alert alert-error">{error}</div>}
  {notice&&<div role="status" className="alert alert-success">{notice}</div>}
  <div className="two-col-layout">
   <form className="panel form-stack" onSubmit={saveBank}>
    <h2>1. Cuenta receptora de transferencias</h2>
    <label>Banco<select value={bank} onChange={e=>setBank(e.target.value as typeof bank)}>
     <option value="BANCOLOMBIA">Bancolombia</option><option value="NEQUI">Nequi</option></select></label>
    <label>Número de cuenta o celular<input required inputMode="numeric" pattern="[0-9]{7,20}" minLength={7} maxLength={20}
     value={accountNumber} onChange={e=>setAccountNumber(e.target.value.replace(/\D/g,""))}/></label>
    <label>Nombre exacto del titular<input required minLength={5} maxLength={120}
     value={accountHolder} onChange={e=>setAccountHolder(e.target.value)}/></label>
    <label>Tipo<select value={accountType} onChange={e=>setAccountType(e.target.value)}>
     {bank==="NEQUI"?<option value="NEQUI">Nequi</option>:<>
      <option value="AHORROS">Ahorros</option><option value="CORRIENTE">Corriente</option></>}
    </select></label>
    <label><input type="checkbox" checked={bankEnabled} onChange={e=>setBankEnabled(e.target.checked)}/>
     Mostrar este banco como cuenta de destino</label>
    <button type="submit" className="btn btn-primary" disabled={busy}>Guardar cuenta</button>
   </form>
   <form className="panel form-stack" onSubmit={saveDraw}>
    <h2>2. Autorización y apertura de edición</h2>
    <label>Edición<select value={drawId} onChange={e=>setDrawId(e.target.value)}>
     {draws.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select></label>
    <label>Autoridad que autorizó<input required minLength={3} value={form.authority_name}
     onChange={e=>setForm(p=>({...p,authority_name:e.target.value}))}/></label>
    <label>Operador autorizado<input required minLength={3} value={form.operator_name}
     onChange={e=>setForm(p=>({...p,operator_name:e.target.value}))}/></label>
    <label>Resolución o referencia oficial<input required minLength={5}
     value={form.authorization_reference} onChange={e=>setForm(p=>({...p,authorization_reference:e.target.value}))}/></label>
    <label>Enlace HTTPS al documento de autorización<input required type="url"
     value={form.authorization_document_url} onChange={e=>setForm(p=>({...p,authorization_document_url:e.target.value}))}/></label>
    <label>Enlace HTTPS al reglamento aprobado<input required type="url"
     value={form.rules_url} onChange={e=>setForm(p=>({...p,rules_url:e.target.value}))}/></label>
    <div className="row-actions"><label>Vigente desde<input type="date" required value={form.authorized_from}
     onChange={e=>setForm(p=>({...p,authorized_from:e.target.value}))}/></label>
     <label>Vigente hasta<input type="date" required value={form.authorized_until}
     onChange={e=>setForm(p=>({...p,authorized_until:e.target.value}))}/></label></div>
    <label><input type="checkbox" checked={form.scheme_10_40_authorized}
     onChange={e=>setForm(p=>({...p,scheme_10_40_authorized:e.target.checked}))}/>
     Confirmo que la autorización y las reglas incluyen diez números elegidos, cuarenta adicionales, planes de cuotas y el canal web.</label>
    <label><input type="checkbox" checked={form.sales_enabled}
     onChange={e=>setForm(p=>({...p,sales_enabled:e.target.checked}))}/>
     <strong>Habilitar nuevas ventas y reservas reales</strong></label>
    <p className="small muted">El apagado de ventas evita pedidos nuevos, pero conserva comprobantes pendientes y permite que tesorería revise obligaciones existentes.</p>
    <button type="submit" disabled={busy||!drawId} className="btn btn-primary">
     {form.sales_enabled?"Guardar y habilitar ventas":"Guardar autorización sin activar ventas"}</button>
   </form>
  </div>
  <form className="panel form-stack" onSubmit={saveGroup}>
   <h2>3. Grupo de WhatsApp por edición</h2>
   <p>Crea manualmente el grupo cuando comience la edición, con ingreso sujeto a aprobación. Oportunia revelará su invitación solo después del pago total confirmado y del consentimiento del cliente. No incorpora personas automáticamente.</p>
   <label>Nombre del grupo<input required minLength={3} maxLength={120} value={groupName}
    onChange={e=>setGroupName(e.target.value)}/></label>
   <label>Enlace privado de invitación<input type="url" required
    placeholder="https://chat.whatsapp.com/..."
    value={groupUrl} onChange={e=>setGroupUrl(e.target.value)}/></label>
   <button type="submit" className="btn btn-primary" disabled={busy||!drawId}>Guardar invitación privada</button>
  </form>
 </div>;
}
export default function AdminVentasPage(){
 return <AdminAccessGate requiredPermission="admin.dashboard"><OwnerCommerceSettings/></AdminAccessGate>;
}
