"use client";
import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import { assignedCount, isEligible, money, phaseOf, PRICE, MAX_OPPORTUNITIES, shortId } from "@/lib/domain";
type Tab = "resumen" | "pagos" | "clientes" | "sorteo";
const phaseNames = { venta: "En comercialización", cobranza: "Cobranza: 7 días", revision: "Revisión por impagos", listo: "Listo para programar" };
export default function AdminPage() {
  const { state, hydrated, approve, reject, schedule, reset } = useApp();
  const [tab, setTab] = useState<Tab>("resumen");
  const [error, setError] = useState("");
  const [date, setDate] = useState("");
  const [success, setSuccess] = useState("");
  const phase = phaseOf(state);
  const fullyPaid = state.opportunities.filter(isEligible).length;
  const collected = state.opportunities.reduce((sum, o) => sum + o.paid, 0);
  const pendingReports = state.reports.filter((r) => r.status === "pendiente");
  const uniqueCustomers = new Set(state.opportunities.map((o) => o.customer.phone)).size;
  function handleReview(id: string, accept: boolean) {
    setError(""); setSuccess("");
    try {
      if (accept) approve(id); else reject(id);
      setSuccess(accept ? "Abono aprobado. Números asignados." : "Reporte rechazado.");
    } catch (e) { setError(e instanceof Error ? e.message : "Error al procesar el reporte."); }
  }
  function handleSchedule() {
    setError(""); setSuccess("");
    try { schedule(date); setSuccess("Fecha informativa guardada. Falta verificar el calendario oficial."); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar la fecha."); }
  }
  return <div className="container page-space">
    <div className="page-title"><span className="overline">PANEL DE CONTROL · DEMO SIN AUTENTICACIÓN</span>
      <h1>Centro de <span className="gradient-text">administración.</span></h1>
      <p className="muted">Control de oportunidades, reportes de abonos, cartera y programación. Datos locales, no aptos para producción.</p>
    </div>
    <div className="alert alert-warning admin-warning"><strong>Acceso de demostración:</strong> este panel no tiene inicio de sesión ni permisos reales. No ingresar datos personales o bancarios verdaderos.</div>
    <div className="admin-metrics">
      <div className="metric-card"><span>Oportunidades colocadas</span><strong>{state.opportunities.length} <small>/ {MAX_OPPORTUNITIES}</small></strong></div>
      <div className="metric-card"><span>Completamente pagadas</span><strong>{fullyPaid}</strong></div>
      <div className="metric-card"><span>Recaudo confirmado</span><strong>{money(collected)}</strong></div>
      <div className="metric-card"><span>Reportes pendientes</span><strong>{pendingReports.length}</strong></div>
    </div>
    <div className="tabs" role="tablist" aria-label="Secciones administrativas">
      {(["resumen", "pagos", "clientes", "sorteo"] as Tab[]).map((t) =>
        <button type="button" role="tab" aria-selected={tab === t} key={t}
          className={"tab" + (tab === t ? " active" : "")} onClick={() => setTab(t)}>
          {t === "resumen" ? "Resumen" : t === "pagos" ? "Pagos" : t === "clientes" ? "Clientes" : "Sorteo"}
        </button>)}
    </div>
    {error && <div className="alert alert-error" role="alert">{error}</div>}
    {success && <div className="alert alert-success" role="status">{success}</div>}
    {!hydrated ? <p>Cargando…</p> : <>
      {tab === "resumen" && <div className="two-col-layout">
        <section className="panel"><h2>Estado general</h2><div className="summary-rows">
          <div><span>Fase del sorteo</span><strong>{phaseNames[phase]}</strong></div>
          <div><span>Clientes únicos</span><strong>{uniqueCustomers}</strong></div>
          <div><span>Oportunidades con saldo</span><strong>{state.opportunities.length - fullyPaid}</strong></div>
          <div><span>Números asignados</span><strong>{state.opportunities.reduce((sum, o) => sum + assignedCount(o), 0)} / 10.000</strong></div>
          <div><span>Recaudo potencial</span><strong>{money(MAX_OPPORTUNITIES * PRICE)}</strong></div>
        </div></section>
        <section className="panel"><h2>Flujo de prueba</h2><div className="timeline">
          <div><span>01</span><p>Crear una oportunidad desde Elegir números.</p></div>
          <div><span>02</span><p>Reportar un abono desde Pagos.</p></div>
          <div><span>03</span><p>Aprobarlo en la pestaña Pagos.</p></div>
          <div><span>04</span><p>Consultar los números en Mi cuenta.</p></div>
        </div></section>
      </div>}
      {tab === "pagos" && <section className="panel">
        <div className="panel-heading"><div><h2>Reportes de pagos</h2><p className="small muted">Aprobar es una simulación, no confirma una transferencia real.</p></div><span className="counter-pill">{pendingReports.length} pendientes</span></div>
        {state.reports.length === 0 ? <div className="empty-state"><span>▤</span><p>No hay reportes todavía.</p></div> :
          <div className="table-scroll"><table className="data-table">
            <thead><tr><th>Orden</th><th>Valor</th><th>Método</th><th>Referencia</th><th>Estado</th><th>Acción</th></tr></thead>
            <tbody>{[...state.reports].reverse().map((r) =>
              <tr key={r.id}><td>{shortId(r.orderId)}</td><td>{money(r.amount)}</td><td>{r.method}</td>
                <td>{r.reference}</td><td><span className={"tag " + (r.status === "aprobado" ? "tag-green" : r.status === "rechazado" ? "tag-red" : "tag-amber")}>{r.status}</span></td>
                <td>{r.status === "pendiente" ? <div className="row-actions">
                  <button className="btn btn-small btn-primary" onClick={() => handleReview(r.id, true)}>Aprobar</button>
                  <button className="btn btn-small btn-ghost" onClick={() => handleReview(r.id, false)}>Rechazar</button>
                </div> : "—"}</td>
              </tr>)}</tbody>
          </table></div>}
      </section>}
      {tab === "clientes" && <section className="panel">
        <div className="panel-heading"><div><h2>Clientes y cartera</h2><p className="small muted">Información guardada únicamente en este navegador.</p></div></div>
        {state.opportunities.length === 0 ? <div className="empty-state"><span>♧</span><p>Aún no hay compradores de prueba.</p></div> :
          <div className="table-scroll"><table className="data-table">
            <thead><tr><th>Comprador</th><th>Celular</th><th>Oportunidad</th><th>Abonado</th><th>Saldo</th><th>Asignados</th><th>Participa</th></tr></thead>
            <tbody>{state.opportunities.map((o) => <tr key={o.id}>
              <td>{o.customer.name}</td><td>{o.customer.phone}</td><td>{shortId(o.id)}</td>
              <td>{money(o.paid)}</td><td>{money(PRICE - o.paid)}</td><td>{assignedCount(o)} / 50</td>
              <td>{isEligible(o) ? <span className="tag tag-green">Sí</span> : <span className="tag tag-amber">No</span>}</td>
            </tr>)}</tbody>
          </table></div>}
      </section>}
      {tab === "sorteo" && <div className="two-col-layout">
        <section className="panel"><h2>Condiciones de cierre</h2><div className="summary-rows">
          <div><span>200 oportunidades colocadas</span><strong>{state.opportunities.length === 200 ? "Sí" : "Pendiente"}</strong></div>
          <div><span>200 oportunidades pagadas</span><strong>{fullyPaid === 200 ? "Sí" : "Pendiente"}</strong></div>
          <div><span>Inicio de plazo de 7 días</span><strong>{state.soldOutAt ? new Date(state.soldOutAt).toLocaleDateString("es-CO") : "Sin iniciar"}</strong></div>
          <div><span>Fecha límite de cobranza</span><strong>{state.deadlineAt ? new Date(state.deadlineAt).toLocaleDateString("es-CO") : "Sin definir"}</strong></div>
          <div><span>Fase actual</span><strong>{phaseNames[phase]}</strong></div>
        </div>
        {phase === "revision" && <div className="alert alert-warning">Existen oportunidades impagas tras los siete días. Se requiere resolver el tratamiento autorizado antes de programar el sorteo.</div>}
        </section>
        <section className="panel"><h2>Programación informativa</h2>
          <p className="muted small">La referencia prevista es la Lotería de Medellín. Debe verificarse la fecha oficial y el reglamento autorizado.</p>
          <div className="form-stack top-gap">
            <label>Fecha oficial (verificación manual)<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <button className="btn btn-primary full" disabled={phase !== "listo"} onClick={handleSchedule}>Guardar fecha de prueba</button>
            <p className="small muted">Fecha guardada: {state.drawDate || "Ninguna"}</p>
          </div>
        </section>
      </div>}
    </>}
    <div className="admin-reset"><button type="button" className="btn btn-ghost btn-small" onClick={() => {
      if (window.confirm("¿Borrar todas las órdenes y pagos de prueba de este navegador?")) { reset(); setSuccess("Datos de prueba reiniciados."); }
    }}>Reiniciar datos de la demo</button></div>
  </div>;
}
