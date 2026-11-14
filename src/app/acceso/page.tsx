"use client";
import { useEffect,useMemo,useState,type FormEvent } from "react";
import Link from "next/link";
import { oportuniaClient } from "@/lib/oportuniaSupabase";
import type { User } from "@supabase/supabase-js";
export default function AccesoPage(){
 const client=useMemo(()=>oportuniaClient(),[]);
 const [user,setUser]=useState<User|null>(null);
 const [mode,setMode]=useState<"login"|"signup"|"reset">("login");
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [notice,setNotice]=useState("");
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
  let active=true;
  void client.auth.getUser().then(({data})=>{if(active)setUser(data.user);});
  const {data:sub}=client.auth.onAuthStateChange((_e,s)=>{if(active)setUser(s?.user||null);});
  return()=>{active=false;sub.subscription.unsubscribe();};
 },[client]);
 async function submit(e:FormEvent){
  e.preventDefault();setBusy(true);setNotice("");
  try{
   if(mode==="signup"){
    const {error}=await client.auth.signUp({email,password});
    setNotice(error?"No se pudo crear la cuenta. Comprueba el correo y la contraseña.":"Revisa tu correo y confirma la cuenta antes de ingresar. El permiso administrativo se asigna solo al correo autorizado después de verificarlo.");
   }else if(mode==="reset"){
    const {error}=await client.auth.resetPasswordForEmail(email);
    setNotice(error?"No se pudo solicitar la recuperación.":"Si existe la cuenta, recibirás un correo de recuperación.");
   }else{
    const {error}=await client.auth.signInWithPassword({email,password});
    setNotice(error?"No se pudo iniciar sesión. Verifica el correo y la contraseña.":"Sesión iniciada correctamente.");
   }
  }catch{setNotice("No fue posible conectar con el servicio de autenticación.");}
  setBusy(false);
 }
 return <section className="container page-space access-page"><div className="access-card">
  <span className="overline">ACCESO SEGURO · OPORTUNIA</span>
  {user?<><h1>Tu cuenta está activa</h1><p>Sesión iniciada con {user.email||user.phone}.</p>
   <div className="stack"><Link href="/mi-cuenta" className="btn btn-primary">Ir a mi cuenta</Link><Link href="/admin" className="btn btn-secondary">Abrir panel de administración</Link>
   <button type="button" className="btn btn-ghost" onClick={()=>void client.auth.signOut()}>Cerrar sesión</button></div></>:
   <><h1>{mode==="signup"?"Crear cuenta":mode==="reset"?"Recuperar contraseña":"Bienvenido a Oportunia"}</h1>
    <p className="muted">Accede con tu correo electrónico. El acceso por celular requerirá verificación mediante código SMS y estará disponible al configurar el proveedor.</p>
    <form className="form-stack" onSubmit={submit}>
     <label>Correo electrónico<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="correo@ejemplo.com"/></label>
     {mode!=="reset"&&<label>Contraseña<input required type="password" minLength={8} autoComplete={mode==="signup"?"new-password":"current-password"} value={password} onChange={e=>setPassword(e.target.value)}/></label>}
     <button className="btn btn-primary full" type="submit" disabled={busy}>{busy?"Procesando…":mode==="signup"?"Crear cuenta":mode==="reset"?"Enviar recuperación":"Ingresar"}</button>
    </form>
    {notice&&<p role="status" className="alert alert-warning top-gap">{notice}</p>}
    <div className="auth-switch"><button type="button" onClick={()=>{setMode(mode==="signup"?"login":"signup");setNotice("");}}>{mode==="signup"?"Ya tengo cuenta":"Crear una cuenta"}</button>
    <button type="button" onClick={()=>{setMode(mode==="reset"?"login":"reset");setNotice("");}}>{mode==="reset"?"Volver a ingresar":"Olvidé mi contraseña"}</button></div>
    <p className="small muted top-gap">Acceso con celular: próximamente, después de habilitar SMS/OTP. Nunca se enviarán contraseñas por WhatsApp.</p></>}
 </div></section>;
}
