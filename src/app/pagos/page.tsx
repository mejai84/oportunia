import Link from "next/link";
import {CommerceCustomer} from "@/components/CommerceCustomer";
export default function PagosPage(){return <div className="container page-space">
 <div className="page-title"><span className="overline">PAGOS · REVISIÓN MANUAL</span>
  <h1>Comprobantes y abonos</h1>
  <p>Si todavía estás dentro de las 24 horas de reserva, envía el comprobante para que tus números se bloqueen hasta la revisión de tesorería. Un comprobante no acredita un pago por sí mismo.</p>
  <Link href="/numeros" className="btn btn-secondary">Elegir números</Link>
 </div><CommerceCustomer accountOnly/>
 </div>;}
