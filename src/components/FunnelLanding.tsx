"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { money } from "@/lib/domain";
import { usePublicDraws } from "@/lib/usePublicDraws";

import { DrawCarousel } from "@/components/DrawCarousel";
import { HomeBenefits, HomeParticipation, HomeIcon } from "@/components/HomeMarketingSections";
import { SocialProofSections } from "@/components/SocialProofSections";
import { campaignFromSearch } from "@/lib/funnel";
import { selectPrizeImage } from "@/lib/prizePhotography";

const PAYMENT_EXAMPLES = [0, 10000, 20000, 25000, 35000, 50000];

const faqs = [
  {
    "question": "¿Qué es Oportunia?",
    "answer": "Oportunia reúne oportunidades de ganar premios. En cada edición encontrarás sus condiciones de participación y el mecanismo de selección del ganador."
  },
  {
    "question": "¿Cómo sé si una oportunidad está disponible?",
    "answer": "Consulta el estado de cada edición y sus reglas. Las propuestas marcadas como «Idea de premio» muestran posibles premios para el futuro."
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
    "answer": "Se asignarían de forma aleatoria y sin duplicados dentro de la misma edición, según el total abonado y las condiciones de la edición."
  },
  {
    "question": "¿Los números se repiten entre clientes?",
    "answer": "En una misma edición, cada número debe corresponder a una sola oportunidad activa. Ediciones distintas pueden utilizar la misma numeración, porque son independientes."
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
    "question": "¿Cuándo se realizará la selección del ganador?",
    "answer": "La fecha se publicará en la ficha oficial de cada edición, junto con las condiciones y autorizaciones aplicables. Actualmente no hay una fecha confirmada para la edición anunciada."
  },
  {
    "question": "¿Cómo se define el número ganador?",
    "answer": "Se contempla tomar un resultado oficial de lotería, según la mecánica que establezca el reglamento autorizado de cada edición. No se anunciará un mecanismo definitivo antes de publicarlo."
  },
  {
    "question": "¿Dónde podré consultar los resultados?",
    "answer": "En la sección «Resultados y ganadores», con fecha, número ganador y fuente de verificación. No se publican ganadores inventados."
  },
  {
    "question": "¿Cómo sé que las opiniones son auténticas?",
    "answer": "Las opiniones se envían desde cuentas registradas, pasan por revisión y se publican en la sección de la comunidad."
  },
  {
    "question": "¿Puedo opinar sobre una edición?",
    "answer": "Sí. Desde «Mi cuenta», al iniciar sesión, puedes enviar una calificación de 1 a 5 estrellas y un comentario por edición. Las opiniones pasan por revisión antes de publicarse."
  },
  {
    "question": "¿Cómo ingreso a mi cuenta?",
    "answer": "Puedes registrarte o iniciar sesión con correo electrónico y contraseña. El acceso por celular requerirá un proveedor de códigos de verificación y se anunciará cuando esté disponible."
  },
  {
    "question": "¿Mis números se guardan si cambio de celular?",
    "answer": "Tu cuenta permite consultar los reportes y avisos registrados. Algunas herramientas de cálculo y selección del navegador no representan participaciones oficiales."
  },
  {
    "question": "¿Es posible comprar o pagar en este momento?",
    "answer": "La compra de oportunidades estará disponible cuando se anuncie la apertura y se publiquen los medios de pago autorizados. Revisa las condiciones de cada edición."
  },
  {
    "question": "¿Qué debo hacer si tengo una duda o una reclamación?",
    "answer": "Consulta el reglamento y los canales de atención oficiales publicados para cada edición. No compartas contraseñas, códigos de acceso ni datos bancarios en comentarios públicos."
  }
];type Props = { leadCaptureEnabled: boolean };

