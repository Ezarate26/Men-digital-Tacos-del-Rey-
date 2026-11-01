"use server";

import { revalidatePath } from "next/cache";
import { assertOwner } from "@/lib/admin/access";
import type { ActionState, AppRole } from "@/lib/admin/types";
import { databaseMessage, isUuid, readRole, readText } from "@/lib/admin/validation";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

const denied: ActionState = {
  status: "error",
  message: "No tienes permiso para esta operación.",
};

export async function changeRole(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await assertOwner())) return denied;

  const targetId = String(formData.get("id") ?? "");
  const role = readRole(formData.get("role"));

  if (!isUuid(targetId) || !role) {
    return { status: "error", message: "Usuario o rol no válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_profile_role", {
    target_id: targetId,
    next_role: role,
  });

  if (error) return { status: "error", message: databaseMessage(error) };

  revalidatePath("/admin/usuarios");
  return { status: "success", message: "Rol actualizado." };
}

export async function createUser(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await assertOwner())) return denied;

  const fullName = readText(formData.get("full_name"), 80);
  const email = readText(formData.get("email"), 160).toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = readRole(formData.get("role"));

  if (!fullName) return { status: "error", message: "El usuario necesita un nombre." };
  if (!email.includes("@")) return { status: "error", message: "El correo no es válido." };
  if (password.length < 8) {
    return { status: "error", message: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (!role) return { status: "error", message: "Elige un rol." };

  const signup = createPublicClient();
  const { data, error } = await signup.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error || !data.user) {
    const duplicate = error?.message.toLowerCase().includes("already");
    return {
      status: "error",
      message: duplicate
        ? "Ese correo ya está registrado."
        : "No se pudo crear el usuario.",
    };
  }

  if (role !== "waiter") {
    const supabase = await createClient();
    const roleChange = await supabase.rpc("set_profile_role", {
      target_id: data.user.id,
      next_role: role satisfies AppRole,
    });

    if (roleChange.error) {
      return { status: "error", message: databaseMessage(roleChange.error) };
    }
  }

  revalidatePath("/admin/usuarios");
  return {
    status: "success",
    message: data.user.confirmed_at
      ? "Usuario creado."
      : "Usuario creado. Si Supabase pide confirmación, deberá abrir el correo antes de entrar.",
  };
}
