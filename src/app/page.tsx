import { FunnelLanding } from "@/components/FunnelLanding";

export default function Home() {
  const leadCaptureEnabled = process.env.FUNNEL_LEADS_ENABLED === "true" &&
    Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
  return <FunnelLanding leadCaptureEnabled={leadCaptureEnabled} />;
}
