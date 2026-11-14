"use client";
import Link from "next/link";
import { MyReviews } from "@/components/MyReviews";
import { CustomerBankReports } from "@/components/CustomerBankReports";
import { CustomerProfile } from "@/components/CustomerProfile";
import { CustomerNotifications } from "@/components/CustomerNotifications";
import { CustomerPaymentControl } from "@/components/CustomerPaymentControl";
import { CustomerPreviewReservations } from "@/components/CustomerPreviewReservations";
import { useApp } from "@/components/AppProvider";
import { assignedCount, isEligible, isReservationExpired, drawCatalog, findDraw, drawIdOf, previousNumberAvailability, money, PRICE, shortId, drawProgress, salesProgressStatus, reachedSalesUpdates } from "@/lib/domain";
export default function MiCuentaPage() {
  const { state, hydrated, activeDrawId, chooseDraw } = useApp();
  const activeDraw = findDraw(state, activeDrawId) ?? drawCatalog(state)[0];
  const stats = drawProgress(state, activeDraw.id);
  const progress = stats.occupiedPercent;
  const progressLabel = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(progress) + "%";
  const progressStatus = salesProgressStatus(state, new Date(), activeDraw.id);
  const updates = reachedSalesUpdates(state, activeDraw.id);
  return <div className="container page-space">
    <div className="page-title"><span className="overline">MI CUENTA · SEGUIMIENTO</span>
      <h1>Mis <span className="gradient-text">oportunidades.</span></h1>
      <p className="muted">Las selecciones y reportes que aparecen a continuación se guardan en este navegador. Para calificar sorteos debes iniciar sesión.</p>
    </div>
    {!hydrated ? <p>Cargando…</p> : state.opportunities.length === 0 ?
      <div className="panel empty-state"><span>◇</span><h2>Todavía no tienes oportunidades</h2><p>Escoge tus primeros diez números o deja que el sistema los asigne.</p><Link href="/numeros" className="btn btn-primary">Explorar selección de números</Link></div> :
      <div className="stack">
        <div className="draw-account-switch"><label htmlFor="account-draw">Avance del sorteo</label>
          <select id="account-draw" value={activeDraw.id} onChange={(e) => chooseDraw(e.target.value)}>
            {drawCatalog(state).map((draw) => <option key={draw.id} value={draw.id}>{draw.title}</option>)}
          </select>
        </div>
        <section className="panel sales-progress-panel" aria-labelledby="sales-progress-title">
          <div className="panel-heading">
            <div><span className="overline">SEGUIMIENTO LOCAL DE SELECCIONES</span><h2 id="sales-progress-title">Ocupación de oportunidades · {activeDraw.title}</h2></div>
            <strong className="sales-progress-percent">{progressLabel}</strong>
          </div>
          <div className="progress-track sales-progress-track segmented-progress" role="progressbar" aria-label="Porcentaje de ocupación local"
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <div className="segmented-progress-paid" style={{ width: stats.paidPercent + "%" }} />
            <div className="segmented-progress-reserved" style={{ width: (progress - stats.paidPercent) + "%" }} />
          </div>
          <div className="progress-metrics">
            <span><strong>{(progress - stats.paidPercent).toLocaleString("es-CO", { maximumFractionDigits: 1 })}%</strong> separadas o con abono</span>
            <span><strong>{stats.paidPercent.toLocaleString("es-CO", { maximumFractionDigits: 1 })}%</strong> pagadas al 100 %</span>
          </div>
          <h3 className="sales-progress-status">{progressStatus.title}</h3>
          <p className="muted small">{progressStatus.message}</p>
          <p className="sales-progress-disclaimer">Este porcentaje comienza en 0 % y refleja solo ocupación en este navegador: reservas y oportunidades pagadas, sin mezclarlas con ventas confirmadas. No representa cifras reales ni confirma una fecha de sorteo.</p>
          <div className="sales-updates">
            <h3>Novedades del proceso</h3>
            {updates.length ? <ul className="sales-update-list">{updates.slice(0, 3).map((update) =>
              <li key={update.threshold}><span className="sales-update-percent">{update.threshold}%</span>
                <div><strong>{update.title}</strong><p>{update.message}</p></div></li>)}</ul> :
              <p className="small muted">Aquí aparecerán novedades al alcanzar nuevos porcentajes de avance.</p>}
            <p className="small muted">Los avisos por WhatsApp o correo aún no están habilitados. Se requerirá consentimiento y un sistema de ventas verificado.</p>
          </div>
        </section>
        {state.opportunities.map((o) => {
        const eligible = isEligible(o);
        const expired = isReservationExpired(o);
        const orderDraw = findDraw(state, drawIdOf(o));
        const available = expired ? previousNumberAvailability(state, o.id) : null;
        const reports = state.reports.filter((r) => r.orderId === o.id);
        return <article className="panel account-card" key={o.id}>
          <div className="panel-heading">
            <div><span className="small muted">{orderDraw?.title || "Sorteo"} · Oportunidad {shortId(o.id)}</span><h2>{o.customer.name}</h2></div>
            <span className={"tag " + (eligible ? "tag-green" : expired ? "tag-red" : "tag-amber")}>{eligible ? "HABILITADA" : expired ? "RESERVA VENCIDA" : "NO PARTICIPA AÚN"}</span>
          </div>
          {!eligible && <div className="eligibility-warning" role="note"><strong>Importante: tus números NO participan.</strong> Solo podrás participar cuando el 100 % de la oportunidad esté pagado y confirmado.</div>}
          {expired && <div className="alert alert-warning">La reserva inicial venció a las 24 horas. Sus números se liberaron; puedes recuperar los que aún estén disponibles y reemplazar los ocupados.</div>}
          {!expired && o.paid === 0 && <p className="small muted">Reserva válida hasta: {new Date(o.reservationExpiresAt || new Date(new Date(o.createdAt).getTime() + 86_400_000)).toLocaleString("es-CO")} (hora local del dispositivo).</p>}
          <div className="info-grid three">
            <div className="info-tile"><span className="small muted">Abonado</span><strong>{money(o.paid)}</strong></div>
            <div className="info-tile"><span className="small muted">Saldo</span><strong>{money(PRICE - o.paid)}</strong></div>
            <div className="info-tile"><span className="small muted">Números asignados</span><strong>{assignedCount(o)} / 50</strong></div>
          </div>
          <div className="progress-label"><span>Progreso de pago</span><strong>{Math.round(o.paid / PRICE * 100)}%</strong></div>
          <div className="progress-track"><div className="progress-fill" style={{ width: String(o.paid / PRICE * 100) + "%" }} /></div>
          <div className="number-list-label"><h3>{o.selectionMode === "automatic" ? "Mis 10 números automáticos" : "Mis 10 números elegidos"}</h3><span className="small muted">{expired ? "Históricos; ya no reservados" : o.paid >= 10000 ? "Asignados" : "Reservados"}</span></div>
          <div className="chips">{o.selected.map((n) => <span className={"chip " + (expired && available?.taken.includes(n) ? "chip-taken" : "chip-blue")} key={n}>{n}</span>)}</div>
          {expired && <p className="small muted">De tus diez números anteriores, {available?.available.length} siguen disponibles y {available?.taken.length} están ocupados.</p>}
          <div className="number-list-label"><h3>Números aleatorios</h3><span className="small muted">{o.random.length} de 40</span></div>
          {o.random.length ? <div className="chips">{o.random.map((n) => <span className="chip" key={n}>{n}</span>)}</div> :
            <p className="small muted">Se asignarán después de aprobar los abonos correspondientes.</p>}
          <div className="divider" />
          <div className="account-footer"><span className="small muted">{reports.length} reporte(s) · {reports.filter((r) => r.status === "pendiente").length} pendiente(s)</span>
            {eligible ? <span className="status-ok">✓ 50 números habilitados</span> : expired ? <Link href={"/recuperar?orden=" + encodeURIComponent(o.id)} className="btn btn-primary btn-small">Recuperar mis números →</Link> : <Link href="/pagos" className="btn btn-primary btn-small">Reportar abono →</Link>}
          </div>
        </article>;
      })}</div>}
    <CustomerPreviewReservations />
    <CustomerPaymentControl />
    <CustomerNotifications />
    <CustomerProfile />
    <CustomerBankReports mode="history" />
    <MyReviews />
  </div>;
}
