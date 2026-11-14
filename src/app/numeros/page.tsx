"use client";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { CUSTOM_NUMBERS, MAX_OPPORTUNITIES, activeOrders, drawCatalog, findDraw, normalizeNumber, reservedNumbers, type Plan, type SelectionMode } from "@/lib/domain";
const plans: { value: Plan; title: string; detail: string }[] = [
  { value: "contado", title: "Pago completo", detail: "1 pago de $50.000" },
  { value: "dos-cuotas", title: "2 cuotas", detail: "2 pagos de $25.000" },
  { value: "tres-cuotas", title: "3 cuotas", detail: "$20.000 + $15.000 + $15.000" },
];
export default function NumerosPage() {
  const { state, hydrated, createOrder, activeDrawId } = useApp();
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("manual");
  const [numberInput, setNumberInput] = useState("");
  const [page, setPage] = useState(0);
  const [plan, setPlan] = useState<Plan>("contado");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const draw = findDraw(state, activeDrawId)?.enabled
    ? findDraw(state, activeDrawId)
    : drawCatalog(state).find((item) => item.enabled);
  const drawId = draw?.id ?? activeDrawId;
  const taken = useMemo(() => reservedNumbers(state, drawId), [state, drawId]);
  const soldOut = !draw || activeOrders(state, drawId).length >= MAX_OPPORTUNITIES;
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
    if (soldOut) return setError("Esta edición no está disponible.");
    if (!termsAccepted) return setError("Debes aceptar las reglas antes de reservar.");
    try {
      createOrder({ customer: { name, phone, email }, selected: selectionMode === "manual" ? selected : [], selectionMode, plan, drawId, termsAccepted });
      router.push("/pagos");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo crear la orden."); }
  }
  return <div className="container page-space">
    <div className="page-title"><span className="overline">PASO 01 · PERSONALIZA TU OPORTUNIDAD</span>
      <h1>10 números <span className="gradient-text">a tu manera.</span></h1>
      <p className="draw-selected">Edición seleccionada: <strong>{draw?.title ?? "Sin edición habilitada"}</strong></p>
      <p className="muted">Descubre cómo elegir tus primeros 10 números o recibirlos automáticamente.</p>
    </div>
    <section className="panel" style={{marginBottom:20}}><span className="overline">SELECCIÓN EN TU CUENTA</span><h2>Consulta números disponibles desde distintos dispositivos</h2><p className="muted">Puedes guardar diez números en tu cuenta con disponibilidad centralizada y vigencia de 24 horas.</p><Link href="/ensayo-reservas" className="btn btn-secondary">Abrir selección centralizada ↗</Link></section>
    <section className="panel selection-mode-panel" aria-labelledby="selection-mode-heading">
      <h2 id="selection-mode-heading">¿Cómo quieres obtener tus primeros 10 números?</h2>
      <div className="selection-mode-options">
        <label className={"selection-mode-option" + (selectionMode === "manual" ? " selected" : "")}>
          <input type="radio" name="selectionMode" checked={selectionMode === "manual"} onChange={() => { setSelectionMode("manual"); setError(""); }} />
          <span><strong>Quiero escogerlos</strong><small>Busca y selecciona personalmente 10 números disponibles.</small></span>
        </label>
        <label className={"selection-mode-option" + (selectionMode === "automatic" ? " selected" : "")}>
          <input type="radio" name="selectionMode" checked={selectionMode === "automatic"} onChange={() => { setSelectionMode("automatic"); setError(""); }} />
          <span><strong>Que Oportunia los asigne</strong><small>El sistema escogerá 10 números libres al crear la selección de vista previa.</small></span>
        </label>
      </div>
    </section>
    <div className="two-col-layout"><div className="stack">
      {selectionMode === "manual" ? <section className="panel">
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
      </section> : <section className="panel auto-allocation-panel">
        <span className="auto-allocation-icon" aria-hidden="true">✧</span>
        <h2>Nosotros elegimos los 10 por ti</h2>
        <p>Al crear la oportunidad, el sistema reservará automáticamente 10 números de cuatro cifras que estén libres en esta vista previa.</p>
        <p>Consulta la selección guardada en <strong>Mi cuenta</strong>.</p>
        <div className="alert alert-warning">Los números adicionales se distribuyen según las condiciones de cada edición.</div>
      </section>}
    </div><div className="stack">
      <section className="panel sticky-panel">
        <div className="panel-heading"><div><h2>{selectionMode === "manual" ? "Tu selección" : "Asignación automática"}</h2>
          <p className="muted small">10 iniciales + 40 aleatorios con los abonos</p></div></div>
        {selectionMode === "manual" ? <div className="selected-grid">{Array.from({ length: 10 }, (_, i) =>
          <button type="button" className={"selected-slot" + (selected[i] ? " filled" : "")} key={i}
            disabled={!selected[i]} title={selected[i] ? "Quitar " + selected[i] : "Pendiente"}
            onClick={() => setSelected((prev) => prev.filter((x) => x !== selected[i]))}>{selected[i] || "—"}</button>)}</div>
          : <div className="auto-allocation-summary"><strong>10 números automáticos</strong>
            <span>Se mostrarán al guardar tu selección.</span></div>}
        <div className="mini-info"><span>40 números aleatorios</span><strong>Pendientes de abonos</strong></div>
        <div className="divider" /><h3>Forma de pago</h3>
        <div className="plan-options">{plans.map((p) => <label key={p.value} className={"plan-option" + (plan === p.value ? " selected" : "")}>
          <input type="radio" name="plan" checked={plan === p.value} onChange={() => setPlan(p.value)} />
          <span><strong>{p.title}{p.value === "contado" && <em className="payment-recommended">Opción principal</em>}</strong><small>{p.detail}</small></span></label>)}</div>
        <p className="small muted payment-plan-hint">Elige una modalidad de referencia. Consulta el reglamento para conocer las condiciones de participación.</p>
        <form onSubmit={submit} className="form-stack">
          <label>Nombre completo<input required minLength={3} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre y apellido" /></label>
          <label>Celular<input required inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="300 000 0000" /></label>
          <label>Correo (opcional)<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" /></label>
          <div className="reservation-rule"><strong>Reserva de 24 horas</strong>
            <p>Si no se confirma el primer abono en 24 horas, los diez números reservados se liberan. Podrás recuperar los que sigan disponibles y reemplazar los ocupados.</p>
          </div>
          <label className="terms-accept"><input type="checkbox" checked={termsAccepted} required
            onChange={(e) => setTermsAccepted(e.target.checked)} />
            <span>He leído y acepto las <Link href="/reglas" target="_blank" rel="noopener noreferrer">condiciones de participación</Link>.
              Entiendo que <strong>si no pago la totalidad de la oportunidad, ninguno de mis números participa en la adjudicación del premio</strong>.</span>
          </label>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <button type="submit" className="btn btn-primary full" disabled={!hydrated || soldOut || !termsAccepted || (selectionMode === "manual" && selected.length !== 10)}>Guardar selección →</button>
        </form>
        <p className="small muted">Los datos de este formulario se guardan solo en tu navegador. Para mantener una selección en tu cuenta, utiliza la opción centralizada.</p>
      </section>
    </div></div>
  </div>;
}
