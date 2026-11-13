"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { AdminAccessGate } from "@/components/AdminAccessGate";
import { oportuniaClient } from "@/lib/oportuniaSupabase";
import { money } from "@/lib/domain";
import {
  parseBankCsv, suggestedClaimForMovement, normalizeReference, normalizeAlias,
  type ReconAudit, type ReconBank, type ReconClaim, type ReconMovement, type ImportRow,
} from "@/lib/reconciliation";

type Section = "movimientos" | "reportes" | "auditoria" | "instrucciones";
const TEMPLATE = "banco;cuenta;fecha;tipo;valor;referencia;descripcion\nBANCOLOMBIA;BANCOLOMBIA_PRINCIPAL;2026-11-13;ABONO;50000;MOV0001;Transferencia recibida\n";
const statusLabel: Record<string, string> = {
  unmatched: "Sin conciliar", matched: "Conciliado contra extracto",
  ignored: "Descartado", pending: "Por verificar", rejected: "Rechazado",
};
function friendlyError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return "No fue posible completar la operación.";
}

function ReconciliationWorkspace() {
  const client = useMemo(() => oportuniaClient(), []);
  const [movements, setMovements] = useState<ReconMovement[]>([]);
  const [claims, setClaims] = useState<ReconClaim[]>([]);
  const [audit, setAudit] = useState<ReconAudit[]>([]);
  const [section, setSection] = useState<Section>("movimientos");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [parsed, setParsed] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [sourceChecked, setSourceChecked] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bank, setBank] = useState<ReconBank>("BANCOLOMBIA");
  const [accountAlias, setAccountAlias] = useState("");
  const [customerLabel, setCustomerLabel] = useState("");
  const [claimedReference, setClaimedReference] = useState("");
  const [expectedAmount, setExpectedAmount] = useState(50000);

  const refresh = useCallback(async () => {
    const [movementsResult, claimsResult, auditResult] = await Promise.all([
      client.from("bank_recon_movements").select("*").order("imported_at", {ascending:false}).limit(800),
      client.from("bank_recon_claims").select("*").order("created_at", {ascending:false}).limit(800),
      client.from("bank_recon_audit").select("*").order("created_at", {ascending:false}).limit(100),
    ]);
    if (movementsResult.error || claimsResult.error || auditResult.error) {
      throw new Error("No se pudo consultar el libro de conciliación. Comprueba que la migración de Supabase esté aplicada y la cuenta tenga permisos.");
    }
    setMovements((movementsResult.data || []) as ReconMovement[]);
    setClaims((claimsResult.data || []) as ReconClaim[]);
    setAudit((auditResult.data || []) as ReconAudit[]);
  }, [client]);

  useEffect(() => {
    let live = true;
    void refresh().catch(err => { if (live) setError(friendlyError(err)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [refresh]);

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setError(""); setNotice(""); setParsed([]); setSourceChecked(false);
    if (!file) return;
    try {
      if (file.size > 350000) throw new Error("El CSV no puede superar 350 KB.");
      if (!/\.csv$/i.test(file.name)) throw new Error("Solo se acepta el CSV normalizado. Convierte el extracto sin compartir contraseñas.");
      const data = parseBankCsv(await file.text());
      setParsed(data);
      setFileName(file.name.slice(0,120));
      setNotice("Archivo revisado: " + data.length + " filas de abonos. Aún NO se han importado.");
    } catch (err) { setError(friendlyError(err)); setFileName(""); }
  }

  async function importMovements() {
    if (!sourceChecked || !parsed.length) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const { data, error: requestError } = await client.rpc("import_bank_recon_movements", {
        p_rows: parsed, p_source_label: fileName,
      });
      if (requestError) throw requestError;
      await refresh();
      setNotice("Importación registrada: " + String(data?.inserted ?? 0) + " nuevos y " +
        String(data?.duplicates ?? 0) + " repetidos ignorados. No es confirmación automática del banco.");
      setParsed([]); setSourceChecked(false); setFileName("");
    } catch (err) { setError(friendlyError(err)); }
    finally { setBusy(false); }
  }

  async function submitClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const {error: requestError} = await client.rpc("create_bank_recon_claim", {
        p_bank: bank, p_account_alias: normalizeAlias(accountAlias),
        p_customer_label: customerLabel.trim(),
        p_reference: normalizeReference(claimedReference), p_amount_cop: expectedAmount,
      });
      if (requestError) throw requestError;
      await refresh();
      setCustomerLabel(""); setClaimedReference("");
      setNotice("Reporte recibido para conciliación; no se ha confirmado ningún ingreso bancario.");
    } catch (err) { setError(friendlyError(err)); }
    finally { setBusy(false); }
  }

  async function matchItem(movement: ReconMovement, claim: ReconClaim) {
    if (!window.confirm("Cruzar exclusivamente la referencia " + movement.transaction_reference +
      " y " + money(movement.amount_cop) + " de " + movement.bank + "/" + movement.account_alias +
      " con el reporte de " + claim.customer_label +
      "? Este paso solo acredita coincidencia con el extracto cargado, NO verifica el origen del archivo ni habilita números.")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const {error: requestError} = await client.rpc("match_bank_recon_movement", {
        p_movement_id: movement.id, p_claim_id: claim.id,
      });
      if (requestError) throw requestError;
      await refresh();
      setNotice("Coincidencia registrada en la base de datos con auditoría. No se asignaron números ni se confirmó una venta.");
    } catch (err) { setError(friendlyError(err)); }
    finally { setBusy(false); }
  }

  async function closeItem(kind: "movement" | "claim", rowId: string) {
    const reason = window.prompt("Escribe el motivo del descarte (mínimo 10 caracteres). Quedará registrado en la auditoría.");
    if (reason === null) return;
    if (reason.trim().length < 10 || reason.trim().length > 300) {
      setError("El motivo debe tener entre 10 y 300 caracteres."); return;
    }
    if (!window.confirm("¿Confirmas cerrar este registro sin conciliarlo?")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const {error: requestError} = await client.rpc("close_bank_recon_item", {
        p_kind: kind, p_id: rowId, p_reason: reason.trim(),
      });
      if (requestError) throw requestError;
      await refresh();
      setNotice("Registro cerrado. La acción y el motivo quedaron en auditoría.");
    } catch (err) { setError(friendlyError(err)); }
    finally { setBusy(false); }
  }

  const balance = useMemo(() => ({
    imported: movements.reduce((sum, m) => sum + m.amount_cop, 0),
    reconciled: movements.filter(m => m.status === "matched").reduce((sum, m) => sum + m.amount_cop, 0),
    pending: movements.filter(m => m.status === "unmatched").reduce((sum, m) => sum + m.amount_cop, 0),
    movementsPending: movements.filter(m => m.status === "unmatched").length,
    claimsPending: claims.filter(c => c.status === "pending").length,
  }), [movements,claims]);
  const filtered = movements.filter(m =>
    (statusFilter === "all" || m.status === statusFilter)
    && (!search || [m.transaction_reference,m.account_alias,m.bank,m.description].some(value =>
      value.toLowerCase().includes(search.toLowerCase().trim()))));

  return <div className="container page-space bank-page">
    <div className="bank-head">
      <div><span className="overline">OPERACIONES · TESORERÍA</span><h1>Conciliación <span className="gradient-text">bancaria.</span></h1>
        <p>Control centralizado de extractos, referencias, coincidencias y auditoría en Supabase. Sin conexión a credenciales bancarias.</p></div>
      <Link className="btn btn-secondary" href="/admin">Volver al panel</Link>
    </div>
    <div role="note" className="bank-notice"><strong>Importante:</strong> los movimientos importados proceden de archivos suministrados por un administrador.
      Su procedencia no se comprueba mediante API bancaria. Un dato conciliado significa que coincidió con el archivo cargado, no que exista una confirmación bancaria automática.
      Las reservas y abonos de la demo siguen separados; esta sección no asigna números ni activa sorteos reales.</div>
    <div className="bank-kpis">
      <article><span>Abonos en archivos</span><strong>{money(balance.imported)}</strong><small>{movements.length} movimientos importados</small></article>
      <article><span>Conciliados con archivos</span><strong>{money(balance.reconciled)}</strong><small>No implica verificación por API</small></article>
      <article><span>Sin conciliar</span><strong>{money(balance.pending)}</strong><small>{balance.movementsPending} movimientos por revisar</small></article>
      <article><span>Reportes pendientes</span><strong>{balance.claimsPending}</strong><small>Referencias por cruzar</small></article>
    </div>
    <nav className="bank-nav" aria-label="Secciones de conciliación">
      {(["movimientos","reportes","auditoria","instrucciones"] as Section[]).map(key =>
        <button type="button" key={key} aria-pressed={section===key} className={section===key?"active":""}
          onClick={() => {setSection(key);setError("");}}>{key==="movimientos"?"Extractos y movimientos":key==="reportes"?"Pagos reportados":key==="auditoria"?"Auditoría":"Instrucciones"}</button>)}
    </nav>
    {error && <div className="alert alert-error bank-msg" role="alert">{error}</div>}
    {notice && <div className="alert alert-success bank-msg" role="status">{notice}</div>}
    {loading ? <div className="panel">Cargando conciliación…</div> :
    section==="movimientos" ? <>
      <section className="bank-panel">
        <header><div><span className="overline">01 · EXTRACTO OFICIAL</span><h2>Importar abonos desde CSV</h2></div>
          <a className="btn btn-secondary btn-small" href={"data:text/csv;charset=utf-8,"+encodeURIComponent(TEMPLATE)} download="oportunia_plantilla_abonos.csv">Descargar plantilla</a></header>
        <p>Exporta el movimiento desde tu banco, transforma sus columnas a la plantilla y conserva la referencia única de cada abono. Los CSV deben incluir <strong>banco; cuenta; fecha; tipo; valor; referencia; descripcion</strong>. El valor es un entero COP sin separadores. El campo cuenta es un alias interno consistente, no el número bancario completo. Para los reportes de clientes usa BANCOLOMBIA_PRINCIPAL o NEQUI_PRINCIPAL, según la cuenta receptora.</p>
        <label className="bank-file">Archivo CSV normalizado (máximo 300 movimientos)<input type="file" accept=".csv,text/csv,text/plain" disabled={busy} onChange={e=>void selectFile(e)}/></label>
        {parsed.length>0&&<div className="bank-import-preview">
          <strong>Previsualización: {parsed.length} abonos por {money(parsed.reduce((sum,row)=>sum+row.amount_cop,0))}</strong>
          <p>Archivo: {fileName} · {parsed.map(row=>row.bank+"/"+row.account_alias).filter((item,index,list)=>list.indexOf(item)===index).join(", ")}</p>
          <div className="table-scroll"><table className="data-table"><thead><tr><th>Fecha</th><th>Banco receptor</th><th>Referencia</th><th>Importe</th></tr></thead><tbody>{parsed.slice(0,5).map((row,i)=><tr key={i}><td>{row.movement_date}</td><td>{row.bank}</td><td>{row.transaction_reference}</td><td>{money(row.amount_cop)}</td></tr>)}</tbody></table></div>
          <label className="bank-confirm"><input type="checkbox" checked={sourceChecked} onChange={e=>setSourceChecked(e.target.checked)}/> Confirmo que transcribí estos abonos desde el extracto de una cuenta receptora bajo mi control, sin incluir débitos ni registros inventados.</label>
          <button className="btn btn-primary" type="button" disabled={!sourceChecked||busy} onClick={()=>void importMovements()}>{busy?"Procesando…":"Importar y detectar duplicados"}</button>
        </div>}
      </section>
      <section className="bank-panel">
        <header><div><span className="overline">02 · CONCILIAR</span><h2>Movimientos del libro</h2></div>
          <button className="btn btn-secondary btn-small" type="button" disabled={busy} onClick={()=>void refresh().catch(err=>setError(friendlyError(err)))}>Actualizar</button></header>
        <div className="bank-filters"><input aria-label="Buscar movimiento" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar referencia o cuenta"/>
          <select aria-label="Filtrar estado" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">Todos los estados</option><option value="unmatched">Sin conciliar</option><option value="matched">Conciliados</option><option value="ignored">Descartados</option></select></div>
        {filtered.length===0?<p className="muted">No hay movimientos que coincidan con el filtro.</p>:
          <div className="bank-movements">{filtered.map(m=>{
            const candidate=suggestedClaimForMovement(m,claims);
            return <article className="bank-movement" key={m.id}>
              <div className="bank-movement-top"><div><strong>{m.transaction_reference}</strong><span>{m.bank} · {m.account_alias} · {m.movement_date}</span></div>
                <strong className="bank-money">{money(m.amount_cop)}</strong></div>
              <p>{m.description||"Abono importado"} <span className={"bank-status bank-"+m.status}>{statusLabel[m.status]}</span></p>
              <small>Fuente declarada: {m.source_label} · Importado {new Date(m.imported_at).toLocaleDateString("es-CO")}</small>
              {m.status==="unmatched"&&<div className="bank-row-actions">{candidate?
                <button type="button" className="btn btn-primary btn-small" disabled={busy} onClick={()=>void matchItem(m,candidate)}>Conciliar con {candidate.customer_label} · {money(candidate.expected_amount_cop)}</button>:
                <span className="bank-no-match">Sin coincidencia exacta con un pago reportado. Verifica banco, alias, referencia y valor.</span>}
                <button type="button" className="btn btn-ghost btn-small" disabled={busy} onClick={()=>void closeItem("movement",m.id)}>Descartar con motivo</button>
              </div>}</article>;
          })}</div>}
        {movements.length===800&&<p className="muted">Vista limitada a los últimos 800 movimientos; usa filtros o exportaciones administrativas para revisar los anteriores.</p>}
      </section>
    </> : section==="reportes" ? <>
      <section className="bank-panel">
        <header><div><span className="overline">01 · DECLARACIÓN DE CLIENTE</span><h2>Registrar un pago reportado</h2></div></header>
        <p>Este formulario es para administración. Los clientes también pueden registrar y consultar su historial desde <strong>Pagos</strong> y <strong>Mi cuenta</strong>. Un reporte no acredita que haya ingresado dinero.</p>
        <form className="bank-claim-form" onSubmit={e=>void submitClaim(e)}>
          <label>Banco de destino<select value={bank} onChange={e=>setBank(e.target.value as ReconBank)}><option value="BANCOLOMBIA">Bancolombia</option><option value="NEQUI">Nequi</option></select></label>
          <label>Alias de cuenta<input required minLength={3} maxLength={40} pattern="[A-Za-z0-9_-]{3,40}" value={accountAlias} placeholder="BANCOLOMBIA_PRINCIPAL" onChange={e=>setAccountAlias(e.target.value.toUpperCase())}/></label>
          <label>Cliente / identificación interna<input required minLength={2} maxLength={120} value={customerLabel} onChange={e=>setCustomerLabel(e.target.value)} placeholder="Nombre o código interno"/></label>
          <label>Referencia bancaria informada<input required minLength={4} maxLength={100} pattern="[A-Za-z0-9][A-Za-z0-9._/-]{3,99}" value={claimedReference} onChange={e=>setClaimedReference(e.target.value.toUpperCase())}/></label>
          <label>Importe reportado (COP)<input required type="number" min={1000} max={100000000} step={1} value={expectedAmount} onChange={e=>setExpectedAmount(Number(e.target.value))}/></label>
          <button className="btn btn-primary" disabled={busy} type="submit">{busy?"Registrando…":"Guardar para conciliación"}</button>
        </form>
      </section>
      <section className="bank-panel"><header><h2>Reportes registrados</h2></header>
        {claims.length===0?<p className="muted">Aún no hay referencias reportadas en Supabase.</p>:
          <div className="bank-movements">{claims.map(c=><article className="bank-movement" key={c.id}>
            <div className="bank-movement-top"><div><strong>{c.customer_label}</strong><span>{c.bank} · {c.account_alias}</span></div><strong className="bank-money">{money(c.expected_amount_cop)}</strong></div>
            <p>Referencia: {c.claimed_reference} <span className={"bank-status bank-"+c.status}>{statusLabel[c.status]}</span></p>
            {c.customer_user_id&&<p>Cliente registrado con cuenta Oportunia · Origen declarado: {c.origin_channel||"No indicado"}{c.customer_order_reference?" · Oportunidad: "+c.customer_order_reference:""}</p>}
            <small>{new Date(c.created_at).toLocaleString("es-CO")}</small>
            {c.status==="pending"&&<div className="bank-row-actions">
              <button className="btn btn-ghost btn-small" disabled={busy} onClick={()=>void closeItem("claim",c.id)}>Rechazar con motivo</button></div>}
          </article>)}</div>}
      </section>
    </> : section==="auditoria" ?
      <section className="bank-panel"><header><div><span className="overline">TRAZABILIDAD</span><h2>Últimas 100 acciones registradas</h2></div></header>
        {audit.length===0?<p className="muted">Todavía no hay operaciones auditadas.</p>:<div className="table-scroll"><table className="data-table bank-audit"><thead><tr><th>Fecha</th><th>Acción</th><th>Responsable (ID)</th><th>Referencia interna</th><th>Detalle</th></tr></thead><tbody>{audit.map(item=><tr key={item.id}>
          <td>{new Date(item.created_at).toLocaleString("es-CO")}</td><td>{item.action}</td><td>{item.actor_id.slice(0,8)}</td>
          <td>{(item.movement_id||item.claim_id||"—").slice(0,8)}</td><td>{JSON.stringify(item.detail)}</td></tr>)}</tbody></table></div>}
      </section> :
      <section className="bank-panel bank-help"><header><h2>Cómo usar la conciliación bancaria</h2></header>
        <ol><li>En Bancolombia o Nequi, descarga el extracto desde el canal oficial. Nunca introduzcas tu contraseña en Oportunia.</li>
          <li>En tu computador, usa la plantilla CSV para transcribir únicamente <strong>abonos recibidos</strong> de la cuenta correcta. Para Bancolombia puedes partir de XLS; los PDF de Nequi requieren extracción o transcripción cuidadosa.</li>
          <li>Conserva una <strong>referencia bancaria única por movimiento</strong>, banco receptor, alias de cuenta, fecha y monto en COP. No subas números de cuenta ni datos sensibles que no se necesitan.</li>
          <li>Registra los reportes de clientes desde la pestaña correspondiente usando exactamente esa referencia.</li>
          <li>Importa el archivo y revisa las coincidencias sugeridas. Solo se concilia cuando coinciden banco, cuenta, referencia y monto.</li>
          <li>Audita los resultados. Nunca conviertas esta coincidencia en asignación de números, recaudo o permiso para realizar sorteos sin la infraestructura y autorizaciones exigidas.</li></ol>
        <p>Para agregar verificación bancaria automática es necesario contratar una integración oficial que suministre movimientos autenticados. Este módulo no utiliza scraping de sesiones bancarias ni almacena claves.</p>
      </section>}
  </div>;
}

export default function BankReconciliationPage() {
  return <AdminAccessGate><ReconciliationWorkspace /></AdminAccessGate>;
}
