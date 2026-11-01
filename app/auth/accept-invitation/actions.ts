"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/admin/types";
import { databaseMessage, readText } from "@/lib/admin/validation";
import { passwordError } from "@/lib/auth/password";
import { createClient } from "@/lib/supabase/server";

export async function acceptInvitation(
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
    return { status: "error", message: "Abre el enlace del correo para continuar." };
  }

  const { error: passwordUpdateError } = await supabase.auth.updateUser({ password });
  if (passwordUpdateError) {
    return { status: "error", message: "No se pudo guardar la contraseña." };
  }

  const accepted = await supabase.rpc("accept_invitation", {
    p_name: readText(formData.get("full_name"), 80),
  });

  if (accepted.error) return { status: "error", message: databaseMessage(accepted.error) };

  redirect("/admin");
}
