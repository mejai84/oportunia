"use client";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import { CUSTOM_NUMBERS, MAX_OPPORTUNITIES, normalizeNumber, reservedNumbers, type Plan } from "@/lib/domain";
const plans: { value: Plan; title: string; detail: string }[] = [
  { value: "contado", title: "Pago completo", detail: "1 pago de $50.000" },
  { value: "dos-cuotas", title: "2 cuotas", detail: "2 pagos de $25.000" },
  { value: "tres-cuotas", title: "3 cuotas", detail: "$20.000 + $15.000 + $15.000" },
];
export default function NumerosPage() {
  const { state, hydrated, createOrder } = useApp();
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [numberInput, setNumberInput] = useState("");
  const [page, setPage] = useState(0);
  const [plan, setPlan] = useState<Plan>("tres-cuotas");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const taken = useMemo(() => reservedNumbers(state), [state]);
  const soldOut = state.opportunities.length >= MAX_OPPORTUNITIES;
  function addNumber(raw: string) {
    setError("");
    const n = normalizeNumber(raw);
    if (!n) return setError("Ingresa un número válido entre 0000 y 9999.");
    if (taken.has(n)) return setError("Este número ya está reservado por otra oportunidad.");
    if (selected.includes(n)) return setError("Ya seleccionaste ese número.");
    if (selected.length >= CUSTOM_NUMBERS) return setError("Ya escogiste tus 10 números.");
    setSelected((prev) => [...prev, n]);
    setNumberInput("");
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (soldOut) return setError("No quedan oportunidades disponibles.");
    try {
      createOrder({ customer: { name, phone, email }, selected, plan });
      router.push("/pagos");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo crear la orden."); }
  }
  return <div className="container page-space">
    <div className="page-title"><span className="overline">PASO 01 · PERSONALIZA TU OPORTUNIDAD</span>
      <h1>Escoge tus <span className="gradient-text">10 números.</span></h1>
      <p className="muted">Entre 0000 y 9999. Los 40 restantes se asignarán progresivamente cuando se confirmen tus abonos.</p>
    </div>
    <div className="two-col-layout"><div className="stack">
      <section className="panel">
        <div className="panel-heading"><div><h2>Explora los números</h2><p className="muted small">Selecciona desde la cuadrícula o escribe un número.</p></div><span className="counter-pill">{selected.length} / 10</span></div>
        <div className="number-search">
          <input aria-label="Número de cuatro cifras" inputMode="numeric" maxLength={4} placeholder="Ej. 0007"
            value={numberInput} onChange={(e) => setNumberInput(e.target.value.replace(/[^0-9]/g, ""))}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNumber(numberInput); } }} />
          <button type="button" className="btn btn-primary" onClick={() => addNumber(numberInput)} disabled={!hydrated || soldOut}>Agregar número</button>
        </div>
        <div className="legend"><span><i className="legend-dot free" /> Disponible</span><span><i className="legend-dot chosen" /> Elegido</span><span><i className="legend-dot busy" /> Reservado</span></div>
        <div className="number-grid">{Array.from({ length: 100 }, (_, i) => {
          const n = String(page * 100 + i).padStart(4, "0");
          const chosen = selected.includes(n), busy = taken.has(n);
          return <button type="button" key={n} disabled={!hydrated || busy || soldOut}
            className={"number-cell" + (chosen ? " chosen" : "") + (busy ? " busy" : "")} aria-pressed={chosen}
            onClick={() => chosen ? setSelected((prev) => prev.filter((x) => x !== n)) : addNumber(n)}>{n}</button>;
        })}</div>
        <div className="pagination">
          <button className="btn btn-ghost" type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>← Anterior</button>
          <span className="small muted">Página {page + 1} de 100</span>
          <button className="btn btn-ghost" type="button" disabled={page === 99} onClick={() => setPage((p) => p + 1)}>Siguiente →</button>
        </div>
      </section>
    </div><div className="stack">
      <section className="panel sticky-panel">
        <div className="panel-heading"><div><h2>Tu selección</h2><p className="muted small">10 elegidos + 40 aleatorios al pagar</p></div></div>
        <div className="selected-grid">{Array.from({ length: 10 }, (_, i) =>
          <button type="button" className={"selected-slot" + (selected[i] ? " filled" : "")} key={i}
            disabled={!selected[i]} title={selected[i] ? "Quitar " + selected[i] : "Pendiente"}
            onClick={() => setSelected((prev) => prev.filter((x) => x !== selected[i]))}>{selected[i] || "—"}</button>)}</div>
        <div className="mini-info"><span>40 números aleatorios</span><strong>Pendientes de abonos</strong></div>
        <div className="divider" /><h3>Forma de pago</h3>
        <div className="plan-options">{plans.map((p) => <label key={p.value} className={"plan-option" + (plan === p.value ? " selected" : "")}>
          <input type="radio" name="plan" checked={plan === p.value} onChange={() => setPlan(p.value)} />
          <span><strong>{p.title}</strong><small>{p.detail}</small></span></label>)}</div>
        <form onSubmit={submit} className="form-stack">
          <label>Nombre completo<input required minLength={3} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre y apellido" /></label>
          <label>Celular<input required inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="300 000 0000" /></label>
          <label>Correo (opcional)<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" /></label>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <button type="submit" className="btn btn-primary full" disabled={!hydrated || soldOut || selected.length !== 10}>Crear oportunidad de prueba →</button>
        </form>
        <p className="small muted">No se cobra dinero. Los números quedan reservados solo en este navegador de demostración.</p>
      </section>
    </div></div>
  </div>;
}
