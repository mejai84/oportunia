import Link from "next/link";

export default function RecuperarPage(){
 return <div className="container page-space">
  <div className="page-title"><span className="overline">SELECCIÓN CENTRAL · OPORTUNIA</span>
   <h1>Consulta tus números en Supabase</h1>
   <p>Las reservas actuales se administran desde tu cuenta y el inventario central. No se recuperan automáticamente selecciones antiguas almacenadas solo en un navegador.</p>
  </div>
  <section className="panel">
   <h2>Renovar una selección vencida</h2>
   <p>Cuando una selección de ensayo vence, sus números quedan disponibles nuevamente. Puedes crear una nueva selección de diez números, siempre que haya disponibilidad y se cumplan los límites del ensayo.</p>
   <p className="muted">No existe compra ni participación oficial por renovar una selección de prueba.</p>
   <div className="row-actions">
    <Link href="/numeros" className="btn btn-primary">Consultar disponibilidad central</Link>
    <Link href="/mi-cuenta" className="btn btn-secondary">Mi historial</Link>
   </div>
  </section>
 </div>;
}
