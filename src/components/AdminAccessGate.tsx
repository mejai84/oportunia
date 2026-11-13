"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { oportuniaClient } from "@/lib/oportuniaSupabase";
import type { User } from "@supabase/supabase-js";
export function AdminAccessGate({ children }: { children: ReactNode }) {
  const client = useMemo(() => oportuniaClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function verify(u: User | null) {
      if (!active) return;
      setUser(u); setAllowed(false); setLoading(true);
      if (u) {
        const { data, error: err } = await client.from("oportunia_admins").select("user_id").eq("user_id",u.id).maybeSingle();
        if (active) { setAllowed(!err && !!data); if (err) setError("No fue posible validar los permisos."); }
      }
      if (active) setLoading(false);
    }
    void client.auth.getUser().then(({ data })=>verify(data.user));
    const { data: sub } = client.auth.onAuthStateChange((_event,session)=>{ void verify(session?.user || null); });
    return () => { active=false; sub.subscription.unsubscribe(); };
  }, [client]);
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(""); setLoading(true);
    const { error: err } = await client.auth.signInWithPassword({ email, password });
    if (err) { setError("No fue posible iniciar sesión. Revisa tus credenciales."); setLoading(false); }
  }
  if (loading) return <section className="container page-space"><p>Verificando acceso administrativo…</p></section>;
  if (!user) return <section className="container page-space access-page"><div className="access-card">
    <span className="overline">ACCESO RESTRINGIDO</span><h1>Administración de Oportunia</h1>
    <p>Ingresa con una cuenta autorizada. Para crear la primera cuenta de propietario, regístrate y verifica el correo autorizado en la página de acceso.</p>
    <p><a href="/acceso">Crear cuenta o verificar correo</a></p><form className="form-stack" onSubmit={login}>
      <label>Correo electrónico<input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} /></label>
      <label>Contraseña<input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} /></label>
      {error && <div role="alert" className="alert alert-error">{error}</div>}
      <button className="btn btn-primary" type="submit">Ingresar</button>
    </form></div></section>;
  if (!allowed) return <section className="container page-space"><div className="alert alert-warning">
    Tu cuenta no tiene permiso para administrar Oportunia. Un responsable debe autorizarla en Supabase.
    <button className="btn btn-secondary" type="button" onClick={()=>{void client.auth.signOut();}}>Cerrar sesión</button>
  </div></section>;
  return <>{children}</>;
}
