"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AdminAccessGate } from "@/components/AdminAccessGate";
import { oportuniaClient } from "@/lib/oportuniaSupabase";
import type { CrmProfile } from "@/lib/crm";
import { followupMetrics } from "@/lib/operations";

type Category="contacto"|"revision_referencia"|"soporte"|"documentacion";
type Status="pending"|"done"|"cancelled";
type Priority="normal"|"alta";
type Task={
  id:string; customer_user_id:string; category:Category; title:string; due_date:string;
  priority:Priority;status:Status;created_by:string;created_at:string;updated_at:string;
};
type TaskEvent={
  id:number; followup_id:string; actor_id:string; event_type:"created"|"status_changed";
  old_status:Status|null;new_status:Status;created_at:string;
};
const categories:Record<Category,string>={
  contacto:"Contacto solicitado",revision_referencia:"Revisar referencia",soporte:"Soporte",documentacion:"Documentación",
};
const statuses:Record<Status,string>={pending:"Pendiente",done:"Completada",cancelled:"Cancelada"};
function dateTodayBogota(){
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Bogota",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const read=(type:string)=>parts.find(p=>p.type===type)?.value||"";
  return read("year")+"-"+read("month")+"-"+read("day");
}
function FollowUpWorkspace(){
  const client=useMemo(()=>oportuniaClient(),[]);
  const [profiles,setProfiles]=useState<CrmProfile[]>([]);
  const [tasks,setTasks]=useState<Task[]>([]);
  const [events,setEvents]=useState<TaskEvent[]>([]);
  const [search,setSearch]=useState("");
  const [filter,setFilter]=useState<Status|"all">("pending");
  const [customerId,setCustomerId]=useState("");
  const [category,setCategory]=useState<Category>("revision_referencia");
  const [title,setTitle]=useState("");
  const [dueDate,setDueDate]=useState(dateTodayBogota);
  const [priority,setPriority]=useState<Priority>("normal");
  const [selected,setSelected]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");

  const refresh=useCallback(async()=>{
    const [a,b,c]=await Promise.all([
      client.from("customer_profiles").select("user_id,email,display_name,phone,marketing_consent,created_at,updated_at")
        .order("created_at",{ascending:false}).limit(500),
      client.from("crm_followups").select("id,customer_user_id,category,title,due_date,priority,status,created_by,created_at,updated_at")
        .order("due_date",{ascending:true}).limit(800),
      client.from("crm_followup_events").select("id,followup_id,actor_id,event_type,old_status,new_status,created_at")
        .order("created_at",{ascending:false}).limit(1000),
    ]);
    if(a.error||b.error||c.error)throw new Error("No se pudo consultar la agenda. Revisa la migración de Supabase y tu acceso de administrador.");
    setProfiles((a.data||[]) as CrmProfile[]);
    setTasks((b.data||[]) as Task[]);
    setEvents((c.data||[]) as TaskEvent[]);
  },[client]);
  useEffect(()=>{
    let active=true;
    void refresh().catch(e=>{if(active)setError(e instanceof Error?e.message:"Error de carga");})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false};
  },[refresh]);
  const today=dateTodayBogota();
  const counts=followupMetrics(tasks,today);
  const people=new Map(profiles.map(p=>[p.user_id,p]));
  const matches=tasks.filter(t=>{
    if(filter!=="all"&&t.status!==filter)return false;
    const person=people.get(t.customer_user_id);
    const term=search.trim().toLocaleLowerCase("es-CO");
    return !term||[t.title,person?.display_name||"",person?.email||"",person?.phone||""].some(s=>s.toLocaleLowerCase("es-CO").includes(term));
  }).sort((a,b)=>a.due_date.localeCompare(b.due_date));
  const current=tasks.find(t=>t.id===selected)||null;

  async function createTask(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(busy)return;
    setBusy(true);setError("");setNotice("");
    try {
      const {data:{user},error:authError}=await client.auth.getUser();
      if(authError||!user)throw new Error("Tu sesión ha caducado.");
      const {error:writeError}=await client.from("crm_followups").insert({
        customer_user_id:customerId,category,title:title.trim(),due_date:dueDate,
        priority,status:"pending",created_by:user.id,
      });
      if(writeError)throw writeError;
      await refresh();setTitle("");
      setNotice("Tarea registrada con responsable y fecha. No se envió ningún mensaje al cliente.");
    }catch(e){setError(e instanceof Error?e.message:"No se pudo crear la tarea.");}
    finally{setBusy(false);}
  }

  async function changeStatus(task:Task,next:Status){
    if(task.status===next)return;
    const label=next==="done"?"completar":"cancelar";
    if(!window.confirm("¿Confirmas "+label+" esta tarea? El cambio quedará registrado en la auditoría interna."))return;
    setBusy(true);setError("");setNotice("");
    try{
      const {data:changed,error:writeError}=await client.from("crm_followups")
        .update({status:next}).eq("id",task.id).eq("status","pending").select("id").maybeSingle();
      if(writeError)throw writeError;
      if(!changed)throw new Error("Esta tarea ya fue procesada por otro administrador. Actualiza la agenda.");
      await refresh();
      setNotice("Estado actualizado y auditado. No se ha enviado ninguna notificación externa.");
    }catch(e){setError(e instanceof Error?e.message:"No se pudo actualizar la tarea.");}
    finally{setBusy(false);}
  }

  return <div className="container page-space follow-page">
    <div className="follow-header"><div><span className="overline">OPERACIONES · SEGUIMIENTO</span>
      <h1>Agenda de <span className="gradient-text">clientes.</span></h1>
      <p>Planifica revisiones de referencias, solicitudes de soporte y tareas de contacto. Sin inventar saldos ni mensajes enviados.</p></div>
      <Link className="btn btn-secondary" href="/admin">Volver al dashboard</Link>
    </div>
    <div className="follow-banner"><strong>Seguimiento administrativo, no cartera vencida.</strong>
      Los reportes de pago no representan deuda ni confirman dinero recibido. Esta agenda no envía WhatsApp, correo ni SMS; los consentimientos comerciales deben respetarse antes de cualquier contacto.</div>
    <div className="follow-kpis">
      <article><span>Tareas pendientes</span><strong>{counts.pending}</strong><small>Acciones por realizar</small></article>
      <article><span>Vencidas</span><strong>{counts.overdue}</strong><small>Fecha anterior a hoy</small></article>
      <article><span>Para hoy</span><strong>{counts.today}</strong><small>Hoy en Colombia</small></article>
      <article><span>Completadas</span><strong>{counts.completed}</strong><small>Con evento de auditoría</small></article>
    </div>
    {error&&<div className="alert alert-error" role="alert">{error}</div>}
    {notice&&<div className="alert alert-success" role="status">{notice}</div>}
    {loading?<section className="follow-panel">Consultando agenda en Supabase…</section>:
      <div className="follow-layout">
        <div className="follow-main">
          <section className="follow-panel">
            <header><div><span className="overline">CREAR SEGUIMIENTO</span><h2>Nueva tarea interna</h2></div>
              <Link href="/admin/clientes">Abrir CRM ↗</Link></header>
            <form className="follow-form" onSubmit={e=>void createTask(e)}>
              <label>Cuenta registrada<select value={customerId} onChange={e=>setCustomerId(e.target.value)} required>
                <option value="">Seleccionar cliente…</option>{profiles.map(p=><option key={p.user_id} value={p.user_id}>{p.display_name||p.email||p.user_id.slice(0,8)}</option>)}
              </select></label>
              <label>Tipo de tarea<select value={category} onChange={e=>setCategory(e.target.value as Category)}>
                {(Object.keys(categories) as Category[]).map(k=><option key={k} value={k}>{categories[k]}</option>)}
              </select></label>
              <label>Fecha objetivo<input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} required /></label>
              <label>Prioridad<select value={priority} onChange={e=>setPriority(e.target.value as Priority)}>
                <option value="normal">Normal</option><option value="alta">Alta</option></select></label>
              <label className="follow-form-full">Descripción<input maxLength={160} minLength={8} value={title} onChange={e=>setTitle(e.target.value)}
                placeholder="Ej.: Revisar referencia declarada con extracto bancario" required/></label>
              <button className="btn btn-primary" disabled={busy||!customerId||title.trim().length<8} type="submit">
                {busy?"Guardando…":"Crear tarea con trazabilidad"}</button>
            </form>
            {profiles.length===0&&<p className="muted">No hay cuentas disponibles para asignar seguimiento.</p>}
          </section>
          <section className="follow-panel">
            <header><div><span className="overline">AGENDA VIGENTE</span><h2>Seguimientos registrados</h2></div>
              <button type="button" className="btn btn-secondary btn-small" disabled={busy} onClick={()=>void refresh().catch(e=>setError(e instanceof Error?e.message:"Error al actualizar"))}>Actualizar</button></header>
            <div className="follow-filters"><label>Buscar<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar tarea o cliente"/></label>
              <label>Estado<select value={filter} onChange={e=>setFilter(e.target.value as Status|"all")}>
                <option value="pending">Pendientes</option><option value="all">Todas</option><option value="done">Completadas</option><option value="cancelled">Canceladas</option>
              </select></label></div>
            {matches.length===0?<p className="muted">No existen tareas para este filtro.</p>:
              <div className="follow-list">{matches.map(t=>{
                const person=people.get(t.customer_user_id);
                const late=t.status==="pending"&&t.due_date<today;
                return <article key={t.id} className={"follow-task"+(late?" follow-late":"")}>
                  <div className="follow-task-top"><span className={"follow-priority "+(t.priority==="alta"?"high":"")}>{t.priority==="alta"?"Prioridad alta":"Normal"}</span>
                    <span className="follow-status">{statuses[t.status]}</span></div>
                  <h3>{t.title}</h3><p>{person?.display_name||person?.email||"Cuenta registrada"} · {categories[t.category]}</p>
                  <small>Para: {t.due_date} {late?"· Vencida":""} · Responsable {t.created_by.slice(0,8)}</small>
                  <div className="follow-task-buttons">
                    <button type="button" className="btn btn-secondary btn-small" onClick={()=>setSelected(t.id)}>Ver historial</button>
                    {t.status==="pending"&&<><button className="btn btn-primary btn-small" type="button" disabled={busy} onClick={()=>void changeStatus(t,"done")}>Completar</button>
                      <button type="button" className="btn btn-ghost btn-small" disabled={busy} onClick={()=>void changeStatus(t,"cancelled")}>Cancelar</button></>}
                  </div>
                </article>;
              })}</div>}
            {tasks.length===800&&<p className="muted">Se muestran hasta 800 tareas. Los registros adicionales requieren paginación.</p>}
          </section>
        </div>
        <aside className="follow-side">
          <section className="follow-panel"><span className="overline">HISTORIAL INMUTABLE</span><h2>Auditoría de tarea</h2>
            {!current?<p>Elige «Ver historial» en una tarea para revisar su creación y cambios de estado.</p>:
              <><h3>{current.title}</h3><p>Responsable: {current.created_by.slice(0,8)} · Cliente {people.get(current.customer_user_id)?.display_name||people.get(current.customer_user_id)?.email||"registrado"}</p>
                <ol className="follow-events">{events.filter(e=>e.followup_id===current.id).sort((a,b)=>a.created_at.localeCompare(b.created_at)).map(e=>
                  <li key={e.id}><strong>{e.event_type==="created"?"Tarea creada":"Estado actualizado"}</strong>
                    <span>{e.event_type==="created"?"Pendiente":(e.old_status?statuses[e.old_status]:"")+" → "+statuses[e.new_status]}</span>
                    <small>{new Date(e.created_at).toLocaleString("es-CO")} · Actor {e.actor_id.slice(0,8)}</small></li>)}</ol>
              </>}
          </section>
          <section className="follow-panel"><span className="overline">RECORDATORIOS</span><h2>Solo dentro del administrador</h2>
            <p>Las tareas vencidas se destacan cuando el administrador abre esta página. Para avisos programados externos se requiere un servicio de entrega y controles de consentimiento.</p>
          </section>
        </aside>
      </div>}
  </div>;
}
export default function AdminFollowupsPage(){return <AdminAccessGate requiredPermission="followups.write"><FollowUpWorkspace/></AdminAccessGate>;}
