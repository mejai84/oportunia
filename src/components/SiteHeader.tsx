"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Inicio" }, { href: "/#sorteos", label: "Sorteos" },
  { href: "/#como-funciona", label: "Cómo funciona" },
  { href: "/acceso", label: "Mi cuenta" },
  { href: "/notificaciones", label: "Avisos" },
];

export function SiteHeader() {
  const pathname = usePathname();
  if (pathname === "/" || pathname === "/embudo") {
    return <header className="site-header f-site-header"><div className="container header-inner">
      <Link href="/" className="brand" aria-label="Oportunia, inicio"><Image src="/brand/trebol-oportunia.svg" width={38} height={38} alt="" className="brand-clover" /><span>oportunia<span className="brand-dot">.</span></span></Link>
      <nav className="f-header-nav" aria-label="Navegación del embudo">
        <a href="#sorteos">Sorteos</a><a href="#como-funciona">Cómo funciona</a><a href="#opiniones">Opiniones</a><a href="#resultados">Resultados</a><a href="#preguntas">Preguntas</a>
      </nav>
      <Link className="f-header-cta" href="/acceso">Mi cuenta ↗</Link>
      <details className="mobile-nav-menu"><summary aria-label="Abrir menú de navegación">Menú <span aria-hidden="true">☰</span></summary>
        <nav aria-label="Navegación móvil">
          <a href="#sorteos">Sorteos</a><a href="#como-funciona">Cómo funciona</a>
          <a href="#opiniones">Opiniones</a><a href="#resultados">Resultados</a><a href="#preguntas">Preguntas</a>
          <Link href="/acceso">Mi cuenta</Link>
        </nav>
      </details>
    </div></header>;
  }
  return <header className="site-header"><div className="container header-inner">
    <Link href="/" className="brand" aria-label="Oportunia, inicio"><Image src="/brand/trebol-oportunia.svg" width={38} height={38} alt="" className="brand-clover" /><span>oportunia<span className="brand-dot">.</span></span></Link>
    <nav className="nav-links" aria-label="Navegación principal">
      {links.map((link) => <Link key={link.href} href={link.href} className={"nav-link" + (pathname === link.href ? " active" : "")}>{link.label}</Link>)}
    </nav>
    <details className="mobile-nav-menu"><summary aria-label="Abrir menú de navegación">Menú <span aria-hidden="true">☰</span></summary>
      <nav aria-label="Navegación móvil">
        {links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
      </nav>
    </details>
  </div></header>;
}
