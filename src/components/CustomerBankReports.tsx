"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { oportuniaClient } from "@/lib/oportuniaSupabase";
import { money } from "@/lib/domain";
import type { ReconBank, ReconClaim } from "@/lib/reconciliation";

type ClaimWithCustomer = ReconClaim & {
  customer_user_id: string | null;
  origin_channel: string;
  customer_order_reference: string | null;
};
type ClaimEvent = {
  id: number;
  claim_id: string;
  event_type: "submitted" | "matched_statement" | "rejected";
  message: string;
  created_at: string;
};
type Origin = "BANCOLOMBIA" | "NEQUI" | "BRE-B" | "DAVIPLATA" | "PSE" | "OTRO";
type Props = { mode?: "full" | "history"; linkedOrderReference?: string };
const states: Record<ClaimWithCustomer["status"], string> = {
  pending: "Recibido · pendiente de conciliación",
  matched: "Coincide con extracto cargado",
  rejected: "No conciliado · rechazado",
};
const eventTitles: Record<ClaimEvent["event_type"], string> = {
  submitted: "Referencia recibida",
  matched_statement: "Coincidencia con extracto importado",
  rejected: "Reporte rechazado",
};
const origins: Origin[] = ["BANCOLOMBIA", "NEQUI", "BRE-B", "DAVIPLATA", "PSE", "OTRO"];

