"use client";
import { useState, type FormEvent } from "react";
import { useApp } from "@/components/AppProvider";
import { AdminAccessGate } from "@/components/AdminAccessGate";
import { AdminDashboard } from "@/components/AdminDashboard";
import Link from "next/link";
import { AdminDrawContentEditor } from "@/components/AdminDrawContentEditor";
import { assignedCount, activeOrders, drawProgress, drawCatalog, drawIdOf, findDraw, milestoneOf, isEligible, isReservationExpired, money, phaseOf, PRICE, MAX_OPPORTUNITIES, shortId } from "@/lib/domain";
type Tab = "dashboard" | "resumen" | "pagos" | "verificacion" | "clientes" | "sorteo" | "sorteos" | "contenido";
const phaseNames = { venta: "En comercialización", cobranza: "Cobranza: 7 días", revision: "Revisión por impagos", listo: "Listo para programar" };
function LocalAdminPage() {
  const { state, hydrated, approve, reject, schedule, reset, activeDrawId, chooseDraw, addDraw, toggleDraw, editDraw } = useApp();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [error, setError] = useState("");
  const [date, setDate] = useState("");
  const [success, setSuccess] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newPrize, setNewPrize] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const draws = drawCatalog(state);
  const draw = findDraw(state, activeDrawId) || draws[0];
  const orders = state.opportunities.filter((o) => drawIdOf(o) === draw.id);
  const active = activeOrders(state, draw.id);
  const progress = drawProgress(state, draw.id);
  const milestones = milestoneOf(state, draw.id);
  const phase = phaseOf(state, new Date(), draw.id);
  const fullyPaid = active.filter(isEligible).length;
  const collected = orders.reduce((sum, o) => sum + o.paid, 0);
  const pendingReports = state.reports.filter((r) => r.status === "pendiente" && orders.some((o) => o.id === r.orderId));
  const reports = state.reports.filter((r) => orders.some((o) => o.id === r.orderId));
  const uniqueCustomers = new Set(active.map((o) => o.customer.phone)).size;
  function handleAddDraw(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess("");
    try {
      addDraw({ title: newTitle, prize: newPrize, description: newDescription });
      setNewTitle(""); setNewPrize(""); setNewDescription("");
      setSuccess("Sorteo creado localmente como deshabilitado. Actívalo cuando quieras mostrarlo.");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo crear el sorteo."); }
  }
  function handleToggleDraw(id: string, enabled: boolean) {
    setError(""); setSuccess("");
    try { toggleDraw(id, enabled); setSuccess(enabled ? "Sorteo habilitado en el catálogo local." : "Sorteo oculto del carrusel; las órdenes existentes se conservan."); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo cambiar el estado."); }
  }
  function handleReview(id: string, accept: boolean) {
    setError(""); setSuccess("");
    if (accept && !window.confirm("APROBACIÓN DE SIMULACIÓN: este reporte NO fue verificado contra una cuenta bancaria. ¿Deseas aprobar solo los datos de prueba de este navegador?")) return;
    try {
      if (accept) approve(id); else reject(id);
      setSuccess(accept ? "Reporte aprobado solamente en esta simulación local; no es un pago bancario verificado." : "Reporte de prueba rechazado.");
    } catch (e) { setError(e instanceof Error ? e.message : "Error al procesar el reporte."); }
  }
  function handleSchedule() {
    setError(""); setSuccess("");
    try { schedule(date); setSuccess("Fecha informativa guardada. Falta verificar el calendario oficial."); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar la fecha."); }
  }
  return <div className="container page-space">
    <div className="page-title"><span className="overline">PANEL DE CONTROL · ACCESO RESTRINGIDO</span>
      <h1>Centro de <span className="gradient-text">administración.</span></h1>
      <p className="muted">Panel de operaciones, catálogo y seguimiento. El catálogo y las opiniones se administran en Supabase; las oportunidades y abonos son datos de simulación locales.</p>
    </div>
    <div className="alert alert-warning admin-warning"><strong>Estado financiero:</strong> Bancolombia, Nequi, Bre-B y DaviPlata NO están conectados para verificar movimientos. Las aprobaciones de números y abonos son solo simulaciones guardadas en este navegador.</div>
    <div className="row-actions top-gap" style={{flexWrap:"wrap",marginBottom:16}}><Link className="btn btn-secondary btn-small" href="/admin/conciliacion">Conciliación bancaria ↗</Link><Link className="btn btn-secondary btn-small" href="/admin/catalogo">Catálogo e imágenes ↗</Link><Link className="btn btn-secondary btn-small" href="/admin/opiniones">Opiniones y resultados ↗</Link><Link className="btn btn-secondary btn-small" href="/acceso">Mi acceso ↗</Link></div>
    <div className="draw-account-switch admin-draw-switch"><label htmlFor="admin-draw">Administrar sorteo</label>
      <select id="admin-draw" value={draw.id} onChange={(e) => chooseDraw(e.target.value)}>{draws.map((d) => <option key={d.id} value={d.id}>{d.title}{d.enabled ? " · visible" : " · oculto"}</option>)}</select>
    </div>
    <div className="admin-metrics">
      <div className="metric-card"><span>Oportunidades ocupadas</span><strong>{active.length} <small>/ {MAX_OPPORTUNITIES}</small></strong></div>
      <div className="metric-card"><span>Completamente pagadas</span><strong>{fullyPaid}</strong></div>
      <div className="metric-card"><span>Abonos aprobados (demo)</span><strong>{money(collected)}</strong></div>
      <div className="metric-card"><span>Reportes pendientes</span><strong>{pendingReports.length}</strong></div>
    </div>
    <div className="tabs" role="tablist" aria-label="Secciones administrativas">
      {(["dashboard", "resumen", "pagos", "verificacion", "clientes", "sorteo", "sorteos", "contenido"] as Tab[]).map((t) =>
        <button type="button" role="tab" aria-selected={tab === t} key={t}
          className={"tab" + (tab === t ? " active" : "")} onClick={() => setTab(t)}>
          {t === "dashboard" ? "Dashboard" : t === "resumen" ? "Resumen" : t === "pagos" ? "Pagos (demo)" : t === "verificacion" ? "Conciliación" : t === "clientes" ? "Clientes" : t === "sorteos" ? "Gestionar sorteos" : t === "contenido" ? "Contenido e imágenes" : "Cierre"}
        </button>)}
    </div>
    {error && <div className="alert alert-error" role="alert">{error}</div>}
    {success && <div className="alert alert-success" role="status">{success}</div>}
    {!hydrated ? <p>Cargando…</p> : <>
      {tab === "dashboard" && <AdminDashboard state={state} drawId={draw.id} onOpenTab={setTab} />}
      {tab === "verificacion" && <section className="op-verification">
        <div className="op-verify-lead"><h2>Integración bancaria automática: todavía no está conectada</h2><p>La conciliación por importación de extractos está disponible como módulo independiente. Oportunia aún no puede confirmar movimientos en tiempo real mediante API bancaria.</p><p><Link className="btn btn-primary" href="/admin/conciliacion">Abrir conciliación bancaria ↗</Link></p></div>
        <div className="op-verify-grid">
          <article className="op-verify-card"><h3>Estado de los canales</h3><div className="op-verify-tag">Sin conexión bancaria</div><p>Nequi, Bancolombia, Bre-B y DaviPlata: sin API de movimientos autorizada ni mecanismo de conciliación implementado. No se almacenan credenciales bancarias en esta aplicación.</p><p>Los reportes se guardan exclusivamente en este navegador.</p></article>
          <article className="op-verify-card"><h3>Proceso seguro recomendado</h3><ul><li>Obtener movimientos reales desde el banco, por un canal oficial y autorizado.</li><li>Comparar importe, fecha, destinatario e identificador de transacción único.</li><li>Marcar como coincidencia, diferencia o pendiente, evitando referencias duplicadas.</li><li>Exigir una segunda confirmación antes de contabilizar un pago.</li><li>Conservar trazabilidad de responsable, evidencia y fecha de conciliación.</li></ul></article>
          <article className="op-verify-card"><h3>Controles pendientes para producción</h3><p>Se requiere un libro centralizado de órdenes, reportes, movimientos bancarios y pagos conciliados en Supabase; validación en servidor, RLS por roles y transacciones atómicas antes de asignar números.</p></article>
          <article className="op-verify-card"><h3>Qué puedes usar ahora</h3><p>El administrador permite explorar en modo demo la gestión de reportes y la lógica de los 50 números. No publiques resultados de simulación como pagos o ventas reales.</p><button type="button" className="btn btn-secondary" onClick={() => setTab("pagos")}>Ver reportes de prueba ↗</button></article>
        </div>
      </section>}
      {tab === "resumen" && <div className="two-col-layout">
        <section className="panel"><h2>Estado general</h2><div className="summary-rows">
          <div><span>Fase del sorteo</span><strong>{phaseNames[phase]}</strong></div>
          <div><span>Clientes únicos</span><strong>{uniqueCustomers}</strong></div>
          <div><span>Reservadas sin pago aprobado</span><strong>{progress.reservedWithoutPayment}</strong></div>
          <div><span>Con abono parcial</span><strong>{progress.withPartialPayment}</strong></div>
          <div><span>Pagadas al 100 %</span><strong>{progress.paid}</strong></div>
          <div><span>Oportunidades con saldo</span><strong>{active.length - fullyPaid}</strong></div>
          <div><span>Números asignados</span><strong>{active.reduce((sum, o) => sum + assignedCount(o), 0)} / 10.000</strong></div>
          <div><span>Recaudo potencial</span><strong>{money(MAX_OPPORTUNITIES * PRICE)}</strong></div>
        </div></section>
        <section className="panel"><h2>Flujo de seguimiento local</h2><div className="timeline">
          <div><span>01</span><p>Crear una oportunidad desde Elegir números.</p></div>
          <div><span>02</span><p>Reportar un abono desde Pagos.</p></div>
          <div><span>03</span><p>Aprobarlo en la pestaña Pagos.</p></div>
          <div><span>04</span><p>Consultar los números en Mi cuenta.</p></div>
        </div></section>
      </div>}
      {tab === "pagos" && <section className="panel">
        <div className="panel-heading"><div><h2>Reportes de pago simulados</h2><p className="small muted">No existe verificación bancaria. Aprobar solo modifica el estado de la demo local.</p></div><span className="counter-pill">{pendingReports.length} pendientes</span></div>
        {reports.length === 0 ? <div className="empty-state"><span>▤</span><p>No hay reportes todavía.</p></div> :
          <div className="table-scroll"><table className="data-table">
            <thead><tr><th>Orden</th><th>Valor</th><th>Método</th><th>Referencia</th><th>Estado</th><th>Acción</th></tr></thead>
            <tbody>{[...reports].reverse().map((r) =>
              <tr key={r.id}><td>{shortId(r.orderId)}</td><td>{money(r.amount)}</td><td>{r.method}</td>
                <td>{r.reference}</td><td><span className={"tag " + (r.status === "aprobado" ? "tag-green" : r.status === "rechazado" ? "tag-red" : "tag-amber")}>{r.status}</span></td>
                <td>{r.status === "pendiente" ? <div className="row-actions">
                  <button className="btn btn-small btn-primary" onClick={() => handleReview(r.id, true)}>Aprobar (demo)</button>
                  <button className="btn btn-small btn-ghost" onClick={() => handleReview(r.id, false)}>Rechazar</button>
                </div> : "—"}</td>
              </tr>)}</tbody>
          </table></div>}
      </section>}
      {tab === "clientes" && <section className="panel">
        <div className="panel-heading"><div><h2>Clientes y cartera</h2><p className="small muted">Información guardada únicamente en este navegador.</p></div></div>
        {orders.length === 0 ? <div className="empty-state"><span>♧</span><p>Aún no hay selecciones guardadas en este navegador.</p></div> :
          <div className="table-scroll"><table className="data-table">
            <thead><tr><th>Comprador</th><th>Celular</th><th>Oportunidad</th><th>Abonado</th><th>Saldo</th><th>Asignados</th><th>Participa</th></tr></thead>
            <tbody>{orders.map((o) => <tr key={o.id}>
              <td>{o.customer.name}</td><td>{o.customer.phone}</td><td>{shortId(o.id)}</td>
              <td>{money(o.paid)}</td><td>{money(PRICE - o.paid)}</td><td>{assignedCount(o)} / 50</td>
              <td>{isEligible(o) ? <span className="tag tag-green">Sí</span> : <span className={"tag " + (isReservationExpired(o) ? "tag-red" : "tag-amber")}>{isReservationExpired(o) ? "Vencida" : "No"}</span>}</td>
            </tr>)}</tbody>
          </table></div>}
      </section>}
      {tab === "sorteo" && <div className="two-col-layout">
        <section className="panel"><h2>Condiciones de cierre</h2><div className="summary-rows">
          <div><span>200 oportunidades colocadas</span><strong>{active.length === 200 ? "Sí" : "Pendiente"}</strong></div>
          <div><span>200 oportunidades pagadas</span><strong>{fullyPaid === 200 ? "Sí" : "Pendiente"}</strong></div>
          <div><span>Inicio de plazo de 7 días</span><strong>{milestones.soldOutAt ? new Date(milestones.soldOutAt).toLocaleDateString("es-CO") : "Sin iniciar"}</strong></div>
          <div><span>Fecha límite de cobranza</span><strong>{milestones.deadlineAt ? new Date(milestones.deadlineAt).toLocaleDateString("es-CO") : "Sin definir"}</strong></div>
          <div><span>Fase actual</span><strong>{phaseNames[phase]}</strong></div>
        </div>
        {phase === "revision" && <div className="alert alert-warning">Existen oportunidades impagas tras los siete días. Se requiere resolver el tratamiento autorizado antes de programar el sorteo.</div>}
        </section>
        <section className="panel"><h2>Programación informativa</h2>
          <p className="muted small">La referencia prevista es la Lotería de Medellín. Debe verificarse la fecha oficial y el reglamento autorizado.</p>
          <div className="form-stack top-gap">
            <label>Fecha oficial (verificación manual)<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <button className="btn btn-primary full" disabled={phase !== "listo"} onClick={handleSchedule}>Guardar fecha informativa</button>
            <p className="small muted">Fecha guardada: {milestones.drawDate || "Ninguna"}</p>
          </div>
        </section>
      </div>}
      {tab === "contenido" && <AdminDrawContentEditor draw={draw} saveDetails={editDraw} />}
      {tab === "sorteos" && <div className="two-col-layout">
        <section className="panel"><h2>Crear otro sorteo</h2>
          <p className="small muted">Cada edición local tiene su propia numeración y seguimiento. Para publicar contenido e imágenes globalmente utiliza «Contenido e imágenes» en Supabase.</p>
          <form className="form-stack top-gap" onSubmit={handleAddDraw}>
            <label>Nombre del sorteo<input required minLength={5} maxLength={90} value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)} placeholder="Ej. Edición especial de diciembre" /></label>
            <label>Premio<input required minLength={2} maxLength={90} value={newPrize}
              onChange={(e) => setNewPrize(e.target.value)} placeholder="Ej. Smartphone premium" /></label>
            <label>Descripción<input maxLength={200} value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)} placeholder="Texto breve para el carrusel" /></label>
            <button className="btn btn-primary">Crear edición local</button>
          </form>
        </section>
        <section className="panel"><h2>Publicación de sorteos</h2>
          <div className="draw-admin-list">{draws.map((d) => <article key={d.id} className="draw-admin-item">
            <div><strong>{d.title}</strong><p className="small muted">{d.prize}</p>
              <span className={"tag " + (d.enabled ? "tag-green" : "tag-amber")}>{d.enabled ? "Visible" : "Oculto"}</span></div>
            <div className="draw-admin-actions">
              <button type="button" className="btn btn-secondary btn-small" onClick={() => { chooseDraw(d.id); setTab("contenido"); }}>Editar contenido</button>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => handleToggleDraw(d.id, !d.enabled)}>
                {d.enabled ? "Deshabilitar" : "Habilitar"}
              </button>
            </div>
          </article>)}</div>
          <p className="small muted top-gap">Ocultar un sorteo no elimina las oportunidades ni modifica pagos. Esta gestión de números es local; el acceso a la página sí requiere autorización de administrador.</p>
        </section>
      </div>}
    </>}
    <div className="admin-reset"><button type="button" className="btn btn-ghost btn-small" onClick={() => {
      if (window.confirm("¿Borrar todas las selecciones y reportes locales de este navegador?")) { reset(); setSuccess("Datos locales reiniciados."); }
    }}>Reiniciar datos locales</button></div>
  </div>;
}

export default function AdminPage(){return <AdminAccessGate><LocalAdminPage/></AdminAccessGate>;}
