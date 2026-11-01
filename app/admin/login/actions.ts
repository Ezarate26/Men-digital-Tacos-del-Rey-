"use server";

import { redirect } from "next/navigation";
import { getAccessContext, installationStatus } from "@/lib/admin/access";
import type { ActionState } from "@/lib/admin/types";
import { databaseMessage } from "@/lib/admin/validation";
import { createClient } from "@/lib/supabase/server";

export async function login(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email.includes("@") || password.length === 0) {
    return { status: "error", message: "Escribe el correo y la contraseña." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { status: "error", message: "Correo o contraseña incorrectos." };
  }

  let access = await getAccessContext();
  const installed = await installationStatus();

  if (installed === false && access.kind === "forbidden") {
    const claim = await supabase.rpc("claim_owner");
    if (claim.error) {
      await supabase.auth.signOut();
      return { status: "error", message: databaseMessage(claim.error) };
    }
    access = await getAccessContext();
  }

  if (access.kind === "revoked" || (access.kind === "collaborator" && access.permissions.length === 0)) {
    await supabase.auth.signOut();
    return {
      status: "error",
      message:
        access.kind === "revoked"
          ? "Esta cuenta ya no tiene acceso."
          : "Esta cuenta todavía no tiene permisos asignados.",
    };
  }

  if (access.kind !== "owner" && access.kind !== "collaborator") {
    await supabase.auth.signOut();
    return {
      status: "error",
      message:
        access.kind === "schema"
          ? "Falta aplicar las migraciones de Supabase antes de entrar."
          : "Esta cuenta no tiene acceso al panel.",
    };
  }

  redirect("/admin");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
