import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Cliente con la clave de servicio. Solo se importa desde acciones de servidor.
 * Si la clave no está, devuelve null para que la pantalla explique la configuración.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;

  const { url } = getSupabaseEnv();

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export const SERVICE_ROLE_HELP =
  "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor. Agrégala solo en las variables de entorno del hosting, nunca como NEXT_PUBLIC ni en el navegador. En Supabase está en Project Settings → API.";

export const SMTP_HELP =
  "Supabase no pudo enviar el correo. En Authentication → Emails configura el SMTP del proyecto y, en URL Configuration, autoriza el dominio del sitio junto con /auth/callback.";

export async function revokeUserSessions(userId: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return;

  const { url } = getSupabaseEnv();
  await fetch(`${url}/auth/v1/admin/users/${userId}/logout`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ scope: "global" }),
  }).catch(() => undefined);
}
