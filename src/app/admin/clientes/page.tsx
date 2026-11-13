"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AdminAccessGate } from "@/components/AdminAccessGate";
import { oportuniaClient } from "@/lib/oportuniaSupabase";
import { money } from "@/lib/domain";
import { crmSummary, filterCrmProfiles, type CrmProfile, type CrmNote, type CrmClaim } from "@/lib/crm";

type Segment = "all" | "reported" | "pending" | "consented";
type Category = CrmNote["category"];
const labels: Record<Category,string> = {
  seguimiento: "Seguimiento", soporte: "Soporte", pagos: "Pagos reportados", otro: "Otro",
};
const claimLabels: Record<CrmClaim["status"],string> = {
  pending:"Pendiente de conciliación",matched:"Coincide con extracto importado",rejected:"Rechazado",
};
function CrmWorkspace() {
  const client = useMemo(() => oportuniaClient(), []);
  const [profiles,setProfiles] = useState<CrmProfile[]>([]);
  const [notes,setNotes] = useState<CrmNote[]>([]);
  const [claims,setClaims] = useState<CrmClaim[]>([]);
  const [selectedId,setSelectedId] = useState("");
  const [term,setTerm] = useState("");
  const [segment,setSegment] = useState<Segment>("all");
  const [category,setCategory] = useState<Category>("seguimiento");
  const [body,setBody] = useState("");
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [message,setMessage] = useState("");

  const refresh = useCallback(async () => {
    const [a,b,c] = await Promise.all([
      client.from("customer_profiles").select("user_id,email,display_name,phone,marketing_consent,created_at,updated_at")
        .order("created_at",{ascending:false}).limit(500),
      client.from("customer_crm_notes").select("id,customer_user_id,author_user_id,category,body,created_at")
        .order("created_at",{ascending:false}).limit(1000),
      client.from("bank_recon_claims").select("id,customer_user_id,bank,origin_channel,claimed_reference,expected_amount_cop,status,created_at")
        .order("created_at",{ascending:false}).limit(1000),
    ]);
    if(a.error || b.error || c.error) throw new Error("No se pudo cargar el CRM. Revisa conexión, permisos y migración de Supabase.");
    setProfiles((a.data||[]) as CrmProfile[]);
    setNotes((b.data||[]) as CrmNote[]);
    setClaims((c.data||[]) as CrmClaim[]);
  },[client]);

  useEffect(() => {
    let live = true;
    void refresh().catch(err=>{if(live)setError(err instanceof Error?err.message:"Error de lectura");})
      .finally(()=>{if(live)setLoading(false)});
    return ()=>{live=false};
  },[refresh]);

  const metrics=useMemo(()=>crmSummary(profiles,claims),[profiles,claims]);
  const filtered=useMemo(()=>filterCrmProfiles(profiles,claims,term,segment),[profiles,claims,term,segment]);
  const chosen=filtered.find(p=>p.user_id===selectedId) || filtered[0] || null;
  const chosenClaims=chosen?claims.filter(c=>c.customer_user_id===chosen.user_id):[];
  const chosenNotes=chosen?notes.filter(n=>n.customer_user_id===chosen.user_id):[];
  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();if(!chosen)return;
    setBusy(true);setError("");setMessage("");
    try {
      const {data:{user},error:authError} = await client.auth.getUser();
      if(authError||!user) throw new Error("Sesión vencida. Ingresa de nuevo.");
      const {error:insertError}=await client.from("customer_crm_notes").insert({
        customer_user_id:chosen.user_id,author_user_id:user.id,category,body:body.trim(),
      });
      if(insertError)throw insertError;
      await refresh();
      setBody("");setMessage("Observación guardada con fecha y responsable. El historial no permite ediciones ni eliminación.");
    }catch(err){setError(err instanceof Error?err.message:"No se guardó la observación.");}
    finally{setBusy(false)}
  }
  return <div className="container page-space crm-page">
    <div className="crm-top"><div><span className="overline">ADMINISTRACIÓN · CLIENTES</span>
      <h1>CRM de <span className="gradient-text">Oportunia.</span></h1>
      <p>Directorio centralizado de cuentas registradas, reportes bancarios declarados y seguimiento interno. No son ventas confirmadas.</p></div>
      <Link className="btn btn-secondary" href="/admin">Volver al dashboard</Link>
    </div>
    <div className="crm-kpis">
      <article><span>Cuentas registradas</span><strong>{metrics.registered}</strong><small>Usuarios de Supabase</small></article>
      <article><span>Clientes con reportes</span><strong>{metrics.withPaymentReports}</strong><small>Referencias vinculadas a la cuenta</small></article>
      <article><span>Pendientes</span><strong>{metrics.pendingReports}</strong><small>Reportes sin conciliar</small></article>
      <article><span>Contacto autorizado</span><strong>{metrics.optedIn}</strong><small>Consentimiento voluntario</small></article>
    </div>
    <div className="crm-note-banner"><strong>Datos reales de Supabase.</strong> Los números, cuotas y pagos aprobados de la demo local no aparecen aquí como compras. Las notas son privadas de administración. No registres contraseñas ni información financiera sensible.</div>
    {error&&<div className="alert alert-error" role="alert">{error}</div>}
    {message&&<div className="alert alert-success" role="status">{message}</div>}
    {loading?<div className="panel">Consultando directorio…</div>:<div className="crm-shell">
      <section className="crm-panel crm-list-panel">
        <h2>Directorio</h2>
        <label className="crm-control">Buscar por nombre, correo, celular o referencia
          <input type="search" value={term} onChange={e=>setTerm(e.target.value)} placeholder="Buscar cliente..."/></label>
        <label className="crm-control">Segmento
          <select value={segment} onChange={e=>{setSegment(e.target.value as Segment);setSelectedId("");}}>
            <option value="all">Todos</option><option value="reported">Con reportes</option>
            <option value="pending">Conciliación pendiente</option><option value="consented">Aceptan comunicaciones</option>
          </select></label>
        <p className="crm-count">{filtered.length} cuentas en este filtro</p>
        <div className="crm-client-list">{filtered.map(p=>{
          const reports=claims.filter(c=>c.customer_user_id===p.user_id);
          return <button key={p.user_id} type="button" className={"crm-client"+(chosen?.user_id===p.user_id?" selected":"")} onClick={()=>setSelectedId(p.user_id)}>
            <span className="crm-avatar">{(p.display_name||p.email||"?").slice(0,1).toUpperCase()}</span>
            <span className="crm-client-info"><strong>{p.display_name||p.email||"Cuenta sin nombre"}</strong><small>{p.email}</small>
              <small>{reports.length} reportes · {p.marketing_consent?"Contacto autorizado":"Sin consentimiento"}</small></span>
          </button>;
        })}</div>
        {filtered.length===0&&<p className="muted">No hay cuentas que coincidan con el filtro.</p>}
        {profiles.length===500&&<p className="muted">Vista limitada a los 500 registros más recientes.</p>}
      </section>
      <section className="crm-panel crm-detail-panel">
        {!chosen?<div className="crm-empty">Selecciona una cuenta para consultar su historial.</div>:<>
          <header className="crm-detail-header"><div><span className="overline">FICHA DE CLIENTE</span><h2>{chosen.display_name||"Cuenta registrada"}</h2><span>Alta: {new Date(chosen.created_at).toLocaleDateString("es-CO")}</span></div>
            <span className="crm-consent">{chosen.marketing_consent?"Acepta contacto":"Sin consentimiento comercial"}</span></header>
          <div className="crm-details-grid"><div><span>Correo</span><strong>{chosen.email||"Sin correo"}</strong></div>
            <div><span>Celular</span><strong>{chosen.phone||"Sin celular"}</strong></div>
            <div><span>Reportes</span><strong>{chosenClaims.length}</strong></div>
            <div><span>Coincidencias con extracto</span><strong>{chosenClaims.filter(c=>c.status==="matched").length}</strong></div></div>
          <div className="crm-divider"/>
          <div className="crm-subheader"><h3>Referencias de pago reportadas</h3><Link href="/admin/conciliacion">Conciliación ↗</Link></div>
          {chosenClaims.length===0?<p className="muted">Esta cuenta todavía no tiene referencias reportadas.</p>:
            <div className="crm-claim-list">{chosenClaims.map(c=><div key={c.id} className="crm-claim">
              <div><strong>{c.claimed_reference}</strong><small>{c.bank} · {new Date(c.created_at).toLocaleString("es-CO")}</small></div>
              <div><strong>{money(c.expected_amount_cop)}</strong><small>{claimLabels[c.status]}</small></div>
            </div>)}</div>}
          <div className="crm-divider"/>
          <h3>Notas internas y seguimiento</h3>
          <form className="crm-note-form" onSubmit={e=>void addNote(e)}>
            <label>Categoría<select value={category} onChange={e=>setCategory(e.target.value as Category)}>{(Object.keys(labels) as Category[]).map(k=><option value={k} key={k}>{labels[k]}</option>)}</select></label>
            <label>Observación<textarea value={body} onChange={e=>setBody(e.target.value)} required minLength={5} maxLength={1000} rows={3} placeholder="Registrar seguimiento, sin datos sensibles..."/></label>
            <button className="btn btn-primary btn-small" disabled={busy||body.trim().length<5}>{busy?"Guardando…":"Guardar nota y fecha"}</button>
          </form>
          <div className="crm-notes">{chosenNotes.length===0?<p className="muted">No hay observaciones internas.</p>:chosenNotes.map(note=>
            <article key={note.id} className="crm-note"><div><strong>{labels[note.category]}</strong>
              <small>{new Date(note.created_at).toLocaleString("es-CO")} · Responsable {note.author_user_id.slice(0,8)}</small></div><p>{note.body}</p></article>)}</div>
        </>}
      </section>
    </div>}
  </div>;
}
export default function AdminCrmPage(){return <AdminAccessGate><CrmWorkspace/></AdminAccessGate>;}
