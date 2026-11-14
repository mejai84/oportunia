import Link from "next/link";
import {AdminAccessGate} from "@/components/AdminAccessGate";
import {AdminModuleMenu} from "@/components/AdminModuleMenu";
import {AdminOwnerOnly} from "@/components/AdminOwnerOnly";

function AdminCentralHome(){
 return <div className="container page-space">
  <div className="page-title">
   <span className="overline">CENTRO DE OPERACIONES · OPORTUNIA</span>
   <h1>Administración <span className="gradient-text">centralizada.</span></h1>
   <p>Gestiona el catálogo, las selecciones, los reportes y la seguridad desde los módulos conectados a Supabase. No se contabilizan simulaciones almacenadas en el navegador como ventas ni pagos.</p>
  </div>
  <AdminModuleMenu/>
  <AdminOwnerOnly>
   <section className="panel" aria-label="Estado general del proyecto">
    <span className="overline">ESTADO DEL SISTEMA</span>
    <h2>Operación en modo de ensayo</h2>
    <p>No hay verificación bancaria automática ni autorización comercial confirmada en la aplicación. La asignación de números, las reservas y sus hitos están diseñados para ensayos centralizados; ninguna operación de este panel acredita pagos o habilita participantes reales.</p>
    <div className="row-actions">
     <Link href="/admin/informes" className="btn btn-primary">Indicadores reales y auditoría</Link>
     <Link href="/admin/reservas" className="btn btn-secondary">Inventario central de números</Link>
     <Link href="/admin/seguridad" className="btn btn-secondary">Estado de producción</Link>
    </div>
   </section>
  </AdminOwnerOnly>
 </div>;
}
export default function AdminPage(){
 return <AdminAccessGate requiredPermission="admin.menu"><AdminCentralHome/></AdminAccessGate>;
}
