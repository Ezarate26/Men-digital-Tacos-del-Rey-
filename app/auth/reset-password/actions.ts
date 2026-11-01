"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/admin/types";
import { passwordError } from "@/lib/auth/password";
import { createClient } from "@/lib/supabase/server";

export async function updatePassword(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  const invalid = passwordError(password, confirmation);
  if (invalid) return { status: "error", message: invalid };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return { status: "error", message: "El enlace venció. Solicita otro desde el acceso." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { status: "error", message: "No se pudo guardar la contraseña." };

  redirect("/admin");
}
