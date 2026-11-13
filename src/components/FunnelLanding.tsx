"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { money, drawCatalog } from "@/lib/domain";
import { useApp } from "@/components/AppProvider";
import { useDrawImage } from "@/lib/demoMedia";
import { DrawCarousel } from "@/components/DrawCarousel";
import { campaignFromSearch } from "@/lib/funnel";

const PAYMENT_EXAMPLES = [0, 10000, 20000, 25000, 35000, 50000];

const faqs = [
  {
    question: "¿Cómo se distribuyen los 50 números?",
    answer: "Puedes escoger 10 números de cuatro cifras o solicitar que el sistema los asigne automáticamente. Los otros 40 se asignan al confirmar los abonos. Solo el pago completo habilita los 50.",
  },
  {
    question: "¿Puedo pagar por cuotas?",
    answer: "La demostración permite simular pago completo, dos cuotas o tres cuotas. Por ejemplo, $20.000, $15.000 y $15.000. No se reciben transferencias reales. La reserva inicial sin abono aprobado vence en 24 horas.",
  },
  {
    question: "¿Los números que tengo asignados ya están jugando?",
    answer: "No. Una oportunidad solo puede participar cuando se haya confirmado el pago total de $50.000 y se cumplan las condiciones del reglamento autorizado.",
  },
  {
    question: "¿Cuándo se realizará el sorteo?",
    answer: "La propuesta contempla usar un resultado oficial de la Lotería de Medellín después del cierre de la comercialización y la cobranza. La fecha y el mecanismo definitivos dependerán de las autorizaciones y del reglamento. Todavía no hay fecha confirmada.",
  },
  {
    question: "¿Qué pasa si mi reserva vence?",
    answer: "Después de 24 horas sin confirmar el primer abono, los números se liberan. Puedes recuperar los que sigan disponibles y reemplazar los ocupados. Las cuotas ya abonadas requieren reglas de vencimiento independientes.",
  },
  {
    question: "¿Ya puedo comprar una oportunidad?",
    answer: "No. Este sitio es un prototipo para evaluar el proceso. La comercialización, los pagos y el sorteo real no están habilitados.",
  },
];

type Props = { leadCaptureEnabled: boolean };

