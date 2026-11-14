import Link from "next/link";
import { CustomerBankReports } from "@/components/CustomerBankReports";

export default function PagosPage() {
 return <div className="container page-space">
   <div className="page-title"><span className="overline">TRANSFERENCIAS Y SEGUIMIENTO</span>
    <h1>Tu reporte, <span className="gradient-text">paso a paso.</span></h1>
    <p className="muted">Registra una referencia de transferencia y consulta su seguimiento desde tu cuenta Oportunia.</p>
   </div>
   <div id="reportar-transferencia"><CustomerBankReports mode="full"/></div>
   <section className="panel top-gap">
    <h2>¿Dónde consultar el estado?</h2>
    <p>Desde Mi cuenta puedes consultar las referencias registradas y los cambios de estado asociados a tu usuario.</p>
    <p className="small muted">El registro de una referencia no equivale a una confirmación bancaria. Consulta las condiciones de cada edición antes de participar.</p>
    <div className="row-actions">
     <Link className="btn btn-primary" href="/mi-cuenta">Ver mi historial</Link>
     <Link className="btn btn-secondary" href="/reglas">Consultar condiciones</Link>
    </div>
   </section>
  </div>;
}