export function CustomerBankReports({ mode = "full", linkedOrderReference }: Props) {
  const client = useMemo(() => oportuniaClient(), []);
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [reports, setReports] = useState<ClaimWithCustomer[]>([]);
  const [events, setEvents] = useState<ClaimEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [destination, setDestination] = useState<ReconBank>("BANCOLOMBIA");
  const [origin, setOrigin] = useState<Origin>("BRE-B");
  const [customerName, setCustomerName] = useState("");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState(50000);
  const [orderReference, setOrderReference] = useState("");
  const [confirmation, setConfirmation] = useState(false);

  useEffect(() => {
    if (linkedOrderReference && !orderReference) setOrderReference(linkedOrderReference);
  }, [linkedOrderReference, orderReference]);

  useEffect(() => {
    let active = true;
    void client.auth.getUser().then(({data}) => {
      if (active) { setUserId(data.user?.id ?? null); setAuthChecked(true); }
    }).catch(() => { if (active) setAuthChecked(true); });
    const {data: sub} = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUserId(session?.user?.id ?? null);
      setAuthChecked(true);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [client]);

  const refresh = useCallback(async (id: string) => {
    const {data, error: claimsError} = await client.from("bank_recon_claims")
      .select("id,bank,account_alias,customer_label,customer_user_id,origin_channel,customer_order_reference,claimed_reference,expected_amount_cop,status,created_at")
      .eq("customer_user_id",id).order("created_at",{ascending:false}).limit(100);
    if (claimsError) throw new Error("El historial de reportes no está disponible. Comprueba la actualización de conciliación en Supabase.");
    const own = (data||[]) as ClaimWithCustomer[];
    let history: ClaimEvent[] = [];
    if (own.length) {
      const result = await client.from("bank_recon_claim_events")
        .select("id,claim_id,event_type,message,created_at")
        .in("claim_id",own.map(item=>item.id)).order("created_at",{ascending:true}).limit(600);
      if (result.error) throw new Error("No se pudo consultar la trazabilidad de tus reportes.");
      history = (result.data||[]) as ClaimEvent[];
    }
    setReports(own);
    setEvents(history);
  }, [client]);

  useEffect(() => {
    let active = true;
    if (!userId) { setReports([]); setEvents([]); setLoading(false); return; }
    setLoading(true);
    void refresh(userId).catch(err => {if(active) setError(err instanceof Error?err.message:"Error al obtener los reportes.");})
      .finally(() => {if(active)setLoading(false);});
    return () => {active=false;};
  }, [userId, refresh]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId || busy || !confirmation) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const {error: submitError} = await client.rpc("submit_customer_bank_recon_claim",{
        p_bank:destination,
        p_origin_channel:origin,
        p_customer_label:customerName.trim(),
        p_reference:reference.trim().toUpperCase(),
        p_amount_cop:amount,
        p_order_reference:orderReference.trim() || null,
      });
      if(submitError) throw submitError;
      await refresh(userId);
      setReference(""); setConfirmation(false);
      setNotice("Tu referencia quedó registrada. Puedes consultar su seguimiento en tu cuenta.");
    } catch(err) {
      const msg=err instanceof Error?err.message:"No se pudo enviar el reporte.";
      setError(msg.includes("duplicate key")||msg.includes("unique constraint")
        ? "Esta referencia ya está registrada para esa cuenta receptora. No vuelvas a reportarla; consulta tu historial."
        : msg);
    } finally {setBusy(false);}
  }

  return <section className="customer-reports" aria-label="Seguimiento de reportes bancarios">
    <header className="customer-reports-head"><div><span className="overline">SEGUIMIENTO PERSONAL · SUPABASE</span>
      <h2>{mode==="history"?"Historial de mis reportes":"Registrar y seguir una transferencia"}</h2>
      <p>Los reportes quedan vinculados a tu usuario y su estado se conserva entre dispositivos.</p></div>
      {mode==="history"&&<Link className="btn btn-secondary btn-small" href="/pagos#reportar-transferencia">Reportar referencia ↗</Link>}
    </header>
    <p className="customer-reports-warning">Las referencias se registran para seguimiento. Una coincidencia con un extracto no equivale a confirmación bancaria.</p>
    {!authChecked?<p className="muted">Comprobando tu sesión…</p>:
      !userId?<div className="customer-reports-auth">
        <strong>Inicia sesión para guardar tu reporte.</strong>
        <p>El registro y la trazabilidad requieren tu usuario de Oportunia. La información no se comparte con otros clientes.</p>
        <Link className="btn btn-primary" href="/acceso">Ingresar a mi cuenta ↗</Link></div>:
      <>
      {mode==="full"&&<form className="customer-report-form" onSubmit={event=>void submit(event)}>
        <label>Banco al que enviaste el dinero
          <select required value={destination} onChange={event=>setDestination(event.target.value as ReconBank)}>
            <option value="BANCOLOMBIA">Cuenta receptora Bancolombia</option>
            <option value="NEQUI">Cuenta receptora Nequi</option>
          </select></label>
        <label>Desde qué canal enviaste
          <select required value={origin} onChange={event=>setOrigin(event.target.value as Origin)}>
            {origins.map(item=><option key={item} value={item}>{item==="BRE-B"?"Bre-B":item==="DAVIPLATA"?"DaviPlata":item}</option>)}
          </select></label>
        <label>Nombre que reporta<input required minLength={2} maxLength={120} value={customerName} onChange={event=>setCustomerName(event.target.value)} placeholder="Nombre del titular del reporte"/></label>
        <label>Valor que reportas (COP)<input required type="number" min={1000} max={100000000} step={1} value={amount} onChange={event=>setAmount(Number(event.target.value))}/></label>
        <label>Referencia de la transferencia<input required minLength={4} maxLength={100} pattern="[A-Za-z0-9][A-Za-z0-9._/-]{3,99}" value={reference} onChange={event=>setReference(event.target.value.toUpperCase())} placeholder="Referencia única indicada por el banco"/></label>
        <label>Código de oportunidad (opcional)<input maxLength={80} value={orderReference} onChange={event=>setOrderReference(event.target.value)} placeholder="Código interno de tu participación"/></label>
        <label className="customer-report-check"><input type="checkbox" required checked={confirmation} onChange={event=>setConfirmation(event.target.checked)}/>
          <span>Confirmo que los datos son correctos y entiendo que este reporte requiere verificación antes de cualquier acreditación.</span></label>
        <button type="submit" className="btn btn-primary" disabled={busy||!confirmation}>{busy?"Guardando…":"Registrar referencia y generar seguimiento"}</button>
      </form>}
      {error&&<div role="alert" className="alert alert-error customer-reports-message">{error}</div>}
      {notice&&<div role="status" className="alert alert-success customer-reports-message">{notice}</div>}
      <div className="customer-reports-history">
        <div className="customer-reports-history-head"><h3>Mis referencias registradas ({reports.length})</h3>
          <button className="btn btn-secondary btn-small" type="button" disabled={loading||busy} onClick={()=>void refresh(userId).catch(err=>setError(err instanceof Error?err.message:"Error de consulta"))}>Actualizar estado</button></div>
        {loading?<p className="muted">Consultando reportes…</p>:
          reports.length===0?<p className="muted">Todavía no tienes referencias bancarias reportadas con este usuario.</p>:
          <div className="customer-report-list">{reports.map(report=><article key={report.id} className="customer-report">
            <div className="customer-report-top"><div><strong>{report.claimed_reference}</strong>
              <span>{report.bank==="BANCOLOMBIA"?"Bancolombia":"Nequi"} · Desde {report.origin_channel}</span></div>
              <strong className="customer-report-amount">{money(report.expected_amount_cop)}</strong></div>
            <span className={"customer-report-state state-"+report.status}>{states[report.status]}</span>
            <p>Reportado el {new Date(report.created_at).toLocaleString("es-CO")}
              {report.customer_order_reference?" · Oportunidad: "+report.customer_order_reference:""}</p>
            <ol className="customer-report-timeline">
              {events.filter(item=>item.claim_id===report.id).map(item=><li key={item.id}>
                <strong>{eventTitles[item.event_type]}</strong>
                <small>{new Date(item.created_at).toLocaleString("es-CO")}</small>
                <p>{item.message}</p></li>)}
            </ol>
            <small className="customer-report-id">Registro de seguimiento: {report.id.slice(0,8).toUpperCase()}</small>
          </article>)}</div>}
        {reports.length===100&&<p className="muted">Se muestran los 100 registros más recientes.</p>}
      </div>
      </>}
  </section>;
}
