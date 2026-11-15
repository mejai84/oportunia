import Link from "next/link";
export default function ReglasPage(){return <div className="container page-space">
 <div className="page-title"><span className="overline">TRANSPARENCIA · OPORTUNIA</span>
  <h1>Reglamento y condiciones de participación</h1></div>
 <section className="panel">
  <h2>1. Reglamento de cada edición</h2>
  <p>Cada edición indica el país donde puede comercializarse y su modalidad legal. Cuando se exige permiso, muestra la autoridad, el operador y el documento correspondiente. Cuando no se exige una autorización específica, muestra el fundamento jurídico documentado y su fuente. Ambos casos requieren reglamento, vigencia y cumplimiento de las demás normas aplicables. En Colombia, las rifas se gestionan con autorización.</p>
  <p><strong>Consulta siempre el enlace al reglamento específico desde <Link href="/numeros">Elegir números</Link>.</strong> Este resumen no lo sustituye.</p>
  <h2>2. Reserva y protección de números</h2>
  <p>Una reserva de diez números sin comprobante dura 24 horas. Si se presenta un comprobante antes del vencimiento, la reserva pasa a pendiente de verificación y sus números continúan bloqueados hasta que tesorería decida. El plazo objetivo de revisión es 72 horas; un atraso no libera automáticamente esos números.</p>
  <h2>3. Confirmación manual y cuotas</h2>
  <p>Los pagos se transfieren a las cuentas bancarias que aparecen publicadas en cada edición. Un comprobante no demuestra por sí mismo que el dinero llegó. Tesorería revisa el abono directamente, registra referencia bancaria única, fecha y responsable; solo entonces el sistema acredita el valor y asigna números adicionales.</p>
  <p>La oportunidad cuesta $50.000 COP y puede tener uno, dos o tres abonos: $50.000; dos veces $25.000; o $20.000 + $15.000 + $15.000, cuando esas modalidades estén contempladas por las reglas aplicables a la edición. Los números se asignan proporcionalmente a los valores confirmados, hasta un máximo de 50.</p>
  <h2>4. País de residencia y pagos internacionales</h2>
  <p>Las ediciones se configuran para un país concreto. Si la edición es extranjera, la administración debe confirmar la elegibilidad territorial del comprador antes de reservar. El sistema actual cobra únicamente en pesos colombianos a cuentas Bancolombia o Nequi; no se ha habilitado una pasarela ni medios de pago locales de otros países.</p>
  <h2>5. Participación y sorteo</h2>
  <p>Una reserva, comprobante en revisión o abono parcial <strong>no habilita para participar</strong>. La totalidad de $50.000 debe estar confirmada manualmente y la edición debe estar vigente. El resultado y entrega de premio siguen las reglas aprobadas de la edición.</p>
  <h2>6. WhatsApp y privacidad</h2>
  <p>El grupo por edición es opcional; la invitación se presenta después del pago total confirmado y del consentimiento del titular. Quienes se unan verán el nombre y número de teléfono de WhatsApp de los demás participantes. Puedes retirar tu consentimiento desde Mi cuenta, aunque ello no implica que se te expulse automáticamente del grupo.</p>
  <h2>7. Atención y reclamaciones</h2>
  <p>Consulta en tu cuenta los comprobantes y decisiones. Si una transferencia no coincide con tu reporte o una reserva vence, contacta al equipo antes de efectuar un segundo pago. Las reglas particulares definen reembolsos, plazos y demás obligaciones.</p>
  <div className="row-actions"><Link href="/numeros" className="btn btn-primary">Ver edición y condiciones legales</Link>
   <Link href="/mi-cuenta" className="btn btn-secondary">Consultar mis pedidos</Link></div>
 </section>
 </div>;}
