"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { oportuniaClient } from "@/lib/oportuniaSupabase";
import type { CrmProfile } from "@/lib/crm";

export function CustomerProfile() {
  const client=useMemo(()=>oportuniaClient(),[]);
  const [userId,setUserId]=useState<string|null>(null);
  const [checked,setChecked]=useState(false);
  const [profile,setProfile]=useState<CrmProfile|null>(null);
  const [name,setName]=useState("");
  const [phone,setPhone]=useState("");
  const [marketing,setMarketing]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");

  useEffect(()=>{
    let active=true;
    void client.auth.getUser().then(({data})=>{if(active){setUserId(data.user?.id??null);setChecked(true);}})
      .catch(()=>{if(active)setChecked(true);});
    const {data:sub}=client.auth.onAuthStateChange((_event,session)=>{
      if(active){setUserId(session?.user?.id??null);setChecked(true);}
    });
    return ()=>{active=false;sub.subscription.unsubscribe();};
  },[client]);

  const load=useCallback(async(id:string)=>{
    const {data,error:loadError}=await client.from("customer_profiles")
      .select("user_id,email,display_name,phone,marketing_consent,created_at,updated_at")
      .eq("user_id",id).maybeSingle();
    if(loadError)throw new Error("No se pudo consultar tu perfil.");
    if(!data)throw new Error("No encontramos tu perfil en Supabase. Contacta soporte.");
    const item=data as CrmProfile;
    setProfile(item);setName(item.display_name);setPhone(item.phone);setMarketing(item.marketing_consent);
  },[client]);
  useEffect(()=>{
    let active=true;
    if(!userId){setProfile(null);return;}
    void load(userId).catch(e=>{if(active)setError(e instanceof Error?e.message:"Error del perfil");});
    return ()=>{active=false;};
  },[userId,load]);

  async function save(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(!userId)return;
    setBusy(true);setError("");setMessage("");
    try {
      const {error:updateError}=await client.from("customer_profiles").update({
        display_name:name.trim(),phone:phone.trim(),marketing_consent:marketing,
      }).eq("user_id",userId).select("user_id").single();
      if(updateError)throw updateError;
      await load(userId);
      setMessage("Perfil guardado. El consentimiento de contacto queda asociado a tu cuenta.");
    }catch(err){setError(err instanceof Error?err.message:"No se pudo guardar el perfil.");}
    finally{setBusy(false);}
  }

  return <section className="customer-profile-panel" aria-label="Datos de mi perfil">
    <div className="customer-profile-head"><span className="overline">MI PERFIL · DATOS CENTRALIZADOS</span><h2>Mis datos de contacto</h2>
      <p>Actualiza tus datos para futuras comunicaciones. No se registran compras ni participaciones por completar este formulario.</p></div>
    {!checked?<p className="muted">Comprobando tu cuenta…</p>:!userId?
      <p className="muted">Para editar tu perfil debes <Link href="/acceso">iniciar sesión</Link>.</p>:
      !profile?<p className="muted">{error||"Consultando perfil…"}</p>:
      <form className="customer-profile-form" onSubmit={e=>void save(e)}>
        <label>Correo de tu cuenta<input type="email" disabled value={profile.email}/></label>
        <label>Nombre para identificarte<input type="text" maxLength={100} value={name} onChange={e=>setName(e.target.value)} placeholder="Tu nombre"/></label>
        <label>Celular de contacto<input type="tel" inputMode="tel" pattern="[+]?[0-9]{7,15}" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="3001234567"/></label>
        <label className="customer-profile-consent"><input type="checkbox" checked={marketing} onChange={e=>setMarketing(e.target.checked)}/>
          <span>Autorizo recibir novedades comerciales de Oportunia. Puedo retirar este consentimiento desmarcando la casilla y guardando.</span></label>
        <div className="customer-profile-actions"><button className="btn btn-primary btn-small" disabled={busy}>{busy?"Guardando…":"Guardar mi perfil"}</button>
          <span>Los mensajes automáticos todavía no están habilitados.</span></div>
        {error&&<p className="alert alert-error" role="alert">{error}</p>}
        {message&&<p className="alert alert-success" role="status">{message}</p>}
      </form>}
  </section>;
}
