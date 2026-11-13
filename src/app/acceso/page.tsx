"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";

export default function AccesoPage() {
  const [phone, setPhone] = useState("");
  const [notice, setNotice] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("La conexión con WhatsApp Business aún no está habilitada. No se ha enviado ningún código ni se ha creado una sesión.");
  }
  return <div className="container page-space access-page">
    <div className="access-card">
      <span className="overline">ACCESO SEGURO · EN PREPARACIÓN</span>
      <h1>Tu cuenta, con tu celular.</h1>
      <p className="muted">En la versión definitiva recibirás un código temporal por WhatsApp para confirmar que el número te pertenece. No enviaremos contraseñas permanentes.</p>
      <form className="form-stack" onSubmit={submit}>
        <label>Número de celular (Colombia)<input type="tel" required autoComplete="tel" inputMode="tel"
          pattern="\+?[0-9 ]{10,16}" placeholder="300 000 0000" value={phone}
          onChange={(e) => setPhone(e.target.value)} /></label>
        <button className="btn btn-primary full" type="submit">Ver estado de la integración</button>
      </form>
      {notice && <div className="alert alert-warning top-gap" role="status">{notice}</div>}
      <p className="small muted top-gap">Pendiente: proveedor de WhatsApp Business, plantillas autorizadas, validación OTP, protección contra intentos y sesiones seguras.</p>
      <Link href="/mi-cuenta" className="btn btn-secondary">Ver Mi cuenta de demostración →</Link>
    </div>
  </div>;
}