export function FunnelLanding({ leadCaptureEnabled }: Props) {
  const { draws } = usePublicDraws();
  const featuredDraw = draws[0];
  const heroPhoto = selectPrizeImage(featuredDraw?.id||"principal",featuredDraw?.hero_image_url,"/raffles/iphone18-hero.svg");
  const heroImage = heroPhoto.src;
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
  const fullDistribution = amount === 50000;

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
          <div className="f-eyebrow"><HomeIcon name="sparkles" size={17}/> OPORTUNIDAD DESTACADA · EN PREPARACIÓN</div>
          <h1>¡Descubre el próximo <span className="f-highlight">{featuredDraw?.prize || "iPhone 18"}</span>!</h1>
          <p className="f-hero-description">Descubre premios, conoce cómo elegir tus números y sigue las novedades de cada edición.</p>
          <div className="f-hero-actions">
            <a href="#sorteos" className="f-button f-button-primary"><HomeIcon name="sparkles" size={19}/> Explorar oportunidades <HomeIcon name="arrow-right" size={18}/></a>
            <a href="#como-funciona" className="f-button f-button-outline"><HomeIcon name="zap" size={19}/> Cómo funciona</a>
          </div>
          <div className="f-hero-foot"><span><HomeIcon name="shield" size={16}/> Reglas claras</span><span><HomeIcon name="numbers" size={16}/> Números a tu manera</span><span><HomeIcon name="bell" size={16}/> Seguimiento de avisos</span></div>
        </div>
        <div className="f-showcase">
          <div className="f-showcase-top"><span className="f-showcase-kicker">PREMIO DESTACADO</span><span className="f-showcase-demo">{featuredDraw?.status==="closed"?"EDICIÓN CERRADA":"PRÓXIMAMENTE"}</span></div>
          <div className="f-phone-stage" aria-label="Premio destacado de Oportunia">
            {heroImage ? <><img className={"f-hero-upload"+(heroPhoto.isStockPhoto?" o-home-real-photo":"")} src={heroImage} alt={heroPhoto.description} onError={event=>{event.currentTarget.onerror=null;event.currentTarget.src="/raffles/iphone18-hero.svg";event.currentTarget.classList.remove("o-home-real-photo");}}/>{heroPhoto.isStockPhoto&&<span className="o-home-photo-attribution">Fotografía de referencia</span>}</> : <>
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
            <div><span>Valor de referencia</span><strong>$50.000 <small>COP</small></strong></div>
            <div className="f-showcase-rule" />
            <div><span>Modalidad</span><strong>50 <small>números</small></strong></div>
          </div>
          <div className="o-home-hero-status" aria-label="Estado informativo de la edición">
            <div><strong>Estado de la edición</strong><span>{featuredDraw?.status==="closed"?"Cerrada":"Próximamente"}</span></div>
            <p><HomeIcon name="clock" size={15}/> {featuredDraw?.status==="closed"?"Consulta el historial de resultados":"Fecha por anunciar"}</p>
          </div>
        </div>
      </div>
      <div className="f-hero-glow" />
    </section>

    <HomeBenefits />
    <DrawCarousel />
    <HomeParticipation />
    <section className="container f-stats" aria-label="Características de la propuesta">
      <div><strong>200</strong><span>Oportunidades previstas por edición</span></div>
      <div><strong>10.000</strong><span>Números de cuatro cifras</span></div>
      <div><strong>10 + 40</strong><span>Iniciales a tu elección + aleatorios</span></div>
      <div><strong>$50.000</strong><span>Valor por oportunidad</span></div>
    </section>

    <SocialProofSections />

    <section className="f-demo-section" id="simulador">
      <div className="container f-demo-grid">
        <div className="f-demo-copy">
          <span className="f-kicker">CALCULADORA DE NÚMEROS</span>
          <h2>Descubre cómo se <span className="f-highlight">distribuyen tus números.</span></h2>
          <p>Elige un importe de referencia y conoce la distribución de 10 números iniciales y hasta 40 adicionales.</p>
          <div className="f-example-label">Importe de referencia</div>
          <div className="f-amount-options">
            {PAYMENT_EXAMPLES.map((value) => <button key={value} type="button"
              className={"f-amount" + (amount === value ? " active" : "")}
              aria-pressed={amount === value} onClick={() => setAmount(value)}>{money(value)}</button>)}
          </div>
          <div className="f-example-note">Cálculo orientativo: esta herramienta no procesa transferencias ni acredita pagos.</div>
        </div>
        <div className="f-demo-card">
          <div className="f-demo-card-header"><span>ESTADO DE TU OPORTUNIDAD</span><span className={"f-state" + (fullDistribution ? " is-ready" : "")}>{fullDistribution ? "50 / 50 NÚMEROS" : "DISTRIBUCIÓN ESTIMADA"}</span></div>
          <div className="f-demo-total"><strong>{chosen + random}</strong><span>de 50 números asignados</span></div>
          <div className="f-progress"><div style={{ width: String((chosen + random) / 50 * 100) + "%" }} /></div>
          <div className="f-demo-breakdown">
            <div><span className="f-demo-dot selected" /><span>10 números iniciales</span><strong>{chosen} / 10</strong></div>
            <div><span className="f-demo-dot random" /><span>Asignados al azar</span><strong>{random} / 40</strong></div>
            <div><span className="f-demo-dot remaining" /><span>Pendientes</span><strong>{50 - chosen - random}</strong></div>
          </div>
          <div className={"f-demo-status" + (fullDistribution ? " is-ready" : "")}>
            <strong>{fullDistribution ? "Distribución completa" : "Distribución parcial"}</strong>
            <p>{fullDistribution ? "Ejemplo de distribución de 50 números." : "Importe adicional de referencia: " + money(50000 - amount) + "."}</p>
          </div>
        </div>
      </div>
    </section>

    <section className="container f-section f-conversion" id="registro">
      <div className="f-conversion-copy">
        <span className="f-kicker">MANTENTE INFORMADO</span>
        <h2>¿Te interesa conocer el lanzamiento?</h2>
        <p>Descubre las novedades, los premios y las próximas fechas de Oportunia.</p>
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
          <button className="f-button f-button-primary f-submit" disabled={!leadCaptureEnabled || saving} type="submit">{saving ? "Enviando..." : leadCaptureEnabled ? "Enviar solicitud ↗" : "Próximamente"}</button>
          <p className="f-lead-legal">La disponibilidad de este formulario depende de las condiciones de privacidad y tratamiento de datos de Oportunia.</p>
        </form>
      </div>
    </section>

    <section className="f-faq-section" id="preguntas">
      <div className="container f-faq-grid">
        <div><span className="f-kicker">RESPUESTAS CLARAS</span><h2>Preguntas frecuentes.</h2><p>Resolvemos tus dudas sobre números, abonos, resultados, seguridad y apertura de ediciones.</p></div>
        <div className="f-faq-list">{faqs.map((faq) =>
          <details key={faq.question}><summary>{faq.question}<span aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}</div>
      </div>
    </section>

    <section className="container f-last-section">
      <div className="f-last-card"><div className="f-last-light" /><span className="f-kicker">CONOCE LA EXPERIENCIA</span>
        <h2>Tú eliges cómo empezar. <span>Las reglas, siempre claras.</span></h2>
        <p>Conoce el proceso de asignación antes de la apertura de cada edición.</p>
        <a className="f-button f-button-primary" href="#sorteos">Explorar oportunidades ↗</a>
      </div>
    </section>
    <div className="f-mobile-action"><a href="#sorteos" className="f-button f-button-primary">Explorar oportunidades ↗</a></div>
  </div>;
}
