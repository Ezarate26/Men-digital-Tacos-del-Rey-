"use server";

import { redirect } from "next/navigation";
import { getOwnerContext } from "@/lib/admin/access";
import type { ActionState } from "@/lib/admin/types";
import { createClient } from "@/lib/supabase/server";

export async function login(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email.includes("@") || password.length < 8) {
    return {
      status: "error",
      message: "Revisa el correo y usa una contraseña de al menos 8 caracteres.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { status: "error", message: "Correo o contraseña incorrectos." };
  }

  const access = await getOwnerContext();

  if (access.kind !== "owner") {
    await supabase.auth.signOut();

    if (access.kind === "schema") {
      return {
        status: "error",
        message: "Falta aplicar las migraciones de Supabase antes de entrar.",
      };
    }

    return {
      status: "error",
      message: "Esta cuenta no tiene acceso de propietario.",
    };
  }

  redirect("/admin");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
