"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { money } from "@/lib/domain";
import { usePublicDraws } from "@/lib/usePublicDraws";

import { DrawCarousel } from "@/components/DrawCarousel";
import { SocialProofSections } from "@/components/SocialProofSections";
import { campaignFromSearch } from "@/lib/funnel";

const PAYMENT_EXAMPLES = [0, 10000, 20000, 25000, 35000, 50000];

const faqs = [
  {
    "question": "¿Qué es Oportunia?",
    "answer": "Oportunia es una plataforma para consultar sorteos, conocer sus premios y reglas y, cuando una edición esté oficialmente habilitada, gestionar oportunidades de participación."
  },
  {
    "question": "¿Cómo sé si un sorteo está disponible?",
    "answer": "Consulta la ficha de cada edición. Solo se considerará abierta cuando se publiquen su reglamento, fecha, condiciones y canales oficiales de pago. Las tarjetas marcadas «Idea de premio» son propuestas visuales, no sorteos activos."
  },
  {
    "question": "¿Cuánto cuesta una oportunidad?",
    "answer": "La modalidad prevista para la edición de iPhone contempla $50.000 COP por oportunidad y 50 números de cuatro cifras. El precio definitivo se confirma en el reglamento de la edición habilitada."
  },
  {
    "question": "¿Cuántos números recibe cada oportunidad?",
    "answer": "La modalidad propuesta incluye 50 números diferentes de cuatro cifras: 10 que eliges o recibes automáticamente y 40 adicionales que se asignan progresivamente al confirmar abonos."
  },
  {
    "question": "¿Puedo elegir mis propios números?",
    "answer": "Sí. La modalidad prevista permite seleccionar 10 números entre 0000 y 9999, siempre que estén libres. También puedes solicitar asignación automática."
  },
  {
    "question": "¿Qué ocurre con los otros 40 números?",
    "answer": "Se asignarían de forma aleatoria y sin duplicados dentro del mismo sorteo, según el total abonado y las condiciones de la edición."
  },
  {
    "question": "¿Los números se repiten entre clientes?",
    "answer": "En un mismo sorteo, cada número debe corresponder a una sola oportunidad activa. Sorteos distintos pueden utilizar la misma numeración, porque son ediciones independientes."
  },
  {
    "question": "¿Puedo pagar de contado?",
    "answer": "Sí, el pago completo es la opción principal prevista. También se contemplan dos o tres cuotas, sujetas a las reglas que se publiquen antes de abrir ventas."
  },
  {
    "question": "¿Cómo funcionarían las cuotas?",
    "answer": "Las opciones previstas son dos pagos de $25.000 o tres abonos de $20.000, $15.000 y $15.000. El pago total de $50.000 es indispensable para participar."
  },
  {
    "question": "¿Con un abono parcial puedo ganar?",
    "answer": "No. Los números reservados o asignados por pagos parciales no participan. Solo una oportunidad totalmente pagada y confirmada podría ser elegible, conforme al reglamento autorizado."
  },
  {
    "question": "¿Cuánto dura la reserva de números?",
    "answer": "El plazo previsto es de 24 horas sin un primer abono confirmado. Al vencer, los números pueden liberarse. Este mecanismo solo será vinculante cuando funcione en el sistema central y conste en el reglamento."
  },
  {
    "question": "¿Qué pasa si se vence mi reserva?",
    "answer": "Podrás intentar recuperar los números que continúen disponibles y sustituir los que otra persona haya ocupado. La disponibilidad deberá verificarse en el sistema central al confirmar."
  },
  {
    "question": "¿Qué sucede si ya hice un abono y no completo el saldo?",
    "answer": "Las condiciones sobre vencimiento, conservación de abonos, cancelaciones y devoluciones se publicarán antes de aceptar dinero. No se perderán abonos por una regla que no se haya informado previamente."
  },
  {
    "question": "¿Cómo sabré si se confirmó mi pago?",
    "answer": "Cuando se habiliten pagos reales, Oportunia deberá mostrar un comprobante verificable y el estado confirmado de la operación. Una referencia ingresada manualmente no prueba por sí sola que el dinero fue recibido."
  },
  {
    "question": "¿Puedo pagar por Nequi, PSE o transferencia?",
    "answer": "Los medios disponibles se anunciarán únicamente después de activar y verificar los canales oficiales de recaudo. No envíes dinero a cuentas difundidas por terceros."
  },
  {
    "question": "¿Cuándo se realizará el sorteo?",
    "answer": "La fecha se publicará en la ficha oficial de cada edición, junto con las condiciones y autorizaciones aplicables. Actualmente no hay una fecha confirmada para la edición anunciada."
  },
  {
    "question": "¿Cómo se define el número ganador?",
    "answer": "Se contempla tomar un resultado oficial de lotería, según la mecánica que establezca el reglamento autorizado de cada edición. No se anunciará un mecanismo definitivo antes de publicarlo."
  },
  {
    "question": "¿Dónde podré consultar los resultados?",
    "answer": "En la sección «Sorteos realizados y ganadores», con fecha, número ganador y fuente de verificación. No se publican ganadores inventados."
  },
  {
    "question": "¿Cómo sé que las opiniones son auténticas?",
    "answer": "Las reseñas reales proceden de cuentas identificadas y pasan por moderación. Si todavía no existen, los ejemplos de diseño se distinguen expresamente de las opiniones reales."
  },
  {
    "question": "¿Puedo calificar un sorteo?",
    "answer": "Sí. Desde «Mi cuenta», al iniciar sesión, puedes enviar una calificación de 1 a 5 estrellas y un comentario por sorteo. Las opiniones pasan por revisión antes de publicarse."
  },
  {
    "question": "¿Cómo ingreso a mi cuenta?",
    "answer": "Puedes registrarte o iniciar sesión con correo electrónico y contraseña. El acceso por celular requerirá un proveedor de códigos de verificación y se anunciará cuando esté disponible."
  },
  {
    "question": "¿Mis números se guardan si cambio de celular?",
    "answer": "El catálogo y las opiniones ya usan una base de datos central. El módulo actual de selección y pagos todavía utiliza almacenamiento local del navegador: no garantiza sincronización entre dispositivos ni una reserva comercial."
  },
  {
    "question": "¿Es posible comprar o pagar en este momento?",
    "answer": "Todavía no. El módulo de selección y reporte de pagos es una vista previa de funcionamiento; no existe un recaudo real ni una reserva central confirmada. Las ventas se habilitarán tras completar el sistema y los requisitos aplicables."
  },
  {
    "question": "¿Qué debo hacer si tengo una duda o una reclamación?",
    "answer": "Consulta el reglamento y los canales de atención oficiales publicados para cada edición. No compartas contraseñas, códigos de acceso ni datos bancarios en comentarios públicos."
  }
];type Props = { leadCaptureEnabled: boolean };

