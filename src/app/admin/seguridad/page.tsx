"use client";
import Link from "next/link";
import {useCallback,useEffect,useMemo,useState} from "react";
import {AdminAccessGate} from "@/components/AdminAccessGate";
import {oportuniaClient} from "@/lib/oportuniaSupabase";

type Readiness={
 mode:"non_commercial_preview";
 owner_count:number;
 owner_auto_email_grant_enabled:boolean;
 bank_provider_connection_available:boolean;
 bank_files_uploaded:number;
 bank_file_matches:number;
 bank_provider_verified_movements:number;
 customer_reports:number;
 customer_reports_verified:number;
 preview_reservations:number;
 official_sales_enabled:boolean;
 official_draw_entries_enabled:boolean;
 legal_authorization_verified_in_app:boolean;
 password_leak_protection:"requires_console_review";
 vercel_deployment:"requires_external_status_check";
 viewer_role:string;
};
type Check={title:string;details:string;verified:boolean|null;kind:"security"|"bank"|"operations"};
function ReadinessWorkspace(){
 const client=useMemo(()=>oportuniaClient(),[]);
 const [data,setData]=useState<Readiness|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const refresh=useCallback(async()=>{
  const {data:result,error:requestError}=await client.rpc("get_operational_readiness");
  if(requestError)throw new Error("No se pudo obtener el diagnóstico. Comprueba el permiso de auditoría y la migración de Supabase.");
  if(!result||typeof result!=="object"||
   typeof result.owner_count!=="number"||
   typeof result.bank_provider_verified_movements!=="number"||
   typeof result.official_sales_enabled!=="boolean")throw new Error("La respuesta de seguridad está incompleta.");
  setData(result as Readiness);
 },[client]);
 useEffect(()=>{let active=true;setLoading(true);
  void refresh().catch(e=>{if(active)setError(e instanceof Error?e.message:"No se pudo leer el estado");})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[refresh]);
 const checks:Check[]=data?[
  {title:"Acceso propietario protegido",verified:data.owner_count===1&&!data.owner_auto_email_grant_enabled,
   details:"La cuenta propietaria se conserva y ya no se concede propiedad automáticamente por dirección de correo.",kind:"security"},
  {title:"Procedencia de extractos",verified:!data.bank_provider_connection_available?false:null,
   details:"Los movimientos provienen de archivos suministrados manualmente, sin certificación de origen mediante una integración bancaria.",kind:"bank"},
  {title:"Verificación oficial de transferencias",verified:data.bank_provider_connection_available&&data.bank_provider_verified_movements>0,
   details:"Las coincidencias con archivos cargados no son comprobantes bancarios autenticados. No habilitan oportunidades ni pagos reales.",kind:"bank"},
  {title:"Protección contra contraseñas filtradas",verified:null,
   details:"Debe comprobarse y habilitarse directamente en los controles de autenticación de Supabase.",kind:"security"},
  {title:"Autorizaciones y reglamento",verified:data.legal_authorization_verified_in_app,
   details:"No existe validación documental de la autorización del sorteo en la plataforma.",kind:"operations"},
  {title:"Ventas y participaciones oficiales",verified:data.official_sales_enabled&&data.official_draw_entries_enabled,
   details:"Permanecen inhabilitadas. Las reservas y los 50 números son pruebas no comerciales.",kind:"operations"},
  {title:"Publicación en Vercel",verified:null,
   details:"Este módulo no puede determinar el estado externo del despliegue. Revisa Vercel y prueba el acceso real.",kind:"operations"},
 ]:[];
 const ready=checks.filter(c=>c.verified===true).length;
 return <div className="container page-space readiness-page">
  <div className="readiness-head"><div><span className="overline">CONTROL INTERNO · SEGURIDAD</span>
   <h1>Estado de <span className="gradient-text">producción.</span></h1>
   <p>Diagnóstico de los controles actuales desde Supabase. No permite cambiar permisos bancarios, habilitar ventas o declarar un sorteo autorizado.</p>
  </div><Link className="btn btn-secondary" href="/admin">Volver al menú</Link></div>
  <div className="readiness-alert"><strong>Operación no comercial:</strong> las referencias reportadas no son dinero recibido. Un archivo de extracto, incluso cuando coincide con una referencia, no acredita por sí solo una transferencia.</div>
  {error&&<div role="alert" className="alert alert-error">{error}</div>}
  {loading?<section className="readiness-panel">Leyendo controles de Supabase…</section>:data?<>
   <div className="readiness-stats">
    <article><span>Controles comprobados</span><strong>{ready} / {checks.length}</strong><small>Los demás requieren atención o verificación externa</small></article>
    <article><span>Reportes declarados</span><strong>{data.customer_reports}</strong><small>Verificados oficialmente: {data.customer_reports_verified}</small></article>
    <article><span>Movimientos importados</span><strong>{data.bank_files_uploaded}</strong><small>Cotejados con archivo: {data.bank_file_matches}</small></article>
    <article><span>Movimientos certificados por banco</span><strong>{data.bank_provider_verified_movements}</strong><small>Integración bancaria no conectada</small></article>
   </div>
   <section className="readiness-panel"><div className="readiness-section-top"><h2>Lista de condiciones previas</h2><button className="btn btn-secondary btn-small" type="button"
    onClick={()=>void refresh().catch(e=>setError(e instanceof Error?e.message:"Error de consulta"))}>Actualizar diagnóstico</button></div>
    <div className="readiness-checks">{checks.map(check=><article key={check.title}>
     <span className={"readiness-indicator "+(check.verified===true?"readiness-ok":check.verified===null?"readiness-pending":"readiness-warning")} aria-hidden="true">{check.verified===true?"✓":check.verified===null?"?":"!"}</span>
     <div><strong>{check.title}</strong><small>{check.kind==="security"?"Seguridad":check.kind==="bank"?"Bancos y conciliación":"Operaciones"}</small><p>{check.details}</p></div>
     <span className="readiness-state">{check.verified===true?"Comprobado":check.verified===null?"Por verificar":"No habilitado"}</span>
    </article>)}</div>
   </section>
   <section className="readiness-panel">
    <h2>Pasos externos pendientes</h2>
    <p>Para operar de manera real se requieren una fuente bancaria autorizada y autenticada, control de reservas transaccionales, documentación y autorizaciones aplicables, pruebas de seguridad con múltiples cuentas y un despliegue confirmado.</p>
    <div className="readiness-links">
     <Link href="/admin/informes" className="btn btn-secondary btn-small">Revisar informes</Link>
     <Link href="/admin/auditoria" className="btn btn-secondary btn-small">Revisar auditoría</Link>
     <Link href="/admin/conciliacion" className="btn btn-secondary btn-small">Revisar conciliación</Link>
    </div>
    <p className="muted">La protección contra contraseñas comprometidas se administra en el panel oficial de autenticación de Supabase; no se activa desde Oportunia.</p>
   </section>
  </>:<section className="readiness-panel">No se pudo consultar el estado de seguridad.</section>}
 </div>;
}
export default function ReadinessPage(){return <AdminAccessGate requiredPermission="audit.read"><ReadinessWorkspace/></AdminAccessGate>;}
