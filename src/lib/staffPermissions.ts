/** UI-only visibility. Supabase RLS and RPCs remain the security boundary. */
export type StaffRole = "owner" | "treasury" | "support" | "draws" | "auditor";
export type StaffPermission =
  | "admin.menu" | "admin.dashboard" | "staff.manage" | "audit.read"
  | "bank.read" | "bank.write" | "crm.read" | "crm.write"
  | "followups.read" | "followups.write" | "catalog.read" | "catalog.write"
  | "reviews.read" | "reviews.write" | "preview.read" | "preview.write";

export const staffRoleNames: Record<StaffRole,string> = {
  owner:"Propietario", treasury:"Tesorería", support:"Atención y soporte",
  draws:"Gestión de sorteos", auditor:"Auditor (solo lectura)",
};
export const staffRoleCapabilities: Record<StaffRole,readonly StaffPermission[]> = {
  owner:["admin.menu","admin.dashboard","staff.manage","audit.read","bank.read","bank.write",
    "crm.read","crm.write","followups.read","followups.write","catalog.read","catalog.write",
    "reviews.read","reviews.write","preview.read","preview.write"],
  treasury:["admin.menu","bank.read","bank.write"],
  support:["admin.menu","crm.read","crm.write","followups.read","followups.write"],
  draws:["admin.menu","catalog.read","catalog.write","reviews.read","reviews.write","preview.read","preview.write"],
  auditor:["admin.menu","audit.read","bank.read","crm.read","followups.read",
    "catalog.read","reviews.read","preview.read"],
};
export function canStaffRole(role:StaffRole|null,permission:StaffPermission):boolean {
  return role!==null&&staffRoleCapabilities[role]?.includes(permission)===true;
}
export function parseStaffRole(value:unknown):StaffRole|null {
  return typeof value==="string"&&Object.prototype.hasOwnProperty.call(staffRoleNames,value)
    ?value as StaffRole:null;
}

export type StaffModule={
  href:string; title:string; section:string; summary:string;
  icon:string; permission:StaffPermission;
};
export const staffModules:readonly StaffModule[]=[
  {href:"/admin/equipo",title:"Equipo y permisos",section:"Seguridad",icon:"♙",permission:"staff.manage",
   summary:"Asignar roles por cuenta y revisar quién autorizó cada cambio."},
  {href:"/admin/informes",title:"Informes y exportaciones",section:"Control",icon:"▤",permission:"audit.read",
   summary:"Indicadores de Supabase, gráficas y exportaciones CSV auditadas."},
  {href:"/admin/auditoria",title:"Auditoría de operaciones",section:"Control",icon:"☷",permission:"audit.read",
   summary:"Cambios de roles, catálogo, resultados, conciliación y seguimiento."},
  {href:"/admin/clientes",title:"Clientes · CRM",section:"Atención",icon:"♧",permission:"crm.write",
   summary:"Cuentas, referencias reportadas y notas internas."},
  {href:"/admin/conciliacion",title:"Conciliación bancaria",section:"Tesorería",icon:"≋",permission:"bank.write",
   summary:"Abonos de extractos, coincidencias y auditoría financiera."},
  {href:"/admin/reservas",title:"Reservas centralizadas",section:"Ensayo",icon:"▦",permission:"preview.write",
   summary:"Ensayos, diez números iniciales y hitos adicionales ficticios."},
  {href:"/admin/numeros",title:"Control de números",section:"Laboratorio",icon:"◫",permission:"preview.read",
   summary:"Mapa de números y revisión de la simulación local."},
  {href:"/admin/seguimiento",title:"Agenda de seguimiento",section:"Operaciones",icon:"◷",permission:"followups.write",
   summary:"Tareas por cliente, vencimientos y responsables."},
  {href:"/admin/catalogo",title:"Catálogo e imágenes",section:"Sorteos",icon:"✎",permission:"catalog.write",
   summary:"Contenido e imágenes de las ediciones."},
  {href:"/admin/opiniones",title:"Opiniones y resultados",section:"Sorteos",icon:"★",permission:"reviews.write",
   summary:"Moderación y registro informativo de resultados."},
  {href:"/admin",title:"Dashboard y demo local",section:"Propietario",icon:"▥",permission:"admin.dashboard",
   summary:"Indicadores generales y herramientas de prueba del navegador."},
];
export function visibleStaffModules(role:StaffRole|null):readonly StaffModule[] {
  return staffModules.filter(module=>canStaffRole(role,module.permission));
}