export function FunnelLanding({ leadCaptureEnabled }: Props) {
  const { draws } = usePublicDraws();
  const featuredDraw = draws[0];
  const heroImage = featuredDraw?.hero_image_url || "/raffles/iphone18-hero.svg";
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
          <div className="f-eyebrow"><span className="f-live-dot" /> SORTEOS QUE TE ACERCAN A LO QUE QUIERES</div>
          <h1>Descubre tu próximo <span className="f-highlight">{featuredDraw?.prize || "gran premio"}</span> con <em>Oportunia.</em></h1>
          <p className="f-hero-description">Próximamente podrás explorar sorteos, elegir tus números o recibirlos automáticamente y seguir cada edición con reglas claras.</p>
          <div className="f-hero-actions">
            <a href="#sorteos" className="f-button f-button-primary">Ver próximos sorteos <span aria-hidden="true">↗</span></a>
            <a href="#como-funciona" className="f-button f-button-outline">Así funciona <span aria-hidden="true">↓</span></a>
          </div>
          <div className="f-hero-foot"><span>✓ Reglas claras</span><span>✓ Selección a tu manera</span><span>✓ Información transparente</span></div>
          <p className="f-disclosure">Premio ilustrativo y sujeto a disponibilidad. Aún no hay venta ni participación habilitada; se publicarán reglamento y autorizaciones antes de la apertura.</p>
        </div>
        <div className="f-showcase">
          <div className="f-showcase-top"><span className="f-showcase-kicker">PRÓXIMA EDICIÓN</span><span className="f-showcase-demo">PRÓXIMAMENTE</span></div>
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
    <SocialProofSections />
    <section className="container f-stats" aria-label="Características de la propuesta">
      <div><strong>200</strong><span>Oportunidades previstas por sorteo</span></div>
      <div><strong>10.000</strong><span>Números de cuatro cifras</span></div>
      <div><strong>10 + 40</strong><span>Iniciales a tu elección + aleatorios</span></div>
      <div><strong>$50.000</strong><span>Valor por oportunidad</span></div>
    </section>

    <section className="container f-section" id="como-funciona">
      <div className="f-section-head"><span className="f-kicker">EL PROCESO</span>
        <h2>Así funciona cada oportunidad.</h2>
        <p>Un proceso transparente, desde la elección hasta la habilitación.</p>
      </div>
      <div className="f-steps">
        <article><span className="f-step-icon">01 <b>◇</b></span><h3>Escoge o recibe 10 números</h3><p>Elige tus 10 favoritos o deja que Oportunia los asigne automáticamente entre los disponibles cuando se habilite cada edición.</p></article>
        <article><span className="f-step-icon">02 <b>◫</b></span><h3>Define tus cuotas</h3><p>Conoce el pago completo o las opciones previstas de dos y tres cuotas. Los medios de pago se publicarán cuando estén habilitados.</p></article>
        <article><span className="f-step-icon">03 <b>✧</b></span><h3>Recibe aleatorios</h3><p>Al confirmar cada abono se asignarían más números, hasta completar los 40 aleatorios.</p></article>
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
        <p>Estamos preparando el lanzamiento. El registro de interesados estará disponible cuando publiquemos las condiciones de privacidad.</p>
        <div className="f-conversion-points"><span>✓ Información de lanzamiento</span><span>✓ Sin obligación de compra</span><span>✓ Canales oficiales</span></div>
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
          <p className="f-lead-legal">Este formulario no representa una compra, una reserva ni la inscripción a un sorteo. El registro permanecerá cerrado hasta publicar la política de privacidad y habilitar el tratamiento de datos.</p>
        </form>
      </div>
    </section>

    <section className="f-faq-section" id="preguntas">
      <div className="container f-faq-grid">
        <div><span className="f-kicker">RESPUESTAS CLARAS</span><h2>Preguntas frecuentes.</h2><p>Resolvemos tus dudas sobre números, abonos, resultados, seguridad y apertura de sorteos.</p></div>
        <div className="f-faq-list">{faqs.map((faq) =>
          <details key={faq.question}><summary>{faq.question}<span aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}</div>
      </div>
    </section>

    <section className="container f-last-section">
      <div className="f-last-card"><div className="f-last-light" /><span className="f-kicker">CONOCE LA EXPERIENCIA</span>
        <h2>Tú eliges cómo empezar. <span>Las reglas, siempre claras.</span></h2>
        <p>Conoce el proceso de asignación antes de la apertura de los sorteos.</p>
        <a className="f-button f-button-primary" href="#sorteos">Explorar sorteos ↗</a>
      </div>
    </section>
    <div className="f-mobile-action"><a href="#sorteos" className="f-button f-button-primary">Explorar sorteos ↗</a></div>
  </div>;
}