export function FunnelLanding({ leadCaptureEnabled }: Props) {
  const { state, chooseDraw } = useApp();
  const featuredDraw = drawCatalog(state).find((draw) => draw.enabled);
  const heroImage = useDrawImage(featuredDraw?.id, "hero");
  const [amount, setAmount] = useState(50000);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contactConsent, setContactConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);

  const chosen = amount >= 10000 ? 10 : 0;
  const random = Math.max(0, Math.min(40, Math.floor(amount / 1000) - 10));
  const eligible = amount === 50000;

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!leadCaptureEnabled || saving) return;
    setNotice(null);
    setSaving(true);
    try {
      const attribution = campaignFromSearch(window.location.search);
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName, phone, email, contactConsent, marketingConsent, website,
          landingPath: window.location.pathname === "/embudo" ? "/embudo" : "/",
          ...attribution,
        }),
      });
      const result: { ok?: boolean; error?: string } = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "No se pudo guardar la solicitud.");
      }
      setNotice({ ok: true, message: "Solicitud recibida. Te contactaremos cuando haya novedades autorizadas." });
      setFullName(""); setPhone(""); setEmail(""); setContactConsent(false); setMarketingConsent(false);
    } catch (error) {
      setNotice({ ok: false, message: error instanceof Error ? error.message : "Intenta de nuevo más tarde." });
    } finally {
      setSaving(false);
    }
  }

  return <div className="funnel">
    <section className="f-hero">
      <div className="container f-hero-grid">
        <div className="f-hero-copy">
          <div className="f-eyebrow"><span className="f-live-dot" /> OPORTUNIA · EXPERIENCIA DEMOSTRATIVA</div>
          <h1>Tu próximo <span className="f-highlight">{featuredDraw?.prize || "gran premio"}</span> podría comenzar con <em>10 números a tu manera.</em></h1>
          <p className="f-hero-description">Conoce una nueva forma de organizar tus oportunidades: escoge tus favoritos o recíbelos automáticamente, simula pagos por cuotas y descubre cómo se asignarían los demás números.</p>
          <div className="f-hero-actions">
            <Link href="/numeros" onClick={() => { if (featuredDraw) chooseDraw(featuredDraw.id); }} className="f-button f-button-primary">Elegir o recibir mis números <span aria-hidden="true">↗</span></Link>
            <a href="#como-funciona" className="f-button f-button-outline">Así funciona <span aria-hidden="true">↓</span></a>
          </div>
          <div className="f-hero-foot"><span>✓ Sin pagos reales</span><span>✓ 10.000 números únicos</span><span>✓ Prueba gratuita</span></div>
          <p className="f-disclosure">Premio proyectado, no adquirido ni ofrecido comercialmente. Actividad sujeta a autorización y reglamento aplicable.</p>
        </div>
        <div className="f-showcase">
          <div className="f-showcase-top"><span className="f-showcase-kicker">PREMIO PROYECTADO</span><span className="f-showcase-demo">DEMO</span></div>
          <div className="f-phone-stage" aria-label="Ilustración decorativa del sorteo">
            {heroImage ? <img className="f-hero-upload" src={heroImage} alt="" /> : <>
              <div className="f-orbit f-orbit-one" /><div className="f-orbit f-orbit-two" />
              <div className="f-phone">
                <div className="f-phone-camera"><span /><span /><span /></div>
                <div className="f-phone-logo">✦</div>
              </div>
              <div className="f-floating-ticket"><small>TUS NÚMEROS</small><strong>0 0 0 7</strong><span>Tu número inicial</span></div>
              <div className="f-floating-spark">✧</div>
            </>}
          </div>
          <div className="f-showcase-bottom">
            <div><span>Una oportunidad</span><strong>$50.000 <small>COP</small></strong></div>
            <div className="f-showcase-rule" />
            <div><span>Incluye</span><strong>50 <small>números</small></strong></div>
          </div>
        </div>
      </div>
      <div className="f-hero-glow" />
    </section>

    <DrawCarousel />
    <section className="container f-stats" aria-label="Características de la propuesta">
      <div><strong>200</strong><span>Oportunidades por sorteo (demo)</span></div>
      <div><strong>10.000</strong><span>Números de cuatro cifras</span></div>
      <div><strong>10 + 40</strong><span>Iniciales a tu elección + aleatorios</span></div>
      <div><strong>$50.000</strong><span>Valor por oportunidad</span></div>
    </section>

    <section className="container f-section" id="como-funciona">
      <div className="f-section-head"><span className="f-kicker">EL PROCESO</span>
        <h2>Así de sencillo sería participar.</h2>
        <p>Un proceso transparente, desde la elección hasta la habilitación.</p>
      </div>
      <div className="f-steps">
        <article><span className="f-step-icon">01 <b>◇</b></span><h3>Escoge o recibe 10 números</h3><p>Elige tus 10 favoritos o deja que Oportunia los asigne automáticamente entre los disponibles en esta demostración.</p></article>
        <article><span className="f-step-icon">02 <b>◫</b></span><h3>Define tus cuotas</h3><p>Simula pagar de contado o mediante abonos. El primer abono mínimo del prototipo es de $10.000.</p></article>
        <article><span className="f-step-icon">03 <b>✧</b></span><h3>Recibe aleatorios</h3><p>Al aprobar cada abono de prueba se asignan más números, hasta completar los 40 aleatorios.</p></article>
        <article><span className="f-step-icon">04 <b>✓</b></span><h3>Habilita los 50</h3><p>Solo con $50.000 confirmados se considera habilitada la oportunidad. Un pago parcial no da derecho a jugar.</p></article>
      </div>
    </section>

    <section className="f-demo-section" id="simulador">
      <div className="container f-demo-grid">
        <div className="f-demo-copy">
          <span className="f-kicker">SIMULADOR INTERACTIVO</span>
          <h2>Mira qué ocurre con <span className="f-highlight">cada abono.</span></h2>
          <p>Selecciona cuánto habrías pagado. Verás cuántos números se asignarían y si la oportunidad estaría habilitada.</p>
          <div className="f-example-label">Total abonado (simulación)</div>
          <div className="f-amount-options">
            {PAYMENT_EXAMPLES.map((value) => <button key={value} type="button"
              className={"f-amount" + (amount === value ? " active" : "")}
              aria-pressed={amount === value} onClick={() => setAmount(value)}>{money(value)}</button>)}
          </div>
          <div className="f-example-note">Ejemplo: $20.000 confirmados = 10 iniciales + 10 aleatorios. Aún no participa.</div>
        </div>
        <div className="f-demo-card">
          <div className="f-demo-card-header"><span>ESTADO DE TU OPORTUNIDAD</span><span className={"f-state" + (eligible ? " is-ready" : "")}>{eligible ? "✓ HABILITADA" : "◷ NO PARTICIPA"}</span></div>
          <div className="f-demo-total"><strong>{chosen + random}</strong><span>de 50 números asignados</span></div>
          <div className="f-progress"><div style={{ width: String((chosen + random) / 50 * 100) + "%" }} /></div>
          <div className="f-demo-breakdown">
            <div><span className="f-demo-dot selected" /><span>10 números iniciales</span><strong>{chosen} / 10</strong></div>
            <div><span className="f-demo-dot random" /><span>Asignados al azar</span><strong>{random} / 40</strong></div>
            <div><span className="f-demo-dot remaining" /><span>Pendientes</span><strong>{50 - chosen - random}</strong></div>
          </div>
          <div className={"f-demo-status" + (eligible ? " is-ready" : "")}>
            <strong>{eligible ? "¡Pago completo!" : "Falta completar el pago"}</strong>
            <p>{eligible ? "Los 50 números estarían habilitados, sujeto a las reglas autorizadas." : "Saldo pendiente: " + money(50000 - amount) + ". Ningún número participa todavía."}</p>
          </div>
        </div>
      </div>
    </section>

    <section className="container f-section f-conversion" id="registro">
      <div className="f-conversion-copy">
        <span className="f-kicker">MANTENTE INFORMADO</span>
        <h2>¿Te interesa conocer el lanzamiento?</h2>
        <p>El formulario está preparado para guardar solicitudes en el proyecto Supabase de Oportunia cuando se habilite el registro con sus condiciones de privacidad.</p>
        <div className="f-conversion-points"><span>✓ Sin compromisos de compra</span><span>✓ Sin asignación real de números</span><span>✓ Sin cobros</span></div>
      </div>
      <div className="f-lead-card">
        <div className="f-lead-header"><h3>Solicitar información</h3><span className="f-lead-status">{leadCaptureEnabled ? "REGISTRO DISPONIBLE" : "PRÓXIMAMENTE"}</span></div>
        <form onSubmit={submitLead} className="f-lead-form">
          <label>Nombre completo<input disabled={!leadCaptureEnabled} required minLength={3} maxLength={100} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Tu nombre y apellido" /></label>
          <label>Celular de contacto<input disabled={!leadCaptureEnabled} required inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="300 000 0000" /></label>
          <label>Correo electrónico (opcional)<input disabled={!leadCaptureEnabled} type="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" /></label>
          <div className="f-honeypot" aria-hidden="true"><label>Sitio web<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label></div>
          <label className="f-check"><input disabled={!leadCaptureEnabled} required type="checkbox" checked={contactConsent} onChange={(e) => setContactConsent(e.target.checked)} /><span>Autorizo el contacto para responder a esta solicitud de información.</span></label>
          <label className="f-check"><input disabled={!leadCaptureEnabled} type="checkbox" checked={marketingConsent} onChange={(e) => setMarketingConsent(e.target.checked)} /><span>También deseo recibir novedades promocionales (opcional).</span></label>
          {notice && <p role="status" className={"f-lead-notice" + (notice.ok ? " good" : " bad")}>{notice.message}</p>}
          <button className="f-button f-button-primary f-submit" disabled={!leadCaptureEnabled || saving} type="submit">{saving ? "Enviando..." : leadCaptureEnabled ? "Enviar solicitud ↗" : "Registro aún no habilitado"}</button>
          <p className="f-lead-legal">Este formulario no representa una compra, una reserva ni la inscripción a un sorteo. El tratamiento de datos deberá ajustarse a la política de privacidad definitiva antes de habilitarse.</p>
        </form>
      </div>
    </section>

    <section className="f-faq-section" id="preguntas">
      <div className="container f-faq-grid">
        <div><span className="f-kicker">RESPUESTAS CLARAS</span><h2>Preguntas frecuentes.</h2><p>Sin letras pequeñas sobre el funcionamiento del prototipo.</p></div>
        <div className="f-faq-list">{faqs.map((faq) =>
          <details key={faq.question}><summary>{faq.question}<span aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}</div>
      </div>
    </section>

    <section className="container f-last-section">
      <div className="f-last-card"><div className="f-last-light" /><span className="f-kicker">PRUEBA LA EXPERIENCIA</span>
        <h2>Tú eliges cómo empezar. <span>Las reglas, siempre claras.</span></h2>
        <p>Escoge tus números o deja que el sistema los asigne, sin hacer ningún pago.</p>
        <Link className="f-button f-button-primary" href="/numeros">Probar asignación de números ↗</Link>
      </div>
    </section>
    <div className="f-mobile-action"><Link href="/numeros" className="f-button f-button-primary">Elegir o recibir números ↗</Link></div>
  </div>;
}
