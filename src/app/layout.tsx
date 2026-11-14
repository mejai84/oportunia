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
  title: "Oportunia | Sorteos que te acercan a lo que quieres",
  description: "Descubre los próximos sorteos de Oportunia, conoce las reglas y entérate del lanzamiento.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="es"><body><AppProvider>
    <SiteHeader /><main>{children}</main>
    <footer className="footer"><div className="container footer-inner">
      <span>♣ Oportunia · Sorteos que te acercan a lo que quieres</span>
      <span>Sorteos sujetos a reglamento, disponibilidad y autorizaciones. Consulta el estado de cada edición.</span>
    </div></footer>
  </AppProvider></body></html>;
}
