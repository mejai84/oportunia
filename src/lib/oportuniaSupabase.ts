import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Public key only. Admin privileges are enforced by Supabase RLS. */
export const SUPABASE_URL = "https://qsclrpmkgcjobtupicyx.supabase.co";
export const SUPABASE_PUBLIC_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_Y1lArZVo1huxiWub9ZuVBg_ZV2Bv_tF";

let browserClient: SupabaseClient | null = null;

/** All client components must share a single auth session and subscription manager. */
export function oportuniaClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return browserClient;
}
