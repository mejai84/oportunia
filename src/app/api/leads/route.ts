import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseLead } from "@/lib/funnel";

export const runtime = "nodejs";

/**
 * Captura de interesados: apagada por defecto. Requiere revisión legal,
 * política de privacidad, anti-bot y rate limiting antes de activarse.
 * Nunca enviar la secret key al navegador.
 */
export async function POST(request: Request) {
  if (process.env.FUNNEL_LEADS_ENABLED !== "true") {
    return NextResponse.json({ ok: false, error: "El registro aún no está habilitado." }, { status: 503 });
  }
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    return NextResponse.json({ ok: false, error: "El registro no está configurado." }, { status: 503 });
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ ok: false, error: "Formato no admitido." }, { status: 415 });
  }
  let input: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 8192) {
      return NextResponse.json({ ok: false, error: "Solicitud demasiado grande." }, { status: 413 });
    }
    input = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "Solicitud inválida." }, { status: 400 });
  }
  if (input && typeof input === "object" && !Array.isArray(input) &&
    typeof (input as Record<string, unknown>).website === "string" &&
    String((input as Record<string, unknown>).website).trim()) {
    return NextResponse.json({ ok: true }, { status: 202 });
  }
  const result = parseLead(input);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 422 });
  }
  try {
    const supabase = createClient(url, secret, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { error } = await supabase.from("funnel_leads").insert(result.lead);
    if (error) {
      console.error("funnel_leads insert failed", error.code);
      return NextResponse.json({ ok: false, error: "No se pudo guardar la solicitud." }, { status: 500 });
    }
    return NextResponse.json({ ok: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "Servicio temporalmente no disponible." }, { status: 503 });
  }
}
