"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { money, type DemoState } from "@/lib/domain";
import { summarizeAdminDemo } from "@/lib/adminMetrics";
import { oportuniaClient } from "@/lib/oportuniaSupabase";

type QuickTab = "pagos" | "clientes" | "sorteos" | "verificacion";
type RemoteMetrics = { catalog: number; visible: number; pendingReviews: number; verifiedResults: number; accounts: number; paymentReports: number };

function ActivityChart({ trend }: { trend: ReturnType<typeof summarizeAdminDemo>["trend"] }) {
  const peak = Math.max(1000, ...trend.flatMap(day => [day.reported, day.approved]));
  const coord = (value: number, index: number) => {
    const x = 52 + index * 690 / Math.max(1, trend.length - 1);
    const y = 204 - (value / peak) * 154;
    return x.toFixed(1) + "," + y.toFixed(1);
  };
  const reported = trend.map((day, i) => coord(day.reported, i)).join(" ");
  const approved = trend.map((day, i) => coord(day.approved, i)).join(" ");
  return <div className="op-chart-wrap">
    <svg className="op-chart-svg" viewBox="0 0 790 246" role="img" aria-label="Tendencia de referencias reportadas y aprobaciones simuladas por día">
      <defs><linearGradient id="op-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#3fe0ab" stopOpacity=".28"/><stop offset="1" stopColor="#3fe0ab" stopOpacity="0"/></linearGradient></defs>
      {[0, 1, 2, 3].map(i => {
        const y = 50 + i * (154 / 3);
        return <g key={i}><line x1="52" x2="742" y1={y} y2={y} stroke="#436478" strokeDasharray="5 7" strokeOpacity=".58"/>
          <text x="44" y={y + 4} fontSize="12" fill="#a7bac8" textAnchor="end">{Math.round(peak * (3 - i) / 3 / 1000)}k</text></g>;
      })}
      <polygon points={"52,204 " + reported + " 742,204"} fill="url(#op-chart-fill)"/>
      <polyline points={reported} stroke="#40e0ad" strokeWidth="3.5" strokeLinejoin="round" fill="none"/>
      <polyline points={approved} stroke="#83a7ff" strokeWidth="3" strokeLinejoin="round" fill="none"/>
      {trend.filter((_, index) => index === 0 || index === trend.length - 1 || index % Math.max(1, Math.round(trend.length / 5)) === 0).map(day => {
        const index = trend.findIndex(item => item.key === day.key);
        const x = 52 + index * 690 / Math.max(1, trend.length - 1);
        return <text key={day.key} x={x} y="230" fontSize="12" textAnchor="middle" fill="#a7bac8">{day.key.slice(5)}</text>;
      })}
    </svg>
    <div className="op-legend"><span><i className="op-legend-report"/> Referencias reportadas</span><span><i className="op-legend-approved"/> Aprobaciones de prueba</span></div>
  </div>;
}

