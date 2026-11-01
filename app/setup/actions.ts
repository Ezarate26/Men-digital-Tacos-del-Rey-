"use server";

import { redirect } from "next/navigation";
import { installationStatus } from "@/lib/admin/access";
import type { ActionState } from "@/lib/admin/types";
import { databaseMessage, readText } from "@/lib/admin/validation";
import { emailError, normalizeEmail, passwordError } from "@/lib/auth/password";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export async function registerOwner(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const installed = await installationStatus();

  if (installed === "missing") {
    return {
      status: "error",
      message: "Falta aplicar las migraciones de acceso en Supabase antes del registro.",
    };
  }

  if (installed) {
    redirect("/admin/login");
  }

  const fullName = readText(formData.get("full_name"), 80);
  const email = normalizeEmail(readText(formData.get("email"), 160));
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (!fullName) return { status: "error", message: "El nombre es obligatorio." };

  const invalidEmail = emailError(email);
  if (invalidEmail) return { status: "error", message: invalidEmail };

  const invalidPassword = passwordError(password, confirmation);
  if (invalidPassword) return { status: "error", message: invalidPassword };

  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  const origin = host ? `${proto}://${host}` : "";
  const signup = createPublicClient();
  const { data, error } = await signup.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${origin}/auth/callback?next=/setup/complete`,
    },
  });

  if (error || !data.user) {
    const duplicate = error?.message.toLowerCase().includes("already");
    return {
      status: "error",
      message: duplicate
        ? "Ese correo ya está registrado. Inicia sesión para completar la instalación si todavía no hay propietario."
        : "No se pudo crear la cuenta. Revisa el correo o inténtalo de nuevo.",
    };
  }

  if (!data.session) {
    return {
      status: "success",
      message:
        "Revisa tu correo y confirma la cuenta. Al iniciar sesión, si nadie más reclamó la propiedad, esta cuenta quedará como propietaria.",
    };
  }

  const supabase = await createClient();
  const session = await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });

  if (session.error) {
    return { status: "error", message: "La cuenta se creó, pero no pudimos abrir la sesión." };
  }

  const claim = await supabase.rpc("claim_owner");

  if (claim.error) {
    await supabase.auth.signOut();
    return { status: "error", message: databaseMessage(claim.error) };
  }

  redirect("/admin");
}
