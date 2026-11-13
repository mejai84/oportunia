import Link from "next/link";
export default function Home() {
  return <>
    <section className="hero"><div className="container hero-grid">
      <div>
        <div className="eyebrow"><span className="pulse-dot" /> PLATAFORMA DE OPORTUNIDADES · DEMO</div>
        <h1>Tu número.<br /><span className="gradient-text">Tu oportunidad.</span></h1>
        <p className="hero-lead">Elige tus 10 números favoritos de cuatro cifras. Los otros 40 se asignan aleatoriamente según tus pagos confirmados.</p>
        <div className="hero-actions">
          <Link className="btn btn-primary" href="/numeros">Elegir mis números ↗</Link>
          <Link className="btn btn-secondary" href="/mi-cuenta">Consultar mi cuenta</Link>
        </div>
        <p className="muted small hero-note">Una oportunidad solo participa cuando está completamente pagada.</p>
      </div>
      <div className="prize-card">
        <div className="prize-top"><span className="tag tag-gold">SORTEO DEMOSTRATIVO</span><span className="small muted">200 oportunidades</span></div>
        <div className="prize-art" aria-hidden="true"><div className="halo" /><div className="phone-mock"><div className="phone-lens" /><div className="phone-glow">✦</div></div></div>
        <h2>Un smartphone de alta gama</h2>
        <p className="muted small">Premio ilustrativo. Marca y modelo sujetos a definición y reglamento.</p>
        <div className="prize-price">
          <div><span className="muted small">Por oportunidad</span><strong>$50.000</strong></div>
          <div><span className="muted small">Números incluidos</span><strong>50</strong></div>
        </div>
      </div>
    </div></section>
    <section className="container metrics-section"><div className="metrics-grid">
      <div className="metric"><strong>200</strong><span>Oportunidades máximas</span></div>
      <div className="metric"><strong>10.000</strong><span>Números únicos</span></div>
      <div className="metric"><strong>10 + 40</strong><span>Elegidos + aleatorios</span></div>
      <div className="metric"><strong>100%</strong><span>Pagado para participar</span></div>
    </div></section>
    <section className="container section-space"><div className="section-heading">
      <span className="overline">ASÍ FUNCIONA</span><h2>Simple para el comprador. Claro para todos.</h2>
      <p className="muted">Cada paso queda registrado en la demostración.</p>
    </div><div className="steps-grid">
      <article className="step-card"><span className="step-number">01</span><h3>Escoge tus 10</h3><p>Busca números entre 0000 y 9999 y reserva tus diez favoritos.</p></article>
      <article className="step-card"><span className="step-number">02</span><h3>Elige cómo pagar</h3><p>Pago completo o financiación en dos o tres cuotas de prueba.</p></article>
      <article className="step-card"><span className="step-number">03</span><h3>Recibe tus aleatorios</h3><p>Cada $1.000 confirmado equivale a un número asignado, hasta completar 50.</p></article>
      <article className="step-card"><span className="step-number">04</span><h3>Habilita tu oportunidad</h3><p>Solo después de completar $50.000 participan los 50 números.</p></article>
    </div></section>
    <section className="container section-space"><div className="callout">
      <div><span className="overline">CONTROLES CLAROS</span><h2>¿Ya hiciste un abono?</h2>
        <p>Repórtalo en la demo y apruébalo desde el panel administrativo para ver cómo se asignan los números.</p></div>
      <Link className="btn btn-primary" href="/pagos">Reportar un pago ↗</Link>
    </div></section>
  </>;
}
