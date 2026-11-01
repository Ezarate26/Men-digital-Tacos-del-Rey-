"use server";

import type { ActionState } from "@/lib/admin/types";
import { readText } from "@/lib/admin/validation";
import { emailError, normalizeEmail } from "@/lib/auth/password";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export async function requestPasswordReset(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = normalizeEmail(readText(formData.get("email"), 160));
  const invalid = emailError(email);
  if (invalid) return { status: "error", message: invalid };

  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  const origin = host ? `${proto}://${host}` : "";
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
  });

  if (error) {
    return {
      status: "error",
      message:
        "No se pudo enviar el correo. Revisa el SMTP en Supabase → Authentication → Emails y autoriza /auth/callback en URL Configuration.",
    };
  }

  return {
    status: "success",
    message: "Si el correo está registrado, recibirás un enlace para elegir una contraseña nueva.",
  };
}
