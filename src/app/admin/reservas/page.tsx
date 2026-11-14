"use client";
import Link from "next/link";
import { useCallback,useEffect,useMemo,useState } from "react";
import { AdminAccessGate } from "@/components/AdminAccessGate";
import { PreviewProgress } from "@/components/PreviewProgress";
import { oportuniaClient } from "@/lib/oportuniaSupabase";
import {displayPreviewNumber,effectivePreviewStatus,summarizePreviewReservations,
  type PreviewDraw,type PreviewReservation,type PreviewNumber,type PreviewEvent} from "@/lib/previewReservations";
const statusLabels={active:"Vigente",expired:"Vencida",cancelled:"Cancelada"};

function PreviewAdminWorkspace(){
  const client=useMemo(()=>oportuniaClient(),[]);
  const [draws,setDraws]=useState<PreviewDraw[]>([]);
  const [drawId,setDrawId]=useState("");
  const [reservations,setReservations]=useState<PreviewReservation[]>([]);
  const [numbers,setNumbers]=useState<PreviewNumber[]>([]);
  const [events,setEvents]=useState<PreviewEvent[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [filter,setFilter]=useState<"all"|"active"|"expired"|"cancelled">("all");
  const [term,setTerm]=useState("");
  const [detailsId,setDetailsId]=useState<string|null>(null);

  const refresh=useCallback(async()=>{
    const [drawResult,holdResult,numberResult,eventResult]=await Promise.all([
      client.from("draw_catalog").select("id,title,enabled,status").order("display_order",{ascending:true}).limit(25),
      client.from("preview_reservations").select("id,draw_id,user_id,selection_mode,preferred_plan,status,created_at,expires_at,closed_at")
        .order("created_at",{ascending:false}).limit(500),
      client.from("preview_reserved_numbers").select("draw_id,reservation_id,number,created_at,category,milestone").limit(2500),
      client.from("preview_reservation_events").select("id,reservation_id,actor_id,event_type,numbers,created_at")
        .order("created_at",{ascending:false}).limit(1000),
    ]);
    if(drawResult.error||holdResult.error||numberResult.error||eventResult.error)throw new Error("No se pudo cargar el inventario central. Verifica los permisos y la migración.");
    const available=(drawResult.data||[]) as PreviewDraw[];
    setDraws(available);
    setDrawId(previous=>available.some(d=>d.id===previous)?previous:(available[0]?.id||""));
    setReservations((holdResult.data||[]) as PreviewReservation[]);
    setNumbers((numberResult.data||[]) as PreviewNumber[]);
    setEvents((eventResult.data||[]) as PreviewEvent[]);
  },[client]);
  useEffect(()=>{let active=true;
    void refresh().catch(e=>{if(active)setError(e instanceof Error?e.message:"No se pudo obtener el inventario");})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[refresh]);
  const stats=useMemo(()=>summarizePreviewReservations(reservations,numbers,drawId),[reservations,numbers,drawId]);
  const visible=reservations.filter(r=>r.draw_id===drawId&&(filter==="all"||effectivePreviewStatus(r)===filter)&&
    (!term||r.id.toLowerCase().includes(term.toLowerCase())||r.user_id.toLowerCase().includes(term.toLowerCase())));
  return <div className="container page-space central-page">
    <div className="central-head"><div><span className="overline">ADMIN · INVENTARIO DE ENSAYOS</span>
      <h1>Reservas <span className="gradient-text">centralizadas.</span></h1>
      <p>Auditoría global de las diez selecciones iniciales y hasta cuarenta números adicionales estrictamente simulados en PostgreSQL.</p></div>
      <Link className="btn btn-secondary" href="/admin">Volver al panel</Link>
    </div>
    <div className="central-warning"><strong>Inventario de laboratorio, no ventas:</strong> estos bloqueos son temporales, no se han pagado ni asignado oficialmente y NO afectan las selecciones de la demo local. Los 40 números adicionales solo se crean mediante hitos ficticios habilitados para administración, sin pagos ni elegibilidad.</div>
    {error&&<div role="alert" className="alert alert-error">{error}</div>}
    {loading?<section className="central-panel">Consultando reservas…</section>:<>
      <section className="central-panel">
        <div className="central-toolbar"><label>Edición de prueba<select value={drawId} onChange={e=>setDrawId(e.target.value)}>
          {draws.map(d=><option value={d.id} key={d.id}>{d.title} · {d.status}</option>)}</select></label>
          <button className="btn btn-secondary btn-small" type="button" onClick={()=>void refresh().catch(e=>setError(e instanceof Error?e.message:"Error de lectura"))}>Actualizar</button></div>
        <div className="central-stats central-admin-stats">
          <div><span>Ensayos vigentes</span><strong>{stats.active} / 200</strong></div>
          <div><span>Números ocupados (ensayo)</span><strong>{stats.selectedNumbers.toLocaleString("es-CO")}</strong></div>
          <div><span>Números libres (ensayo)</span><strong>{stats.freeNumbers.toLocaleString("es-CO")}</strong></div>
          <div><span>Vencidas</span><strong>{stats.expired}</strong></div>
          <div><span>Canceladas</span><strong>{stats.cancelled}</strong></div>
        </div>
      </section>
      <section className="central-panel">
        <div className="central-list-head"><div><span className="overline">HISTORIAL CENTRAL</span><h2>Selecciones registradas</h2></div>
          <Link href="/ensayo-reservas" className="btn btn-secondary btn-small">Abrir simulador del cliente</Link></div>
        <div className="central-filters"><label>Buscar ID de usuario o reserva<input aria-label="Buscar reserva" value={term} onChange={e=>setTerm(e.target.value)} placeholder="Identificador…"/></label>
          <label>Estado<select value={filter} onChange={e=>setFilter(e.target.value as typeof filter)}>
            <option value="all">Todos</option><option value="active">Vigente</option><option value="expired">Vencida</option><option value="cancelled">Cancelada</option>
          </select></label></div>
        {visible.length===0?<p className="muted">No hay selecciones centralizadas para este filtro.</p>:
          <div className="central-history">{visible.map(r=>{
            const status=effectivePreviewStatus(r);
            const first=events.find(e=>e.reservation_id===r.id&&e.event_type==="created");
            const nums=first?.numbers||numbers.filter(n=>n.reservation_id===r.id).map(n=>n.number);
            return <article key={r.id}>
              <div><strong>Prueba {r.id.slice(0,8).toUpperCase()}</strong><span className={"central-tag central-"+status}>{statusLabels[status]}</span></div>
              <p className="central-audit-detail">Usuario {r.user_id.slice(0,8)}… · {r.selection_mode==="manual"?"Manual":"Automática"} · Creada {new Date(r.created_at).toLocaleString("es-CO")} · Vence {new Date(r.expires_at).toLocaleString("es-CO")}</p>
              <div className="central-numbers">{nums.map(n=><span key={n}>{displayPreviewNumber(n)}</span>)}</div>
              <small>Eventos auditados: {events.filter(e=>e.reservation_id===r.id).map(e=>e.event_type).join(" · ")||"Sin eventos visibles"}</small>
              <div className="central-admin-actions">
                <button type="button" className="btn btn-secondary btn-small" onClick={()=>setDetailsId(old=>old===r.id?null:r.id)}>
                  {detailsId===r.id?"Ocultar":"Ver"} hitos de simulación y seguimiento
                </button>
              </div>
              {detailsId===r.id&&<PreviewProgress reservationId={r.id}
                allowDemoAllocation={status==="active"} onChanged={()=>{void refresh();}}/>}
            </article>;
          })}</div>}
        {reservations.length===500&&<p className="muted">Vista limitada a los 500 registros más recientes.</p>}
      </section>
      </>}
  </div>;
}
export default function PreviewReservationsAdminPage(){return <AdminAccessGate><PreviewAdminWorkspace/></AdminAccessGate>;}
