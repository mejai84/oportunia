"use client";
import Link from "next/link";
import {useCallback,useEffect,useMemo,useState} from "react";
import {oportuniaClient} from "@/lib/oportuniaSupabase";
import {effectivePreviewStatus,type PreviewReservation} from "@/lib/previewReservations";

export function CustomerPreviewReservations(){
  const client=useMemo(()=>oportuniaClient(),[]);
  const [userId,setUserId]=useState<string|null>(null);
  const [checked,setChecked]=useState(false);
  const [entries,setEntries]=useState<PreviewReservation[]>([]);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  useEffect(()=>{
    let active=true;
    void client.auth.getUser().then(({data})=>{if(active){setUserId(data.user?.id??null);setChecked(true);}})
      .catch(()=>{if(active)setChecked(true);});
    const {data:sub}=client.auth.onAuthStateChange((_event,session)=>{
      if(active){setUserId(session?.user?.id??null);setChecked(true);}
    });
    return()=>{active=false;sub.subscription.unsubscribe();};
  },[client]);
  const refresh=useCallback(async(id:string)=>{
    const {data,error:requestError}=await client.from("preview_reservations")
      .select("id,draw_id,user_id,selection_mode,preferred_plan,status,created_at,expires_at,closed_at")
      .eq("user_id",id).order("created_at",{ascending:false}).limit(10);
    if(requestError)throw new Error("No se pudo cargar tu historial de selecciones centralizadas.");
    setEntries((data||[]) as PreviewReservation[]);
  },[client]);
  useEffect(()=>{
    let live=true;
    if(!userId){setEntries([]);setLoading(false);return;}
    setLoading(true);setError("");
    void refresh(userId).catch(e=>{if(live)setError(e instanceof Error?e.message:"Error de consulta");})
      .finally(()=>{if(live)setLoading(false);});
    return()=>{live=false;};
  },[userId,refresh]);
  const active=entries.filter(e=>effectivePreviewStatus(e)==="active").length;
  return <section className="central-mini">
    <div className="central-list-head"><div><span className="overline">MI CUENTA · ENSAYOS NO COMERCIALES</span>
      <h2>Mis selecciones centralizadas</h2><p>Guardadas con tu usuario en Supabase; diferentes de las oportunidades simuladas de este navegador.</p></div>
      <Link href="/ensayo-reservas" className="btn btn-primary btn-small">Explorar ensayo</Link></div>
    {!checked?<p className="muted">Comprobando sesión…</p>:!userId?<p className="muted">
      <Link href="/acceso">Inicia sesión</Link> para guardar y consultar selecciones desde varios dispositivos.</p>:
      <><p className="central-mini-count">{active} ensayo(s) vigente(s) · {entries.length} en el historial reciente</p>
        {error&&<p role="alert" className="alert alert-error">{error}</p>}
        {loading?<p className="muted">Consultando…</p>:entries.length===0?<p className="muted">Todavía no has creado ninguna selección centralizada de prueba.</p>:
          <div className="central-mini-list">{entries.map(e=><div key={e.id}><strong>{e.draw_id}</strong>
            <span>{effectivePreviewStatus(e)==="active"?"Vigente":effectivePreviewStatus(e)==="expired"?"Vencida":"Cancelada"}</span>
            <small>{new Date(e.created_at).toLocaleString("es-CO")}</small></div>)}</div>}
      </>}
  </section>;
}