export function AdminDashboard({ state, drawId, onOpenTab }: {
  state: DemoState;
  drawId: string;
  onOpenTab: (tab: QuickTab) => void;
}) {
  const [days, setDays] = useState(14);
  const [remote, setRemote] = useState<RemoteMetrics | "error" | null>(null);
  const summary = useMemo(() => summarizeAdminDemo(state, drawId, days), [state, drawId, days]);
  const methodPeak = Math.max(1, ...summary.byMethod.map(method => method.count));
  const statuses = summary.statuses;
  const totalReports = Math.max(1, summary.reportsCount);
  const approvedPercent = statuses.approved / totalReports * 100;
  const pendingPercent = statuses.pending / totalReports * 100;
  const donut = "conic-gradient(#42d8a5 0 " + approvedPercent + "%, #ffc46b " + approvedPercent + "% " + (approvedPercent + pendingPercent) + "%, #f58d95 " + (approvedPercent + pendingPercent) + "% 100%)";

  useEffect(() => {
    let active = true;
    const client = oportuniaClient();
    void Promise.all([
      client.from("draw_catalog").select("id,enabled"),
      client.from("draw_reviews").select("id,status"),
      client.from("draw_results").select("id,verified_at"),
      client.from("customer_profiles").select("user_id"),
      client.from("bank_recon_claims").select("id,customer_user_id"),
    ]).then(([catalog, reviews, results, accounts, paymentReports]) => {
      if (!active) return;
      if (catalog.error || reviews.error || results.error || accounts.error || paymentReports.error) { setRemote("error"); return; }
      setRemote({
        catalog: catalog.data?.length ?? 0,
        visible: catalog.data?.filter(item => item.enabled).length ?? 0,
        pendingReviews: reviews.data?.filter(item => item.status === "pending").length ?? 0,
        verifiedResults: results.data?.filter(item => item.verified_at !== null).length ?? 0,
        accounts: accounts.data?.length ?? 0,
        paymentReports: paymentReports.data?.length ?? 0,
      });
    }).catch(() => { if (active) setRemote("error"); });
    return () => { active = false; };
  }, []);

  return <div className="op-dashboard">
    <section className="op-dash-hero">
      <div><span className="op-dash-kicker">◆ CENTRO DE CONTROL · VISTA PRIVADA</span><h2>Oportunia <em>Analytics</em></h2>
        <p>Resumen operativo para decidir con claridad. Las cifras de oportunidades y pagos son exclusivamente pruebas guardadas en este navegador.</p></div>
      <button type="button" className="op-dash-cta" onClick={() => window.location.assign("/admin/conciliacion")}>Abrir conciliación ↗</button>
    </section>
    <div className="op-dash-kpis">
      <article className="op-dash-kpi"><span>Aprobado en simulación</span><strong>{money(summary.simulatedApprovedAmount)}</strong><small>No equivale a recaudo bancario</small><b aria-hidden="true">◈</b></article>
      <article className="op-dash-kpi"><span>Reportado pendiente</span><strong>{money(summary.pendingAmount)}</strong><small>{statuses.pending} referencias por revisar</small><b aria-hidden="true">◷</b></article>
      <article className="op-dash-kpi"><span>Oportunidades ocupadas</span><strong>{summary.occupied} <i>/ 200</i></strong><small>{summary.available} disponibles · prueba local</small><b aria-hidden="true">◇</b></article>
      <article className="op-dash-kpi"><span>Clientes registrados</span><strong>{summary.customers}</strong><small>Distintos por celular en este navegador</small><b aria-hidden="true">♧</b></article>
    </div>
    <div className="op-dash-grid">
      <section className="op-dash-card op-dash-wide">
        <header className="op-card-header"><div><span className="op-dash-kicker">MOVIMIENTOS · COP</span><h3>Tendencia de reportes</h3></div>
          <label className="op-period-label">Periodo <select aria-label="Periodo de la gráfica" value={days} onChange={event => setDays(Number(event.target.value))}><option value={7}>7 días</option><option value={14}>14 días</option><option value={30}>30 días</option></select></label></header>
        <ActivityChart trend={summary.trend} />
      </section>
      <section className="op-dash-card">
        <header className="op-card-header"><div><span className="op-dash-kicker">ESTADO DE REPORTES</span><h3>Flujo de pagos demo</h3></div></header>
        <div className="op-status-donut" style={{ background: summary.reportsCount ? donut : "#263f50" }}>
          <div><strong>{summary.reportsCount}</strong><span>reportes</span></div>
        </div>
        <div className="op-status-list"><span><i className="op-green"/> Aprobados <strong>{statuses.approved}</strong></span>
          <span><i className="op-amber"/> Pendientes <strong>{statuses.pending}</strong></span>
          <span><i className="op-pink"/> Rechazados <strong>{statuses.rejected}</strong></span></div>
      </section>
      <section className="op-dash-card">
        <header className="op-card-header"><div><span className="op-dash-kicker">DISTRIBUCIÓN</span><h3>Canales reportados</h3></div></header>
        {summary.byMethod.length ? <div className="op-methods">{summary.byMethod.map(method => <div key={method.name} className="op-method">
          <div><span>{method.name}</span><strong>{method.count}</strong></div>
          <div className="op-bar"><span style={{ width: method.count / methodPeak * 100 + "%" }}/></div></div>)}</div> : <p className="op-no-data">Aún no hay referencias registradas en esta demo.</p>}
        <p className="op-caption">Canal declarado por el usuario. No demuestra que haya dinero recibido.</p>
      </section>
      <section className="op-dash-card">
        <header className="op-card-header"><div><span className="op-dash-kicker">ESTADO DEL SORTEO</span><h3>Ocupación de prueba</h3></div></header>
        <div className="op-occupancy"><strong>{Math.round(summary.occupied / 200 * 1000) / 10}%</strong><span>{summary.occupied} de 200 oportunidades</span></div>
        <div className="op-bar op-occupancy-bar"><span style={{width: summary.occupied / 200 * 100 + "%"}} /></div>
        <div className="op-status-list"><span>Pagadas en demo <strong>{summary.paidOrders}</strong></span><span>Con abonos parciales <strong>{summary.partial}</strong></span><span>Reservadas sin abonar <strong>{summary.reserved}</strong></span></div>
      </section>
      <section className="op-dash-card">
        <header className="op-card-header"><div><span className="op-dash-kicker">DATOS DE SUPABASE</span><h3>Catálogo y contenido</h3></div><Link href="/admin/catalogo">Gestionar ↗</Link></header>
        {remote === null ? <p className="op-no-data">Consultando datos de Supabase…</p> :
          remote === "error" ? <p role="alert" className="op-no-data">No se pudieron consultar los indicadores remotos. Verifica conexión y permisos.</p> :
          <div className="op-remote-grid"><div><strong>{remote.catalog}</strong><span>Ediciones</span></div><div><strong>{remote.visible}</strong><span>Visibles</span></div><div><strong>{remote.pendingReviews}</strong><span>Opiniones pendientes</span></div><div><strong>{remote.verifiedResults}</strong><span>Resultados verificados</span></div><div><strong>{remote.accounts}</strong><span>Cuentas registradas</span></div><div><strong>{remote.paymentReports}</strong><span>Referencias reportadas</span></div></div>}
        <p className="op-caption">Estos indicadores proceden de Supabase (no representan ventas). Las cifras financieras anteriores son simulaciones del navegador.</p>
        <div className="op-dash-footer"><Link href="/admin/clientes">Abrir CRM ↗</Link><Link href="/admin/numeros">Auditar números demo ↗</Link></div>
      </section>
      <section className="op-dash-card op-dash-wide">
        <header className="op-card-header"><div><span className="op-dash-kicker">OPERACIONES RECIENTES</span><h3>Últimos reportes de prueba</h3></div><button className="op-link-button" type="button" onClick={() => onOpenTab("pagos")}>Revisar todos ↗</button></header>
        {summary.recent.length ? <div className="table-scroll"><table className="op-recent-table"><thead><tr><th>Referencia</th><th>Canal declarado</th><th>Valor</th><th>Estado</th></tr></thead><tbody>{summary.recent.map(report =>
          <tr key={report.id}><td>{report.reference}</td><td>{report.method}</td><td>{money(report.amount)}</td><td><span className={"op-state op-" + report.status}>{report.status}</span></td></tr>)}</tbody></table></div> :
          <p className="op-no-data">No existen reportes de prueba para este sorteo.</p>}
      </section>
    </div>
    <div className="op-dash-footer"><span>● Vista de simulación · sin transacciones bancarias verificadas</span><button type="button" onClick={() => onOpenTab("clientes")}>Clientes ↗</button><button type="button" onClick={() => onOpenTab("sorteos")}>Sorteos ↗</button></div>
  </div>;
}
