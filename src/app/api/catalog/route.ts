import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "@/lib/oportuniaSupabase";
export const dynamic = "force-dynamic";
/** Public catalog only: RLS enforces enabled rows; no service role key. */
export async function GET() {
  try {
    const client = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, { auth: { persistSession: false } });
    const { data, error } = await client.from("draw_catalog")
      .select("id,title,prize,description,status,display_order,hero_image_url,prize_image_url")
      .eq("enabled", true).order("display_order", { ascending: true });
    if (error) return NextResponse.json({ error: "Catálogo temporalmente no disponible." }, { status: 503 });
    return NextResponse.json({ draws: data || [] }, { headers: { "Cache-Control": "public, max-age=0, s-maxage=60" } });
  } catch {
    return NextResponse.json({ error: "No fue posible consultar los sorteos." }, { status: 503 });
  }
}
