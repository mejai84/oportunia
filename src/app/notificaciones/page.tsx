import Link from "next/link";
import { CustomerNotifications } from "@/components/CustomerNotifications";

export default function NotificacionesPage(){
  return <div className="container page-space">
    <div className="page-title"><span className="overline">MI CUENTA · COMUNICACIONES PRIVADAS</span>
      <h1>Buzón de <span className="gradient-text">notificaciones.</span></h1>
      <p className="muted">Consulta los cambios de estado de tus referencias y conserva el seguimiento desde cualquier dispositivo iniciando sesión.</p>
    </div>
    <CustomerNotifications standalone />
    <div className="row-actions top-gap"><Link href="/mi-cuenta" className="btn btn-secondary">Regresar a Mi cuenta</Link>
      <Link href="/pagos" className="btn btn-primary">Consultar reportes de pago</Link></div>
  </div>;
}
