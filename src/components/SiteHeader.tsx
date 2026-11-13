"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Inicio" }, { href: "/numeros", label: "Elegir números" },
  { href: "/pagos", label: "Reportar pago" }, { href: "/mi-cuenta", label: "Mi cuenta" },
  { href: "/acceso", label: "Acceso" }, { href: "/admin", label: "Administración" },
];

export function SiteHeader() {
  const pathname = usePathname();
  if (pathname === "/" || pathname === "/embudo") {
    return <header className="site-header f-site-header"><div className="container header-inner">
      <Link href="/" className="brand" aria-label="Oportunia, inicio"><span className="brand-icon">✦</span><span>oportunia<span className="brand-dot">.</span></span></Link>
      <nav className="f-header-nav" aria-label="Navegación del embudo">
        <a href="#sorteos">Sorteos</a><a href="#como-funciona">Cómo funciona</a><a href="#simulador">Simulador</a><a href="#preguntas">Preguntas</a>
      </nav>
      <Link className="f-header-cta" href="/acceso">Mi cuenta ↗</Link>
    </div></header>;
  }
  return <header className="site-header"><div className="container header-inner">
    <Link href="/" className="brand" aria-label="Oportunia, inicio"><span className="brand-icon">✦</span><span>oportunia<span className="brand-dot">.</span></span></Link>
    <nav className="nav-links" aria-label="Navegación principal">
      {links.map((link) => <Link key={link.href} href={link.href} className={"nav-link" + (pathname === link.href ? " active" : "")}>{link.label}</Link>)}
    </nav>
  </div></header>;
}
