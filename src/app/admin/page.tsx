import Link from "next/link";
import {AdminAccessGate} from "@/components/AdminAccessGate";
import {AdminModuleMenu} from "@/components/AdminModuleMenu";
import {AdminOwnerOnly} from "@/components/AdminOwnerOnly";

function AdminCentralHome(){
 return <div className="container page-space">
  <div className="page-title">
   <span className="overline">CENTRO DE OPERACIONES · OPORTUNIA</span>
   <h1>Administración <span className="gradient-text">centralizada.</span></h1>
   <p>Gestiona las ediciones autorizadas, reservas comerciales, comprobantes y módulos de auditoría desde Supabase. Las simulaciones históricas siguen separadas.</p>
  </div>
  <AdminModuleMenu/>
  <AdminOwnerOnly>
   <section className="panel" aria-label="Estado general del proyecto">
    <span className="overline">ESTADO DEL SISTEMA</span>
    <h2>Operación en modo de ensayo</h2>
    <p>Las ventas comerciales pueden activarse por edición desde el módulo de autorización. Los comprobantes únicamente protegen números hasta su revisión; solo tesorería registra ingresos bancarios confirmados manualmente.</p>
    <div className="row-actions">
     <Link href="/admin/ventas" className="btn btn-primary">Autorizar y activar ventas</Link>
     <Link href="/admin/revision-pagos" className="btn btn-secondary">Revisar comprobantes</Link>
     <Link href="/admin/informes" className="btn btn-secondary">Informes y auditoría</Link>
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
