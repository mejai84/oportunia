import Link from "next/link";
import {CommerceCustomer} from "@/components/CommerceCustomer";
export default function NumerosPage(){return <div className="container page-space">
 <div className="page-title"><span className="overline">OPORTUNIA · NÚMEROS Y RESERVAS</span>
  <h1>Escoge tus números</h1><p>Reserva diez números durante 24 horas; si envías tu comprobante a tiempo, permanecerán protegidos mientras tesorería lo verifica manualmente.</p>
  <p className="muted">Solo un abono confirmado por el banco receptor y revisado por tesorería puede generar números adicionales. Consulta el reglamento de la edición.</p>
 </div><CommerceCustomer/>
 <div className="panel top-gap"><p>¿Quieres experimentar sin comprar? <Link href="/ensayo-reservas">Abrir simulador gratuito separado</Link>.</p></div>
 </div>;}
