import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppProvider } from "@/components/AppProvider";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";
import "./funnel.css";
import "./apple-light.css";
import "./responsive.css";
import "./admin-media.css";
import "./admin-dashboard.css";
import "./admin-module-menu.css";
import "./staff-audit.css";
import "./production-readiness.css";
import "./payment-control.css";
import "./admin-reports.css";
import "./bank-reconciliation.css";
import "./customer-bank-reports.css";
import "./crm-numbers.css";
import "./notifications-followups.css";
import "./central-reservations.css";
import "./preview-progress.css";
import "./brand.css";
import "./oportunia-green.css";
import "./home-premium.css";

export const metadata: Metadata = {
  title: "Oportunia | Oportunidades de ganar premios",
  description: "Descubre las oportunidades de Oportunia, conoce los premios y consulta las condiciones de cada edición.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="es"><body><AppProvider>
    <SiteHeader /><main>{children}</main>
    <footer className="footer"><div className="container footer-inner">
      <span>♣ Oportunia · Oportunidades de ganar premios</span>
      <span>Las oportunidades están sujetas a reglamento y autorizaciones aplicables. Consulta las condiciones de cada edición.</span>
    </div></footer>
  </AppProvider></body></html>;
}
