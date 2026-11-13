import Link from "next/link";
export default function ReglasPage() {
  return <div className="container page-space legal-page">
    <span className="overline">REGLAS DEL PROTOTIPO · NO ES UN REGLAMENTO AUTORIZADO</span>
    <h1>Reglas claras, desde el inicio.</h1>
    <section className="panel">
      <h2>1. Valor y números</h2>
      <p>En la demostración cada oportunidad cuesta COP $50.000 y corresponde a 50 números de cuatro cifras. Puedes elegir los diez iniciales o recibirlos automáticamente; los otros 40 se asignan conforme se aprueban los abonos.</p>
      <h2>2. Participación condicionada al pago completo</h2>
      <p><strong>Si no se confirma el pago del 100 % de la oportunidad, ninguno de los números asignados participa en el sorteo.</strong> La reserva, la selección y los pagos parciales no dan derecho a participar.</p>
      <h2>3. Reserva inicial</h2>
      <p>Los diez números iniciales se reservan durante 24 horas. Si no se confirma el primer abono en ese plazo, se liberan. Si vuelves, podrás recuperar los que continúen disponibles y reemplazar los ocupados.</p>
      <h2>4. Abonos parciales</h2>
      <p>Las oportunidades con dinero confirmado no se liberan automáticamente en esta demo mientras se define una política transparente de vencimientos, conservación de abonos y reembolsos. La confirmación de un reporte de pago de prueba depende del administrador.</p>
      <h2>5. Sorteos y publicación</h2>
      <p>El administrador puede mostrar o pausar sorteos independientes. La fecha, mecánica, permisos, tratamiento de impagos y entrega del premio requieren un reglamento autorizado antes de aceptar pagos reales.</p>
      <h2>6. Acceso y privacidad</h2>
      <p>El acceso por celular con código temporal de WhatsApp todavía no está habilitado. Los datos de este prototipo se guardan localmente en el navegador. No introduzcas información bancaria ni realices pagos.</p>
      <p className="muted small">Versión demostrativa 2026-11-13-v2. La aceptación queda registrada solo en este navegador.</p>
      <Link className="btn btn-primary" href="/numeros">Volver a elegir números</Link>
    </section>
  </div>;
}
