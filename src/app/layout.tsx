import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppProvider } from "@/components/AppProvider";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";
import "./funnel.css";
import "./apple-light.css";
import "./responsive.css";

export const metadata: Metadata = {
  title: "Oportunia | Demo de oportunidades",
  description: "Prototipo de selección de números, abonos y administración. Sin pagos reales.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="es"><body><AppProvider>
    <div className="demo-strip">MODO DEMOSTRACIÓN · No se reciben pagos ni se realizan sorteos reales</div>
    <SiteHeader /><main>{children}</main>
    <footer className="footer"><div className="container footer-inner">
      <span>✦ Oportunia · Prototipo independiente</span>
      <span>Sin pagos reales · Sujeto a autorizaciones y reglamento aplicable</span>
    </div></footer>
  </AppProvider></body></html>;
}
