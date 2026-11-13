import type { Metadata } from "next";
import { FunnelLanding } from "@/components/FunnelLanding";

export const metadata: Metadata = {
  title: "Oportunia | Conoce cómo funcionan tus 50 números",
  description: "Conoce Oportunia: descubre cómo se asignan 50 números por oportunidad, consulta las cuotas previstas y explora próximos premios y reglas.",
  robots: { index: false, follow: false },
};

export default function EmbudoPage() {
  const leadCaptureEnabled = process.env.FUNNEL_LEADS_ENABLED === "true" &&
    Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
  return <FunnelLanding leadCaptureEnabled={leadCaptureEnabled} />;
}
