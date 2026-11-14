"use client";

import { useCallback,useEffect,useMemo,useState } from "react";
import { oportuniaClient } from "@/lib/oportuniaSupabase";
import { displayPreviewNumber } from "@/lib/previewReservations";

type ExtraEvent={id:number;reservation_id:string;milestone:number;numbers:number[];created_at:string;actor_id:string|null};
type ClaimLink={id:string;reservation_id:string;claim_id:string;created_at:string};
type Claim={id:string;claimed_reference:string;expected_amount_cop:number;status:"pending"|"matched"|"rejected";created_at:string};
type PreviewProgressProps={
  reservationId:string; allowDemoAllocation?:boolean; allowOwnLink?:boolean; onChanged?:()=>void;
};

export function PreviewProgress({reservationId,allowDemoAllocation=false,allowOwnLink=false,onChanged}:PreviewProgressProps){
  const client=useMemo(()=>oportuniaClient(),[]);
  const [extras,setExtras]=useState<ExtraEvent[]>([]);
  const [links,setLinks]=useState<ClaimLink[]>([]);
  const [claims,setClaims]=useState<Claim[]>([]);
  const [availableClaims,setAvailableClaims]=useState<Claim[]>([]);
  const [selectedClaim,setSelectedClaim]=useState("");
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");

  const refresh=useCallback(async()=>{
    const [extraResult,linkResult]=await Promise.all([
      client.from("preview_extra_events").select("id,reservation_id,milestone,numbers,created_at,actor_id")
        .eq("reservation_id",reservationId).order("milestone",{ascending:true}).limit(4),
      client.from("preview_claim_links").select("id,reservation_id,claim_id,created_at")
        .eq("reservation_id",reservationId).order("created_at",{ascending:false}).limit(4),
    ]);
    if(extraResult.error||linkResult.error)throw new Error("No se pudo obtener el seguimiento del ensayo.");
    const linked=(linkResult.data||[]) as ClaimLink[];
    setExtras((extraResult.data||[]) as ExtraEvent[]);
    setLinks(linked);
    const {data:{user},error:authError}=await client.auth.getUser();
    if(authError||!user)throw new Error("La sesión ha vencido. Inicia sesión nuevamente.");
    const [claimsResult,candidatesResult]=await Promise.all([
      linked.length?client.from("bank_recon_claims")
        .select("id,claimed_reference,expected_amount_cop,status,created_at")
        .in("id",linked.map(l=>l.claim_id)).limit(4)
        :Promise.resolve({data:[] as Claim[],error:null}),
      allowOwnLink?client.from("bank_recon_claims")
        .select("id,claimed_reference,expected_amount_cop,status,created_at")
        .eq("customer_user_id",user.id).in("status",["pending","matched"])
        .order("created_at",{ascending:false}).limit(100)
        :Promise.resolve({data:[] as Claim[],error:null}),
    ]);
    if(claimsResult.error||candidatesResult.error)throw new Error("No se pudo consultar el historial de referencias vinculadas.");
    setClaims((claimsResult.data||[]) as Claim[]);
    setAvailableClaims((candidatesResult.data||[]) as Claim[]);
  },[client,reservationId,allowOwnLink]);

  useEffect(()=>{
    let active=true;
    setLoading(true);
    void refresh().catch(e=>{if(active)setError(e instanceof Error?e.message:"Error de seguimiento");})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[refresh]);

  const total=extras.reduce((sum,e)=>sum+e.numbers.length,0);
  const unlinked=availableClaims.filter(c=>!links.some(l=>l.claim_id===c.id));
  const claimStatus:Record<Claim["status"],string>={
    pending:"Pendiente de conciliación",matched:"Coincide con extracto cargado (no verificación automática)",
    rejected:"Rechazada",
  };
  async function simulate(){
    if(busy||total>=40)return;
    if(!window.confirm("¿Registrar diez números EXTRA DE SIMULACIÓN, sin pago, sin derechos de participación y sin implicar conciliación bancaria?"))return;
    setBusy(true);setError("");setNotice("");
    try{
      const {error:requestError}=await client.rpc("simulate_preview_extra_milestone",{p_reservation_id:reservationId});
      if(requestError)throw requestError;
      await refresh();
      onChanged?.();
      setNotice("Diez números de simulación registrados con auditoría. No representan pago ni participación.");
    }catch(e){setError(e instanceof Error?e.message:"No se pudo crear el hito de prueba");}
    finally{setBusy(false);}
  }
  async function linkClaim(){
    if(busy||!selectedClaim)return;
    if(!window.confirm("¿Asociar esta referencia declarada únicamente para seguimiento documental? No se acreditará pago ni se asignarán números."))return;
    setBusy(true);setError("");setNotice("");
    try{
      const {error:requestError}=await client.rpc("link_preview_claim_for_tracking",{
        p_reservation_id:reservationId,p_claim_id:selectedClaim,
      });
      if(requestError)throw requestError;
      await refresh();
      onChanged?.();
      setSelectedClaim("");
      setNotice("Referencia asociada para trazabilidad. El estado bancario y los números no cambiaron.");
    }catch(e){setError(e instanceof Error?e.message:"No se pudo vincular la referencia");}
    finally{setBusy(false);}
  }

  return <section className="central-progress" aria-label="Hitos y referencias de selección de prueba">
    <div className="central-progress-top"><div><span className="overline">LABORATORIO · NÚMEROS NO COMERCIALES</span>
      <h3>Diez iniciales + hasta cuarenta adicionales de ensayo</h3></div>
      <strong>{10+total} / 50</strong></div>
    <div className="central-steps">
      {[1,2,3,4].map(step=><div key={step} className={extras.some(e=>e.milestone===step)?"completed":""}>
        <strong>Hito {step}</strong><small>{extras.some(e=>e.milestone===step)?"10 números de prueba":"Sin ejecutar"}</small></div>)}
    </div>
    {loading?<p className="muted">Consultando historial de simulación…</p>:<>
      {extras.length===0?<p className="muted">Aún no se han generado los 40 números complementarios de ensayo.</p>:
        <div className="central-extra-history">{extras.map(e=><div key={e.id}><div className="central-extra-caption">
          <strong>Hito {e.milestone}</strong><small>{new Date(e.created_at).toLocaleString("es-CO")}</small></div>
          <div className="central-numbers">{e.numbers.map(n=><span key={n}>{displayPreviewNumber(n)}</span>)}</div>
        </div>)}</div>}
      {allowDemoAllocation&&<div className="central-progress-actions"><button type="button" className="btn btn-primary btn-small" disabled={busy||total>=40}
        onClick={()=>void simulate()}>{busy?"Procesando…":total>=40?"Cuatro hitos simulados completos":"Simular siguiente bloque de 10 números"}</button>
        <small>Solo administración. No consulta ni aprueba transferencias.</small></div>}
      <div className="central-tracking"><span className="overline">REFERENCIAS DECLARADAS · TRAZABILIDAD</span>
        <h3>Seguimiento asociado a esta selección</h3><p>La asociación es documental. No asigna números, no cambia el estado del banco y no genera una venta.</p>
        {links.length===0?<p className="muted">Esta selección no tiene referencias vinculadas.</p>:
          <div className="central-linked-list">{links.map(l=>{
            const claim=claims.find(c=>c.id===l.claim_id);
            return <div key={l.id}><strong>{claim?.claimed_reference||"Referencia restringida"}</strong>
              <span>{claim?claimStatus[claim.status]:"Sin estado visible"}</span>
              <small>{new Date(l.created_at).toLocaleString("es-CO")}</small></div>;
          })}</div>}
        {allowOwnLink&&links.length<4&&<div className="central-link-form">
          <label>Elegir una referencia propia ya reportada
            <select value={selectedClaim} onChange={e=>setSelectedClaim(e.target.value)}>
              <option value="">Selecciona referencia…</option>
              {unlinked.map(c=><option value={c.id} key={c.id}>{c.claimed_reference} · {claimStatus[c.status]}</option>)}
            </select></label>
          <button className="btn btn-secondary btn-small" type="button" disabled={!selectedClaim||busy} onClick={()=>void linkClaim()}>Asociar para seguimiento</button>
          {unlinked.length===0&&<small>No tienes referencias pendientes o cotejadas que puedan asociarse. No es necesario enviar dinero para utilizar esta prueba.</small>}
        </div>}
      </div>
    </>}
    {error&&<p className="alert alert-error" role="alert">{error}</p>}
    {notice&&<p className="alert alert-success" role="status">{notice}</p>}
  </section>;
}
