"use client";
import Link from "next/link";
import {useApp} from "@/components/AppProvider";
import {CustomerProfile} from "@/components/CustomerProfile";
import {CustomerPreviewReservations} from "@/components/CustomerPreviewReservations";
import {CustomerBankReports} from "@/components/CustomerBankReports";
import {CommerceCustomer} from "@/components/CommerceCustomer";
import {CustomerPaymentControl} from "@/components/CustomerPaymentControl";
import {CustomerNotifications} from "@/components/CustomerNotifications";
import {MyReviews} from "@/components/MyReviews";

export default function MiCuentaPage(){
 const {state,hydrated}=useApp();
 const oldRecords=hydrated?state.opportunities.length:0;
 return <div className="container page-space">
  <div className="page-title"><span className="overline">MI CUENTA · OPORTUNIA</span>
   <h1>Tu cuenta y <span className="gradient-text">tus selecciones.</span></h1>
   <p>Consulta las selecciones guardadas con tu usuario, los avisos y las referencias que hayas reportado. La disponibilidad de números se controla desde Supabase.</p>
   <div className="row-actions"><Link href="/numeros" className="btn btn-primary">Seleccionar diez números</Link>
    <Link href="/pagos" className="btn btn-secondary">Reportar una transferencia</Link></div>
  </div>
  {oldRecords>0&&<div className="alert alert-warning" role="note">
   Hay {oldRecords} registro(s) de una simulación antigua guardados solo en este navegador. Se conservan sin borrar, pero <strong>no son reservas centrales, abonos bancarios ni oportunidades para un sorteo</strong>. Crea una nueva selección en el sistema central si deseas ensayar la disponibilidad.
  </div>}
  <CommerceCustomer accountOnly/>
  <CustomerPreviewReservations/>
  <CustomerPaymentControl/>
  <CustomerNotifications/>
  <CustomerProfile/>
  <section className="panel"><h2>Referencias registradas anteriormente</h2><p className="muted">Estos reportes son históricos e independientes de los pagos comerciales verificados manualmente.</p><CustomerBankReports mode="history"/></section>
  <MyReviews/>
 </div>;
}
