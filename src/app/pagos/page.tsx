"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { isReservationExpired, money, PRICE, shortId, type Method } from "@/lib/domain";
const methods: Method[] = ["Bre-B", "Nequi", "PSE", "Efectivo"];
export default function PagosPage() {
  const { state, hydrated, sendPayment } = useApp();
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState(50000);
  const [method, setMethod] = useState<Method>("Bre-B");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  function suggestedAmount(id: string): number {
    const item = state.opportunities.find((o) => o.id === id);
    if (!item) return PRICE;
    const pendingAmount = state.reports.filter((r) => r.orderId === id && r.status === "pendiente")
      .reduce((sum, r) => sum + r.amount, 0);
    const balance = Math.max(0, PRICE - item.paid - pendingAmount);
    if (item.plan === "contado") return balance;
    if (item.plan === "dos-cuotas") return Math.min(25_000, balance);
    return Math.min(item.paid === 0 ? 20_000 : 15_000, balance);
  }
  useEffect(() => {
    if (hydrated && !orderId && state.opportunities.length > 0) {
      const id = state.opportunities[state.opportunities.length - 1].id;
      setOrderId(id);
      const item = state.opportunities[state.opportunities.length - 1];
      const amount = item.plan === "contado" ? PRICE - item.paid : item.plan === "dos-cuotas" ? 25_000 : item.paid === 0 ? 20_000 : 15_000;
      setAmount(Math.max(0, Math.min(amount, PRICE - item.paid)));
    }
  }, [hydrated, orderId, state.opportunities]);
  const order = state.opportunities.find((o) => o.id === orderId);
  const expired = order ? isReservationExpired(order) : false;
  const pending = state.reports.filter((r) => r.orderId === orderId && r.status === "pendiente")
    .reduce((sum, r) => sum + r.amount, 0);
  const balance = order ? PRICE - order.paid - pending : 0;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess("");
    try {
      sendPayment({ orderId, amount, method, reference });
      setReference("");
      setSuccess("Referencia guardada localmente. No es comprobante de pago ni genera participación.");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo reportar el abono."); }
  }
  return <div className="container page-space">
    <div className="page-title"><span className="overline">PASO 02 · CONSULTA DE ABONOS</span>
      <h1>Reporta un <span className="gradient-text">abono.</span></h1>
      <p className="muted">Esta pantalla permite explorar cómo se registrarían los abonos. Los reportes son locales y no verifican transferencias ni constituyen pagos recibidos. No envíes dinero por esta pantalla.</p>
    </div>
    <div className="two-col-layout"><section className="panel">
      <h2>Nuevo reporte de pago</h2>
      {!hydrated ? <p className="muted">Cargando…</p> : state.opportunities.length === 0 ?
        <div className="empty-state"><span>◎</span><h3>Aún no tienes oportunidades</h3><p>Primero escoge tus diez números o solicita asignación automática.</p><Link className="btn btn-primary" href="/numeros">Elegir números</Link></div> :
        <form onSubmit={submit} className="form-stack top-gap">
          <label>Oportunidad<select value={orderId} onChange={(e) => { setOrderId(e.target.value); setAmount(suggestedAmount(e.target.value)); setSuccess(""); }}>
            {state.opportunities.map((o) => <option key={o.id} value={o.id}>{shortId(o.id)} · {o.customer.name}</option>)}
          </select></label>
          <div className="info-grid">
            <div className="info-tile"><span className="small muted">Abonado y aprobado</span><strong>{money(order?.paid || 0)}</strong></div>
            <div className="info-tile"><span className="small muted">Saldo para reportar</span><strong>{money(balance)}</strong></div>
          </div>
          {expired && <div className="alert alert-warning">Esta reserva inicial venció a las 24 horas. Debes recuperar tus números antes de crear otro reporte de pago. <Link href={"/recuperar?orden=" + encodeURIComponent(orderId)}>Recuperar números →</Link></div>}
          <p className="small muted">Plan seleccionado: <strong>{order?.plan === "contado" ? "Pago completo" : order?.plan === "dos-cuotas" ? "Dos cuotas" : "Tres cuotas"}</strong>. El valor sugerido corresponde al saldo o a la próxima cuota.</p>
          <label>Valor del abono (COP)<input type="number" min={1000} max={balance} step={1000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></label>
          <label>Método previsto (solo vista previa)<select value={method} onChange={(e) => setMethod(e.target.value as Method)}>{methods.map((m) => <option key={m}>{m}</option>)}</select></label>
          <label>Referencia ilustrativa<input required value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ej. REFERENCIA-123456" /></label>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          {success && <div className="alert alert-success" role="status">{success}</div>}
          <button type="submit" className="btn btn-primary full" disabled={!order || expired || balance <= 0}>Enviar reporte →</button>
        </form>}
    </section><div className="stack">
      <section className="panel"><h2>¿Qué ocurre después?</h2><div className="timeline">
        <div><span>01</span><p>Registras una referencia ilustrativa en este navegador.</p></div>
        <div><span>02</span><p>Un administrador revisa y aprueba el reporte.</p></div>
        <div><span>03</span><p>Se asignan números aleatorios según el total abonado.</p></div>
        <div><span>04</span><p>Con $50.000 confirmados, los 50 números quedan habilitados.</p></div>
      </div></section>
      <div className="alert alert-warning"><strong>Importante:</strong> los números asignados por pagos parciales NO participan en el sorteo. La reserva inicial sin pago confirmado vence a las 24 horas.</div>
      <Link className="btn btn-secondary full" href="/mi-cuenta">Ver mi cuenta y números →</Link>
    </div></div>
  </div>;
}
