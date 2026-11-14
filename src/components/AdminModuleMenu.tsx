import Link from "next/link";

const modules = [
  {
    href: "/admin/clientes", symbol: "♙", title: "Clientes · CRM",
    summary: "Cuentas registradas, historial de referencias, contacto y notas internas.",
    section: "Clientes",
  },
  {
    href: "/admin/conciliacion", symbol: "≋", title: "Conciliación bancaria",
    summary: "Movimientos importados, coincidencias, reportes y auditoría de referencias.",
    section: "Tesorería",
  },
  {
    href: "/admin/reservas", symbol: "▦", title: "Reservas centralizadas",
    summary: "Inventario y selecciones de ensayo en Supabase con vencimientos.",
    section: "Laboratorio (sin ventas)",
  },
  {
    href: "/admin/numeros", symbol: "◫", title: "Control de números",
    summary: "Mapa de 10.000 números, filtros y detección de errores en la demo local.",
    section: "Simulación del navegador",
  },
  {
    href: "/admin/seguimiento", symbol: "◷", title: "Agenda de seguimiento",
    summary: "Tareas por cliente, fechas, responsables y trazabilidad de cambios.",
    section: "Operaciones",
  },
  {
    href: "/admin/catalogo", symbol: "✎", title: "Catálogo e imágenes",
    summary: "Contenido de los sorteos e imágenes almacenadas en Supabase.",
    section: "Contenido",
  },
  {
    href: "/admin/opiniones", symbol: "★", title: "Opiniones y resultados",
    summary: "Moderación de opiniones y control informativo de resultados.",
    section: "Moderación",
  },
  {
    href: "/admin", symbol: "▥", title: "Dashboard y demo local",
    summary: "Indicadores, pestañas de prueba y herramientas generales del administrador.",
    section: "Panel principal",
  },
] as const;

export function AdminModuleMenu() {
  return <section className="admin-module-menu" aria-labelledby="admin-module-menu-title">
    <header className="admin-module-menu-head">
      <div>
        <span className="overline">MENÚ PRINCIPAL DE ADMINISTRACIÓN</span>
        <h2 id="admin-module-menu-title">¿Qué deseas administrar?</h2>
        <p>Selecciona un módulo para abrirlo. Cada opción tiene su propia pantalla y conserva los permisos de acceso.</p>
      </div>
      <Link href="/acceso" className="btn btn-secondary btn-small">Mi cuenta</Link>
    </header>
    <nav className="admin-module-grid" aria-label="Módulos disponibles">
      {modules.map(module => <Link key={module.href} href={module.href} className="admin-module-link">
        <span className="admin-module-symbol" aria-hidden="true">{module.symbol}</span>
        <span className="admin-module-copy">
          <small>{module.section}</small>
          <strong>{module.title}</strong>
          <span>{module.summary}</span>
        </span>
        <span className="admin-module-arrow" aria-hidden="true">›</span>
      </Link>)}
    </nav>
    <p className="admin-module-footnote">Las reservas y pagos de demostración no son operaciones bancarias confirmadas ni participaciones oficiales. Los enlaces solo estarán disponibles en el sitio cuando Vercel publique la versión correspondiente.</p>
  </section>;
}
