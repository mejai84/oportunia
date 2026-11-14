import Link from "next/link";

/** Feedback publishing is disabled until verifiable customer eligibility exists. */
export function MyReviews(){
 return <section className="panel review-account-panel" aria-label="Opiniones de clientes">
  <span className="overline">COMUNIDAD OPORTUNIA</span>
  <h2>Opiniones vinculadas a participaciones verificadas</h2>
  <p>El envío de reseñas está temporalmente deshabilitado. Solo se habilitará cuando podamos comprobar una participación real asociada a tu cuenta, con las autorizaciones correspondientes.</p>
  <p className="muted small">No mostramos comentarios inventados ni tratamos las simulaciones como compras verificadas.</p>
  <Link href="/reglas" className="btn btn-secondary">Conocer las condiciones</Link>
 </section>;
}
