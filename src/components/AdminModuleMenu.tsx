"use client";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {oportuniaClient} from "@/lib/oportuniaSupabase";
import {parseStaffRole,staffRoleNames,visibleStaffModules,type StaffRole} from "@/lib/staffPermissions";

export function AdminModuleMenu(){
 const client=useMemo(()=>oportuniaClient(),[]);
 const [role,setRole]=useState<StaffRole|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState(false);
 useEffect(()=>{
  let active=true;
  void Promise.resolve(client.rpc("staff_role_for_current_user")).then(({data,error:requestError})=>{
   if(!active)return;
   if(requestError){setError(true);setRole(null);}
   else {setError(false);setRole(parseStaffRole(data));}
  }).catch(()=>{if(active){setRole(null);setError(true);}})
    .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[client]);
 const modules=visibleStaffModules(role);
 return <section className="admin-module-menu" aria-labelledby="admin-module-menu-title">
   <header className="admin-module-menu-head"><div><span className="overline">MENÚ PRINCIPAL DE ADMINISTRACIÓN</span>
     <h2 id="admin-module-menu-title">¿Qué deseas administrar?</h2>
     <p>Solo se muestran las opciones autorizadas para tu cuenta. Los permisos reales se verifican también en Supabase.</p>
     {role&&<p className="admin-role-indicator">Rol activo: <strong>{staffRoleNames[role]}</strong></p>}
   </div><Link href="/acceso" className="btn btn-secondary btn-small">Mi cuenta</Link></header>
   {loading?<p className="muted">Consultando tus permisos…</p>:
    error?<div className="alert alert-error" role="alert">No se pudo leer tu rol. Actualiza la sesión e inténtalo de nuevo.</div>:
    modules.length===0?<p className="muted">No tienes módulos administrativos asignados.</p>:
    <nav className="admin-module-grid" aria-label="Módulos disponibles">
     {modules.map(module=><Link key={module.href} href={module.href} className="admin-module-link">
       <span className="admin-module-symbol" aria-hidden="true">{module.icon}</span>
       <span className="admin-module-copy"><small>{module.section}</small><strong>{module.title}</strong><span>{module.summary}</span></span>
       <span className="admin-module-arrow" aria-hidden="true">›</span>
     </Link>)}
    </nav>}
   <p className="admin-module-footnote">Ningún rol puede convertir las operaciones de demostración en ventas o participaciones reales. La publicación web depende del despliegue de Vercel.</p>
 </section>;
}
