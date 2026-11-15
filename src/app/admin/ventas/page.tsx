"use client";
import Link from "next/link";
import {useCallback,useEffect,useMemo,useState,type FormEvent} from "react";
import {AdminAccessGate} from "@/components/AdminAccessGate";
import {oportuniaClient} from "@/lib/oportuniaSupabase";
import {CountryRequestsAdmin} from "@/components/CountryRequestsAdmin";

type Draw={id:string;title:string;enabled:boolean};
type Settings={draw_id:string;country_code:string;legal_mode:"permit_required"|"no_permit_required";legal_basis:string;legal_basis_url:string;
 authority_name:string;operator_name:string;
 authorization_reference:string;authorization_document_url:string;rules_url:string;
 authorized_from:string|null;authorized_until:string|null;scheme_10_40_authorized:boolean;
 sales_enabled:boolean;legal_checked_at:string|null};
type Bank={bank:string;account_holder:string;account_number:string;account_type:string;enabled:boolean};
type Group={draw_id:string;group_name:string;invite_url:string};
const empty={country_code:"CO",legal_mode:"permit_required",legal_basis:"",legal_basis_url:"",
 authority_name:"",operator_name:"",authorization_reference:"",
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
   client.from("commerce_draws").select("draw_id,country_code,legal_mode,legal_basis,legal_basis_url,authority_name,operator_name,authorization_reference,authorization_document_url,rules_url,authorized_from,authorized_until,scheme_10_40_authorized,sales_enabled,legal_checked_at"),
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
   country_code:selected.country_code,legal_mode:selected.legal_mode,
   legal_basis:selected.legal_basis,legal_basis_url:selected.legal_basis_url,
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
   "¿Confirmas que revisaste las leyes aplicables al país de esta edición y que el reglamento, el modelo 10+40, las cuotas y la venta web están permitidos? Esta declaración queda auditada.")){
   setBusy(false);return;
  }
  try{
   const {error:rpcError}=await client.rpc("configure_commerce_draw_v2",{
    p_draw_id:drawId,p_country_code:form.country_code.trim().toUpperCase(),p_legal_mode:form.legal_mode,
    p_legal_basis:form.legal_basis.trim(),p_legal_basis_url:form.legal_basis_url.trim(),
    p_authority:form.authority_name.trim(),p_operator:form.operator_name.trim(),
    p_reference:form.authorization_reference.trim(),p_document_url:form.authorization_document_url.trim(),
    p_rules_url:form.rules_url.trim(),p_from:form.authorized_from,p_until:form.authorized_until,
    p_scheme_legal:form.scheme_10_40_authorized,p_enable:form.sales_enabled
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
   <p>Configura cada edición para un país y elige entre permiso obligatorio o ausencia documentada de permiso específico. Ningún país se considera exento automáticamente. Se mantienen los cobros en COP a Bancolombia o Nequi.</p>
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
    <h2>2. País, requisitos legales y apertura</h2>
    <label>Edición<select value={drawId} onChange={e=>setDrawId(e.target.value)}>
     {draws.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select></label>
    <label>País donde se permite participar (código ISO de dos letras)
     <input required maxLength={2} pattern="[A-Z]{2}" value={form.country_code}
      onChange={e=>setForm(p=>({...p,country_code:e.target.value.toUpperCase().replace(/[^A-Z]/g,""),legal_mode:e.target.value.toUpperCase()==="CO"?"permit_required":p.legal_mode}))}
      placeholder="CO"/></label>
    <p className="small muted">Ejemplo: CO = Colombia. Define un país por edición. La ausencia de permiso nunca se determina automáticamente. No podrás cambiar el país o el régimen después de que existan pedidos.</p>
    <label>Modalidad legal de esta edición
     <select value={form.legal_mode} onChange={e=>setForm(p=>({...p,legal_mode:e.target.value}))}>
      <option value="permit_required">Autorización requerida — registrar permiso</option>
      <option value="no_permit_required" disabled={form.country_code==="CO"}>No requiere autorización específica — documentar fundamento legal</option>
     </select>
    </label>
    {form.country_code==="CO"&&form.legal_mode==="no_permit_required"&&
     <p className="alert alert-warning" role="alert">Para rifas en Colombia se exige la modalidad con autorización. No es posible habilitar esta edición como exenta.</p>}
    <label>{form.legal_mode==="no_permit_required"?"Organizador responsable":"Operador autorizado"}
     <input required minLength={3} value={form.operator_name}
      onChange={e=>setForm(p=>({...p,operator_name:e.target.value}))}/></label>
    {form.legal_mode==="permit_required"?<>
    <label>Autoridad que autorizó<input required minLength={3} value={form.authority_name}
     onChange={e=>setForm(p=>({...p,authority_name:e.target.value}))}/></label>
    <label>Operador autorizado<input required minLength={3} value={form.operator_name}
     onChange={e=>setForm(p=>({...p,operator_name:e.target.value}))}/></label>
    <label>Resolución o referencia oficial<input required minLength={5}
     value={form.authorization_reference} onChange={e=>setForm(p=>({...p,authorization_reference:e.target.value}))}/></label>
    <label>Enlace HTTPS al documento de autorización<input required type="url"
     value={form.authorization_document_url} onChange={e=>setForm(p=>({...p,authorization_document_url:e.target.value}))}/></label>
    </>:<>
     <label>Fundamento jurídico de que esta actividad no exige permiso específico
      <textarea required minLength={100} maxLength={5000} rows={5} value={form.legal_basis}
       placeholder="Indica la normativa vigente, jurisdicción, alcance, excepciones y por qué esta modalidad y sus ventas web no requieren permiso."
       onChange={e=>setForm(p=>({...p,legal_basis:e.target.value}))}/></label>
     <label>Fuente jurídica oficial o concepto legal verificable (HTTPS)
      <input required type="url" value={form.legal_basis_url}
       onChange={e=>setForm(p=>({...p,legal_basis_url:e.target.value}))}/></label>
     <p className="small muted">Esta opción no implica que todos los países extranjeros permitan rifas sin autorización. Debes verificar cada jurisdicción y sus restricciones de venta transfronteriza.</p>
    </>}
    <label>Enlace HTTPS al reglamento de la edición<input required type="url"
     value={form.rules_url} onChange={e=>setForm(p=>({...p,rules_url:e.target.value}))}/></label>
    <div className="row-actions"><label>Vigente desde<input type="date" required value={form.authorized_from}
     onChange={e=>setForm(p=>({...p,authorized_from:e.target.value}))}/></label>
     <label>Vigente hasta<input type="date" required value={form.authorized_until}
     onChange={e=>setForm(p=>({...p,authorized_until:e.target.value}))}/></label></div>
    <label><input type="checkbox" checked={form.scheme_10_40_authorized}
     onChange={e=>setForm(p=>({...p,scheme_10_40_authorized:e.target.checked}))}/>
     Confirmo que la normativa y el reglamento de este país permiten diez números elegidos, cuarenta adicionales, planes de cuotas y comercialización web.</label>
    <label><input type="checkbox" checked={form.sales_enabled}
     onChange={e=>setForm(p=>({...p,sales_enabled:e.target.checked}))}/>
     <strong>Habilitar nuevas ventas y reservas reales</strong></label>
    <p className="small muted">El apagado de ventas evita pedidos nuevos, pero conserva comprobantes pendientes y permite que tesorería revise obligaciones existentes.</p>
    <button type="submit" disabled={busy||!drawId} className="btn btn-primary">
     {form.sales_enabled?"Guardar y habilitar ventas":"Guardar condiciones legales sin activar ventas"}</button>
   </form>
  </div>
  <CountryRequestsAdmin/>
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
