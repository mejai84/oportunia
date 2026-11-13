import type { Metadata } from "next";
import { FunnelLanding } from "@/components/FunnelLanding";

export const metadata: Metadata = {
  title: "Oportunia | Conoce cómo funcionan tus 50 números",
  description: "Explora la demostración de Oportunia: elige 10 números, simula cuotas y descubre cuándo se habilitaría una oportunidad. No se reciben pagos reales.",
  robots: { index: false, follow: false },
};

export default function EmbudoPage() {
  const leadCaptureEnabled = process.env.FUNNEL_LEADS_ENABLED === "true" &&
    Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
  return <FunnelLanding leadCaptureEnabled={leadCaptureEnabled} />;
}
