"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { oportuniaClient } from "@/lib/oportuniaSupabase";

type AccessState =
  | { status: "checking"; user: User | null }
  | { status: "signed-out"; user: null }
  | { status: "allowed"; user: User }
  | { status: "denied"; user: User }
  | { status: "error"; user: User | null };

export function AdminAccessGate({ children }: { children: ReactNode }) {
  const client = useMemo(() => oportuniaClient(), []);
  const [access, setAccess] = useState<AccessState>({ status: "checking", user: null });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let revision = 0;
    let pendingTimer: ReturnType<typeof setTimeout> | undefined;

    async function check(user: User | null, force = false) {
      if (!mounted) return;
      if (!user) {
        revision += 1;
        lastUserId.current = null;
        setAccess({ status: "signed-out", user: null });
        return;
      }

      // TOKEN_REFRESHED and INITIAL_SESSION can fire for the same user.
      // Do not flash the loading screen or repeat the query on every event.
      if (!force && lastUserId.current === user.id) return;
      lastUserId.current = user.id;
      const currentRevision = ++revision;
      setAccess({ status: "checking", user });
      setError("");

      try {
        const { data, error: permissionError } = await client
          .from("oportunia_admins")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!mounted || currentRevision !== revision) return;
        if (permissionError) {
          lastUserId.current = null;
          setAccess({ status: "error", user });
          return;
        }
        setAccess({ status: data ? "allowed" : "denied", user });
      } catch {
        if (!mounted || currentRevision !== revision) return;
        lastUserId.current = null;
        setAccess({ status: "error", user });
      }
    }

    // Supabase's auth callback holds an internal session lock.
    // Never run queries inside it: schedule checks after the callback exits.
    const { data: subscription } = client.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED") return;
      if (pendingTimer) clearTimeout(pendingTimer);
      pendingTimer = setTimeout(() => {
        void check(session?.user ?? null, event === "USER_UPDATED");
      }, 0);
    });

    // Explicitly handle initialization failures instead of leaving a spinner forever.
    void client.auth.getUser()
      .then(({ data, error: userError }) => {
        if (!mounted) return;
        if (userError) {
          if (pendingTimer) clearTimeout(pendingTimer);
          lastUserId.current = null;
          ++revision;
          setAccess({ status: "error", user: null });
        } else {
          void check(data.user);
        }
      })
      .catch(() => {
        if (!mounted) return;
        lastUserId.current = null;
        ++revision;
        setAccess({ status: "error", user: null });
      });

    return () => {
      mounted = false;
      ++revision;
      if (pendingTimer) clearTimeout(pendingTimer);
      subscription.subscription.unsubscribe();
    };
  }, [client]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { error: signInError } = await client.auth.signInWithPassword({ email, password });
      if (signInError) setError("No fue posible iniciar sesión. Revisa tus credenciales.");
    } catch {
      setError("No fue posible conectar con el servicio de autenticación.");
    } finally {
      setSubmitting(false);
    }
  }

  if (access.status === "checking") {
    return <section className="container page-space"><p role="status">Verificando acceso administrativo…</p></section>;
  }
  if (access.status === "error") {
    return <section className="container page-space access-page"><div className="access-card">
      <h1>No fue posible verificar el acceso</h1>
      <p>Comprueba tu conexión e inténtalo nuevamente. No se concedió acceso administrativo.</p>
      <button className="btn btn-secondary" type="button" onClick={() => window.location.reload()}>Reintentar</button>
    </div></section>;
  }
  if (access.status === "signed-out") {
    return <section className="container page-space access-page"><div className="access-card">
      <span className="overline">ACCESO RESTRINGIDO</span><h1>Administración de Oportunia</h1>
      <p>Ingresa con una cuenta autorizada. Para crear la primera cuenta de propietario, regístrate y verifica el correo autorizado en la página de acceso.</p>
      <p><a href="/acceso">Crear cuenta o verificar correo</a></p>
      <form className="form-stack" onSubmit={login}>
        <label>Correo electrónico<input required type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} /></label>
        <label>Contraseña<input required type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} /></label>
        {error && <div role="alert" className="alert alert-error">{error}</div>}
        <button className="btn btn-primary" type="submit" disabled={submitting}>{submitting ? "Ingresando…" : "Ingresar"}</button>
      </form>
    </div></section>;
  }
  if (access.status === "denied") {
    return <section className="container page-space"><div className="alert alert-warning">
      Tu cuenta no tiene permiso para administrar Oportunia. Un responsable debe autorizarla en Supabase.
      <button className="btn btn-secondary" type="button" onClick={() => { void client.auth.signOut(); }}>Cerrar sesión</button>
    </div></section>;
  }
  return <>{children}</>;
}
