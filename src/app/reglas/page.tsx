import Link from "next/link";
export default function ReglasPage() {
 return <div className="container page-space legal-page">
  <span className="overline">INFORMACIÓN DE PARTICIPACIÓN · CONDICIONES PRELIMINARES</span>
  <h1>Reglas claras desde el inicio.</h1>
  <section className="panel">
   <p><strong>Estado actual:</strong> estas son las condiciones de funcionamiento previstas. No constituyen un reglamento autorizado ni una convocatoria abierta. Antes de aceptar pagos se publicarán las condiciones definitivas, fechas y autorizaciones correspondientes.</p>
   <h2>1. Precio y numeración previstos</h2>
   <p>La modalidad propuesta para la edición de iPhone contempla una oportunidad de COP $50.000 y 50 números de cuatro cifras: 10 elegidos o asignados automáticamente y 40 adicionales asignados con los abonos confirmados.</p>
   <h2>2. Elegibilidad</h2>
   <p><strong>Solo una oportunidad pagada y confirmada al 100 % podría participar en un sorteo oficialmente habilitado.</strong> La selección, una reserva inicial o un abono parcial no dan derecho a participar.</p>
   <h2>3. Reserva inicial</h2>
   <p>El mecanismo previsto contempla 24 horas para confirmar el primer abono. Los números sin abono podrían liberarse al vencimiento, según las condiciones publicadas para la edición.</p>
   <h2>4. Cuotas y protección de abonos</h2>
   <p>Se prevén modalidades de pago completo, dos cuotas o tres cuotas. Las reglas de vencimiento, cancelación, devolución y conservación de abonos parciales deberán estar publicadas antes de recibir dinero.</p>
   <h2>5. Sorteo, resultados y premio</h2>
   <p>La fecha, el mecanismo de selección, la entidad de referencia, la entrega del premio y las autorizaciones aplicables se informarán en el reglamento de cada edición. Solo se publicarán resultados verificables.</p>
   <h2>6. Cuenta y datos</h2>
   <p>El registro y acceso por correo utilizan Supabase Auth. La verificación por celular aún requiere un proveedor de códigos. Las opiniones y el catálogo tienen almacenamiento central; las selecciones de números y reportes de pagos que se muestran actualmente se guardan únicamente en este navegador.</p>
   <h2>7. Disponibilidad de operaciones</h2>
   <p>La selección local no representa una reserva real. No existe un canal de cobro habilitado en las pantallas de selección y abonos. No envíes dinero ni compartas datos bancarios hasta que se publiquen los medios oficiales y se habilite el sistema central.</p>
   <p className="muted small">Información preliminar sujeta a actualización antes de abrir una edición.</p>
   <Link className="btn btn-primary" href="/">Ver próximos sorteos</Link>
  </section>
 </div>;
}