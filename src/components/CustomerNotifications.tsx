"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { oportuniaClient } from "@/lib/oportuniaSupabase";

type Notice = {
  id:string; user_id:string; kind:"reporte_recibido"|"cotejo_extracto"|"reporte_rechazado";
  title:string; message:string; created_at:string; read_at:string|null;
};
const types:Record<Notice["kind"],string>={
  reporte_recibido:"Referencia recibida",
  cotejo_extracto:"Coincidencia con extracto",
  reporte_rechazado:"Revisión requerida",
};

export function CustomerNotifications({standalone=false}:{standalone?:boolean}) {
  const client=useMemo(()=>oportuniaClient(),[]);
  const [userId,setUserId]=useState<string|null>(null);
  const [checked,setChecked]=useState(false);
  const [notices,setNotices]=useState<Notice[]>([]);
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [filter,setFilter]=useState<"all"|"unread">("all");

  useEffect(()=>{
    let live=true;
    void client.auth.getUser().then(({data})=>{
      if(live){setUserId(data.user?.id??null);setChecked(true);}
    }).catch(()=>{if(live)setChecked(true);});
    const {data:sub}=client.auth.onAuthStateChange((_event,session)=>{
      if(live){setUserId(session?.user?.id??null);setChecked(true);}
    });
    return()=>{live=false;sub.subscription.unsubscribe();};
  },[client]);

  const refresh=useCallback(async(id:string)=>{
    const {data,error:readError}=await client.from("customer_notifications")
      .select("id,user_id,kind,title,message,created_at,read_at")
      .eq("user_id",id).order("created_at",{ascending:false}).limit(100);
    if(readError)throw new Error("No se pudo consultar el buzón de avisos. Verifica tu sesión y la conexión.");
    setNotices((data||[]) as Notice[]);
  },[client]);

  useEffect(()=>{
    let live=true;
    if(!userId){setNotices([]);setLoading(false);return;}
    setLoading(true);setError("");
    void refresh(userId).catch(e=>{if(live)setError(e instanceof Error?e.message:"No se pudieron leer los avisos.");})
      .finally(()=>{if(live)setLoading(false);});
    return()=>{live=false;};
  },[userId,refresh]);

  const unread=notices.filter(n=>!n.read_at).length;
  const visible=filter==="unread"?notices.filter(n=>!n.read_at):notices;

  async function markAsRead(id?:string){
    if(!userId||busy)return;
    setBusy(true);setError("");
    try{
      const query=client.from("customer_notifications")
        .update({read_at:new Date().toISOString()})
        .eq("user_id",userId).is("read_at",null);
      const {error:writeError}=id?await query.eq("id",id):await query;
      if(writeError)throw writeError;
      await refresh(userId);
    }catch(e){setError(e instanceof Error?e.message:"No se pudo cambiar el estado del aviso.");}
    finally{setBusy(false);}
  }

  return <section className={"customer-notifications"+(standalone?" customer-notifications-standalone":"")} aria-label="Notificaciones de mi cuenta">
    <div className="notices-heading"><div><span className="overline">AVISOS INTERNOS · PRIVADOS</span>
      <h2>Mis notificaciones</h2>
      <p>Actualizaciones sobre tus referencias bancarias, guardadas con tu usuario de Supabase.</p></div>
      <span className="notices-count">{unread} sin leer</span></div>
    <p className="notices-disclaimer">Estos mensajes aparecen dentro de Oportunia. No son SMS, correos ni WhatsApp, y no garantizan que el banco haya confirmado dinero recibido.</p>
    {!checked?<p className="muted">Comprobando sesión…</p>:!userId?
      <div className="notices-empty">Inicia sesión para ver tus mensajes personales. <Link href="/acceso">Entrar a mi cuenta</Link></div>:
      <>
        <div className="notices-actions">
          <div role="group" aria-label="Filtrar avisos"><button type="button" className={filter==="all"?"active":""} onClick={()=>setFilter("all")}>Todos ({notices.length})</button>
            <button type="button" className={filter==="unread"?"active":""} onClick={()=>setFilter("unread")}>Sin leer ({unread})</button></div>
          <button type="button" className="btn btn-secondary btn-small" onClick={()=>void markAsRead()} disabled={busy||!unread}>Marcar todos como leídos</button>
        </div>
        {error&&<div className="alert alert-error" role="alert">{error}</div>}
        {loading?<p className="muted">Consultando avisos…</p>:visible.length===0?
          <div className="notices-empty">{filter==="unread"?"No tienes notificaciones pendientes por leer.":"No hay avisos registrados. Cuando cambie el estado de un reporte bancario, aparecerá aquí."}</div>:
          <div className="notices-list">{visible.map(n=><article key={n.id} className={"notices-item"+(!n.read_at?" notices-new":"")}>
            <div className="notices-item-icon" aria-hidden="true">{n.kind==="cotejo_extracto"?"✓":n.kind==="reporte_rechazado"?"!":"↳"}</div>
            <div className="notices-item-body"><span className="notices-item-kind">{types[n.kind]}</span><strong>{n.title}</strong>
              <p>{n.message}</p><small>{new Date(n.created_at).toLocaleString("es-CO")}</small>
              <Link href="/mi-cuenta">Ver historial de referencias</Link></div>
            {!n.read_at&&<button type="button" disabled={busy} className="notices-read" onClick={()=>void markAsRead(n.id)}>Marcar leído</button>}
          </article>)}</div>}
        {notices.length===100&&<p className="muted">Se muestran los últimos 100 avisos.</p>}
      </>}
  </section>;
}
