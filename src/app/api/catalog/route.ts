import { NextResponse } from "next/server";
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "@/lib/oportuniaSupabase";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const response = await fetch(
      SUPABASE_URL + "/rest/v1/draw_catalog?select=id,title,prize,description,status,display_order,hero_image_url,prize_image_url&enabled=eq.true&order=display_order.asc,created_at.asc",
      { headers: { apikey: SUPABASE_PUBLIC_KEY, Authorization: "Bearer " + SUPABASE_PUBLIC_KEY }, cache: "no-store" },
    );
    if (!response.ok) return NextResponse.json({ error: "Catálogo temporalmente no disponible." }, { status: 503 });
    return NextResponse.json({ draws: await response.json() }, { headers: { "Cache-Control": "public, max-age=0, s-maxage=60" } });
  } catch {
    return NextResponse.json({ error: "No fue posible consultar los sorteos." }, { status: 503 });
  }
}
