"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
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
  const verificationId = useRef(0);

  useEffect(() => {
    let active = true;
    let scheduled: ReturnType<typeof setTimeout> | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;

    async function verify(nextUser: User | null) {
      const id = ++verificationId.current;
      if (!active) return;
      setUser(nextUser);
      setAllowed(false);
      setLoading(true);
      setError("");
      if (deadline) clearTimeout(deadline);
      deadline = setTimeout(() => {
        if (!active || id !== verificationId.current) return;
        setLoading(false);
        setError("La validación está tardando demasiado. Comprueba tu conexión y vuelve a intentar.");
      }, 12000);
      try {
        if (!nextUser) return;
        const { data, error: permissionError } = await client
          .from("oportunia_admins")
          .select("user_id")
          .eq("user_id", nextUser.id)
          .maybeSingle();
        if (!active || id !== verificationId.current) return;
        if (permissionError) {
          setError("No fue posible validar los permisos administrativos. Intenta nuevamente.");
        } else {
          setAllowed(Boolean(data));
        }
      } catch {
        if (active && id === verificationId.current) {
          setError("No fue posible conectar con el servicio de permisos.");
        }
      } finally {
        if (active && id === verificationId.current) {
          if (deadline) clearTimeout(deadline);
          setLoading(false);
        }
      }
    }

    // Supabase auth callbacks run inside an internal auth lock. Never await
    // getUser() or PostgREST from onAuthStateChange: schedule the query outside it.
    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      if (scheduled) clearTimeout(scheduled);
      scheduled = setTimeout(() => { void verify(session?.user ?? null); }, 0);
    });
    // INITIAL_SESSION is emitted by the listener, so no competing getUser()
    // request is needed during initial hydration.
    return () => {
      active = false;
      ++verificationId.current;
      if (scheduled) clearTimeout(scheduled);
      if (deadline) clearTimeout(deadline);
      subscription.subscription.unsubscribe();
    };
  }, [client]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: loginError } = await client.auth.signInWithPassword({ email, password });
      if (loginError) {
        setError("No fue posible iniciar sesión. Comprueba el correo y la contraseña.");
        setLoading(false);
      } else {
        setPassword("");
        // SIGNED_IN will trigger verification through the auth listener.
      }
    } catch {
      setError("No fue posible conectar con el servicio de autenticación.");
      setLoading(false);
    }
  }

  if (loading) return <section className="container page-space" role="status"><p>Verificando acceso administrativo…</p></section>;
  if (!user) return <section className="container page-space access-page"><div className="access-card">
    <span className="overline">ACCESO RESTRINGIDO</span><h1>Administración de Oportunia</h1>
    <p>Ingresa con tu cuenta autorizada. Si todavía no tienes una cuenta, utiliza el registro de Oportunia.</p>
    <p><a href="/acceso">Ir a acceso de usuarios</a></p>
    <form className="form-stack" onSubmit={login}>
      <label>Correo electrónico<input required type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label>Contraseña<input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
      {error && <div role="alert" className="alert alert-error">{error}</div>}
      <button className="btn btn-primary" type="submit">Ingresar</button>
    </form>
  </div></section>;
  if (!allowed) return <section className="container page-space"><div className="alert alert-warning" role="alert">
    <p>{error || "Tu cuenta no tiene permiso para administrar Oportunia."}</p>
    <button className="btn btn-secondary" type="button" onClick={() => { void client.auth.signOut(); }}>Cerrar sesión</button>
    <button className="btn btn-ghost" type="button" onClick={() => { void client.auth.getUser().then(({data}) => {
      // The auth listener handles revalidation when the session changes.
      if (data.user) window.location.reload();
    }); }}>Reintentar</button>
  </div></section>;
  return <>{children}</>;
}
