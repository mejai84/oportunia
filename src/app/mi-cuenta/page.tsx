"use client";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { assignedCount, isEligible, money, PRICE, shortId, salesProgressPercent, salesProgressStatus, reachedSalesUpdates } from "@/lib/domain";
export default function MiCuentaPage() {
  const { state, hydrated } = useApp();
  const progress = salesProgressPercent(state);
  const progressLabel = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(progress) + "%";
  const progressStatus = salesProgressStatus(state);
  const updates = reachedSalesUpdates(state);
  return <div className="container page-space">
    <div className="page-title"><span className="overline">PORTAL DEL COMPRADOR · DEMO</span>
      <h1>Mis <span className="gradient-text">oportunidades.</span></h1>
      <p className="muted">Se muestran las oportunidades creadas en este navegador. La versión real requerirá iniciar sesión.</p>
    </div>
    {!hydrated ? <p>Cargando…</p> : state.opportunities.length === 0 ?
      <div className="panel empty-state"><span>◇</span><h2>Todavía no tienes oportunidades</h2><p>Escoge tus primeros diez números o deja que el sistema los asigne.</p><Link href="/numeros" className="btn btn-primary">Crear oportunidad de prueba</Link></div> :
      <div className="stack">
        <section className="panel sales-progress-panel" aria-labelledby="sales-progress-title">
          <div className="panel-heading">
            <div><span className="overline">SEGUIMIENTO DEL SORTEO · DEMOSTRACIÓN</span><h2 id="sales-progress-title">Avance de compras</h2></div>
            <strong className="sales-progress-percent">{progressLabel}</strong>
          </div>
          <div className="progress-track sales-progress-track" role="progressbar" aria-label="Porcentaje de colocación simulada"
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <div className="progress-fill" style={{ width: progress + "%" }} />
          </div>
          <h3 className="sales-progress-status">{progressStatus.title}</h3>
          <p className="muted small">{progressStatus.message}</p>
          <p className="sales-progress-disclaimer">Este porcentaje refleja solo oportunidades de prueba creadas en este navegador. No representa ventas reales ni confirma una fecha de sorteo.</p>
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
        const reports = state.reports.filter((r) => r.orderId === o.id);
        return <article className="panel account-card" key={o.id}>
          <div className="panel-heading">
            <div><span className="small muted">Oportunidad {shortId(o.id)}</span><h2>{o.customer.name}</h2></div>
            <span className={"tag " + (eligible ? "tag-green" : "tag-amber")}>{eligible ? "HABILITADA" : "NO PARTICIPA AÚN"}</span>
          </div>
          <div className="info-grid three">
            <div className="info-tile"><span className="small muted">Abonado</span><strong>{money(o.paid)}</strong></div>
            <div className="info-tile"><span className="small muted">Saldo</span><strong>{money(PRICE - o.paid)}</strong></div>
            <div className="info-tile"><span className="small muted">Números asignados</span><strong>{assignedCount(o)} / 50</strong></div>
          </div>
          <div className="progress-label"><span>Progreso de pago</span><strong>{Math.round(o.paid / PRICE * 100)}%</strong></div>
          <div className="progress-track"><div className="progress-fill" style={{ width: String(o.paid / PRICE * 100) + "%" }} /></div>
          <div className="number-list-label"><h3>{o.selectionMode === "automatic" ? "Mis 10 números automáticos" : "Mis 10 números elegidos"}</h3><span className="small muted">{o.paid >= 10000 ? "Asignados" : "Reservados"}</span></div>
          <div className="chips">{o.selected.map((n) => <span className="chip chip-blue" key={n}>{n}</span>)}</div>
          <div className="number-list-label"><h3>Números aleatorios</h3><span className="small muted">{o.random.length} de 40</span></div>
          {o.random.length ? <div className="chips">{o.random.map((n) => <span className="chip" key={n}>{n}</span>)}</div> :
            <p className="small muted">Se asignarán después de aprobar los abonos correspondientes.</p>}
          <div className="divider" />
          <div className="account-footer"><span className="small muted">{reports.length} reporte(s) · {reports.filter((r) => r.status === "pendiente").length} pendiente(s)</span>
            {eligible ? <span className="status-ok">✓ 50 números habilitados</span> : <Link href="/pagos" className="btn btn-primary btn-small">Reportar abono →</Link>}
          </div>
        </article>;
      })}</div>}
  </div>;
}
