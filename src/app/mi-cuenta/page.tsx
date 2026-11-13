"use client";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { assignedCount, isEligible, money, PRICE, shortId } from "@/lib/domain";
export default function MiCuentaPage() {
  const { state, hydrated } = useApp();
  return <div className="container page-space">
    <div className="page-title"><span className="overline">PORTAL DEL COMPRADOR · DEMO</span>
      <h1>Mis <span className="gradient-text">oportunidades.</span></h1>
      <p className="muted">Se muestran las oportunidades creadas en este navegador. La versión real requerirá iniciar sesión.</p>
    </div>
    {!hydrated ? <p>Cargando…</p> : state.opportunities.length === 0 ?
      <div className="panel empty-state"><span>◇</span><h2>Todavía no tienes oportunidades</h2><p>Elige tus primeros diez números y comienza.</p><Link href="/numeros" className="btn btn-primary">Elegir números</Link></div> :
      <div className="stack">{state.opportunities.map((o) => {
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
          <div className="number-list-label"><h3>Mis 10 números elegidos</h3><span className="small muted">{o.paid >= 10000 ? "Asignados" : "Reservados"}</span></div>
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
