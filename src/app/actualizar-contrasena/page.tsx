"use client";
import {useEffect,useMemo,useState,type FormEvent} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {oportuniaClient} from "@/lib/oportuniaSupabase";

export default function ActualizarContrasenaPage(){
 const client=useMemo(()=>oportuniaClient(),[]);
 const router=useRouter();
 const [ready,setReady]=useState(false);
 const [checking,setChecking]=useState(true);
 const [password,setPassword]=useState("");
 const [confirm,setConfirm]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState(false);

 useEffect(()=>{
  let live=true;
  const {data:listener}=client.auth.onAuthStateChange((event,session)=>{
   if(!live)return;
   if(event==="PASSWORD_RECOVERY"&&session){setReady(true);setChecking(false);}
   if(event==="SIGNED_OUT"){setReady(false);setChecking(false);}
  });
  void client.auth.getUser().then(({data,error:authError})=>{
   if(!live)return;
   setReady(!authError&&!!data.user);setChecking(false);
  }).catch(()=>{if(live){setReady(false);setChecking(false);}});
  return()=>{live=false;listener.subscription.unsubscribe();};
 },[client]);

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(busy)return;
  setError("");
  if(password.length<12){setError("La contraseña debe tener al menos 12 caracteres.");return;}
  if(password!==confirm){setError("Las contraseñas no coinciden.");return;}
  setBusy(true);
  try{
   const {error:updateError}=await client.auth.updateUser({password});
   if(updateError)throw updateError;
   setSuccess(true);setPassword("");setConfirm("");
   // Revoke the current browser session so the next sign-in uses the new password.
   await client.auth.signOut();
  }catch{
   setError("No se pudo actualizar la contraseña. Solicita un nuevo enlace de recuperación.");
  }finally{setBusy(false);}
 }
 return <section className="container page-space access-page"><div className="access-card">
  <span className="overline">PROTECCIÓN DE CUENTA · OPORTUNIA</span>
  <h1>Actualizar contraseña</h1>
  {success?<><p role="status">Contraseña actualizada correctamente. Inicia sesión con la nueva clave.</p>
   <button className="btn btn-primary" onClick={()=>router.replace("/acceso")}>Ingresar a mi cuenta</button></>:
  checking?<p role="status">Validando enlace de recuperación…</p>:
  !ready?<><div role="alert" className="alert alert-warning">El enlace no es válido, ha vencido o no hay una sesión de recuperación activa.</div>
   <Link href="/acceso" className="btn btn-primary">Solicitar otro enlace</Link></>:
  <form className="form-stack" onSubmit={submit}>
   <p>Elige una contraseña nueva y distinta de las anteriores.</p>
   <label>Nueva contraseña<input type="password" required minLength={12} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
   <label>Confirmar contraseña<input type="password" required minLength={12} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
   {error&&<p role="alert" className="alert alert-error">{error}</p>}
   <button type="submit" className="btn btn-primary" disabled={busy}>{busy?"Guardando…":"Guardar nueva contraseña"}</button>
  </form>}
 </div></section>;
}
