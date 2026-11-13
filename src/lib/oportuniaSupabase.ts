import { createClient } from "@supabase/supabase-js";
/** Public key, never a service-role credential. All writes require RLS authorization. */
export const SUPABASE_URL = "https://qsclrpmkgcjobtupicyx.supabase.co";
export const SUPABASE_PUBLIC_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_Y1lArZVo1huxiWub9ZuVBg_ZV2Bv_tF";
export function oportuniaClient() {
  return createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
}
