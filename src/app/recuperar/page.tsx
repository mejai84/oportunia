"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import { isReservationExpired, normalizeNumber, previousNumberAvailability, reservedNumbers, drawIdOf } from "@/lib/domain";

export default function RecuperarPage() {
  const { state, hydrated, renewOrder } = useApp();
  const router = useRouter();
  const [orderId, setOrderId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setOrderId(new URLSearchParams(window.location.search).get("orden") || ""); }, []);
  const order = state.opportunities.find((o) => o.id === orderId);
  const expired = order ? isReservationExpired(order) : false;
  const availability = order && expired ? previousNumberAvailability(state, orderId) : null;
  const taken = order ? reservedNumbers(state, drawIdOf(order)) : new Set<string>();
  function add(raw: string) {
    setError("");
    const number = normalizeNumber(raw);
    if (!number) return setError("Ingresa un número de cuatro cifras.");
    if (taken.has(number)) return setError("Ese número ya fue asignado a otra oportunidad.");
    if (selected.includes(number)) return setError("Ese número ya está en tu selección.");
    if (selected.length >= 10) return setError("Ya completaste diez números.");
    setSelected((current) => [...current, number]); setInput("");
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    try { renewOrder(orderId, selected, accepted); router.push("/mi-cuenta"); }
    catch (e) { setError(e instanceof Error ? e.message : "No fue posible renovar."); }
  }
  return <div className="container page-space">
    <div className="page-title"><span className="overline">RECUPERAR RESERVA · DEMO</span>
      <h1>Conserva los que <span className="gradient-text">siguen libres.</span></h1>
      <p className="muted">Si otro comprador ya tomó alguno de tus números anteriores, elige otro para completar diez.</p>
    </div>
    {!hydrated ? <p>Cargando…</p> : !order || !expired ?
      <div className="panel empty-state"><h2>Esta reserva no está vencida o no existe.</h2>
        <p>La recuperación está disponible solo para reservas iniciales vencidas sin abonos confirmados.</p>
        <Link href="/mi-cuenta" className="btn btn-primary">Volver a Mi cuenta</Link>
      </div> : <div className="two-col-layout">
      <section className="panel">
        <h2>Tus diez números anteriores</h2>
        <p className="muted small">Verde: disponible para recuperar. Gris: ocupado por otra oportunidad.</p>
        <div className="recovery-numbers">{order.selected.map((number) => {
          const free = availability?.available.includes(number);
          return <button type="button" key={number} disabled={!free || selected.includes(number)}
            onClick={() => add(number)} className={"recovery-number " + (free ? "is-free" : "is-taken")}>
            <strong>{number}</strong><small>{free ? "Disponible" : "Ocupado"}</small>
          </button>;
        })}</div>
        <button type="button" className="btn btn-secondary" onClick={() => setSelected(availability?.available || [])}>
          Conservar todos los disponibles ({availability?.available.length ?? 0})
        </button>
        <div className="divider" />
        <h3>Completa los números faltantes</h3>
        <div className="number-search">
          <input aria-label="Número de reemplazo" value={input} maxLength={4} inputMode="numeric"
            placeholder="Ej. 0045" onChange={(e) => setInput(e.target.value.replace(/\D/g, ""))} />
          <button type="button" className="btn btn-primary" onClick={() => add(input)}>Agregar</button>
        </div>
        <p className="muted small top-gap">Los números se comprueban otra vez al confirmar para evitar duplicados.</p>
      </section>
      <section className="panel">
        <h2>Nueva selección · {selected.length}/10</h2>
        <div className="chips">{selected.map((n) => <button type="button" className="chip chip-blue" key={n}
          title={"Quitar " + n} onClick={() => setSelected((prev) => prev.filter((x) => x !== n))}>{n} ×</button>)}</div>
        <div className="reservation-rule top-gap"><strong>Una nueva reserva de 24 horas</strong>
          <p>Al confirmar, comienza otro plazo de 24 horas para que se apruebe el primer abono de prueba.</p></div>
        <form className="form-stack top-gap" onSubmit={submit}>
          <label className="terms-accept"><input type="checkbox" required checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)} />
            <span>Acepto las <Link href="/reglas" target="_blank" rel="noopener noreferrer">reglas de la demostración</Link>
              y entiendo que <strong>sin pagar el 100 % no participo en el sorteo</strong>.</span></label>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <button className="btn btn-primary full" disabled={selected.length !== 10 || !accepted}>Renovar reserva de prueba</button>
        </form>
      </section>
    </div>}
  </div>;
}
