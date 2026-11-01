import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

/**
 * Cliente anónimo para lecturas públicas del menú.
 * No usa cookies ni la clave de servicio.
 */
export function createPublicClient() {
  const { url, key } = getSupabaseEnv();

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
