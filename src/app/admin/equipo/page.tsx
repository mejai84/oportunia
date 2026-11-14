"use client";
import Link from "next/link";
import {useCallback,useEffect,useMemo,useState} from "react";
import {AdminAccessGate} from "@/components/AdminAccessGate";
import {oportuniaClient} from "@/lib/oportuniaSupabase";
import {staffRoleNames,type StaffRole} from "@/lib/staffPermissions";

type Profile={user_id:string;email:string;display_name:string};
type Assignment={user_id:string;role:Exclude<StaffRole,"owner">;assigned_by:string;assigned_at:string};
type RoleAudit={id:number;actor_id:string|null;target_user_id:string|null;event_type:string;old_role:string|null;new_role:string|null;created_at:string};
type Assignable=Exclude<StaffRole,"owner">|"";
const options:Exclude<StaffRole,"owner">[]=["treasury","support","draws","auditor"];
function StaffPage(){
 const client=useMemo(()=>oportuniaClient(),[]);
 const [profiles,setProfiles]=useState<Profile[]>([]);
 const [roles,setRoles]=useState<Assignment[]>([]);
 const [events,setEvents]=useState<RoleAudit[]>([]);
 const [ownerId,setOwnerId]=useState("");
 const [target,setTarget]=useState("");
 const [role,setRole]=useState<Assignable>("");
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");

 const refresh=useCallback(async()=>{
  const [a,b,c,d]=await Promise.all([
   client.from("customer_profiles").select("user_id,email,display_name").order("created_at",{ascending:false}).limit(500),
   client.from("oportunia_staff_roles").select("user_id,role,assigned_by,assigned_at").order("assigned_at",{ascending:false}).limit(500),
   client.from("oportunia_staff_audit").select("id,actor_id,target_user_id,event_type,old_role,new_role,created_at")
    .order("created_at",{ascending:false}).limit(100),
   client.auth.getUser(),
  ]);
  if(a.error||b.error||c.error||d.error||!d.data.user)throw new Error("No se pudo cargar la información del equipo. Verifica la sesión y el rol propietario.");
  setProfiles((a.data||[]) as Profile[]);
  setRoles((b.data||[]) as Assignment[]);
  setEvents((c.data||[]) as RoleAudit[]);
  setOwnerId(d.data.user.id);
 },[client]);
 useEffect(()=>{
  let live=true;
  void refresh().catch(e=>{if(live)setError(e instanceof Error?e.message:"Error consultando equipo");})
    .finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;};
 },[refresh]);

 const chosen=roles.find(r=>r.user_id===target);
 const oldRole=chosen?.role||null;
 async function submit(){
  if(!target||busy)return;
  const name=profiles.find(x=>x.user_id===target)?.email||target;
  if(!window.confirm(role
    ?"¿Asignar "+staffRoleNames[role]+" a "+name+"? El cambio afectará sus permisos de inmediato."
    :"¿Revocar el acceso administrativo de "+name+"?"))return;
  setBusy(true);setError("");setNotice("");
  try{
   const {error:writeError}=await client.rpc("set_oportunia_staff_role",{p_user_id:target,p_role:role});
   if(writeError)throw writeError;
   await refresh();
   setNotice(role?"Rol actualizado y auditado.":"Acceso administrativo revocado y auditado.");
  }catch(e){setError(e instanceof Error?e.message:"No se pudo modificar el rol.");}
  finally{setBusy(false);}
 }
 return <div className="container page-space staff-page">
  <div className="staff-head"><div><span className="overline">SEGURIDAD · SOLO PROPIETARIO</span>
   <h1>Equipo y <span className="gradient-text">permisos.</span></h1>
   <p>Autoriza el acceso de colaboradores registrados. Cada modificación se almacena con fecha y responsable.</p></div>
   <Link href="/admin" className="btn btn-secondary">Volver al menú</Link></div>
  <div className="staff-explainer"><strong>Principio de mínimo privilegio.</strong> Tesorería administra únicamente conciliación; soporte gestiona clientes y tareas; sorteos gestiona catálogo y ensayos; auditoría solo consulta trazabilidad. La cuenta propietaria no se puede modificar desde este módulo.</div>
  {error&&<p role="alert" className="alert alert-error">{error}</p>}
  {notice&&<p role="status" className="alert alert-success">{notice}</p>}
  {loading?<div className="staff-panel">Consultando usuarios y permisos…</div>:<>
   <div className="staff-metrics">
    <article><strong>{roles.length}</strong><span>Colaboradores autorizados</span></article>
    <article><strong>{roles.filter(r=>r.role==="treasury").length}</strong><span>Tesorería</span></article>
    <article><strong>{roles.filter(r=>r.role==="support").length}</strong><span>Soporte</span></article>
    <article><strong>{roles.filter(r=>r.role==="draws").length}</strong><span>Gestión de sorteos</span></article>
   </div>
   <section className="staff-panel"><header><h2>Asignar o retirar un rol</h2><p>El colaborador debe tener una cuenta registrada en Oportunia.</p></header>
    <div className="staff-form">
     <label>Cuenta<select value={target} onChange={e=>{const id=e.target.value;setTarget(id);setRole(roles.find(r=>r.user_id===id)?.role||"");}}>
      <option value="">Seleccionar cuenta…</option>
      {profiles.filter(p=>p.user_id!==ownerId).map(p=><option value={p.user_id} key={p.user_id}>{p.display_name||p.email||"Cuenta"} ({p.email})</option>)}
     </select></label>
     <label>Nuevo acceso<select disabled={!target} value={role} onChange={e=>setRole(e.target.value as Assignable)}>
      <option value="">Sin acceso / revocar</option>
      {options.map(x=><option value={x} key={x}>{staffRoleNames[x]}</option>)}
     </select></label>
     <button type="button" className="btn btn-primary" onClick={()=>void submit()} disabled={busy||!target||oldRole===role}>
      {busy?"Guardando…":role?"Guardar rol y auditoría":"Revocar acceso"}</button>
    </div>
    <p className="muted">La revocación bloquea las futuras consultas y acciones en Supabase, incluso si el usuario conserva una sesión abierta. Para ver el nuevo menú, el colaborador debe actualizar la página.</p>
   </section>
   <section className="staff-panel"><h2>Cuentas con acceso administrativo</h2>
    <div className="staff-list"><article><strong>Propietario</strong><span>Acceso total · Protegido</span></article>
     {roles.map(r=>{const p=profiles.find(x=>x.user_id===r.user_id);return <article key={r.user_id}>
      <strong>{p?.display_name||p?.email||r.user_id.slice(0,8)}</strong>
      <span>{staffRoleNames[r.role]} · desde {new Date(r.assigned_at).toLocaleString("es-CO")}</span>
     </article>})}</div>
    {roles.length===0&&<p className="muted">Aún no hay colaboradores asignados; solo existe el propietario.</p>}
   </section>
   <section className="staff-panel"><h2>Últimos cambios de roles</h2>
    {events.length===0?<p className="muted">Sin modificaciones de roles.</p>:
     <div className="staff-events">{events.map(e=><article key={e.id}>
      <strong>{e.event_type==="assigned"?"Rol asignado":e.event_type==="revoked"?"Acceso revocado":"Rol cambiado"}</strong>
      <span>{e.old_role||"Sin rol"} → {e.new_role||"Sin rol"}</span>
      <small>{new Date(e.created_at).toLocaleString("es-CO")} · Actor {e.actor_id?.slice(0,8)||"Cuenta retirada"}</small>
     </article>)}</div>}
   </section>
  </>}
 </div>;
}
export default function TeamAdminPage(){return <AdminAccessGate requiredPermission="staff.manage"><StaffPage/></AdminAccessGate>;}
