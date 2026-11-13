import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Preparado para la integración posterior. La demo NO usa Supabase.
 * Nunca incluir la secret/service_role key en NEXT_PUBLIC_*.
 * Las mutaciones de pagos/números deben implementarse en un backend seguro.
 */
export function getPublicSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}
