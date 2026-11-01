"use server";

import { revalidatePath } from "next/cache";
import { assertOwner } from "@/lib/admin/access";
import type { ActionState } from "@/lib/admin/types";
import { databaseMessage, isUuid, readText } from "@/lib/admin/validation";
import { emailError, normalizeEmail } from "@/lib/auth/password";
import { isPermission } from "@/lib/auth/permissions";
import { resolvePublicOrigin } from "@/lib/admin/origin";
import { createAdminClient, revokeUserSessions, SERVICE_ROLE_HELP, SMTP_HELP } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const denied: ActionState = {
  status: "error",
  message: "Solo el propietario puede administrar colaboradores.",
};

function selectedPermissions(formData: FormData) {
  return formData.getAll("permissions").flatMap((value) =>
    typeof value === "string" && isPermission(value) ? [value] : [],
  );
}

export async function inviteCollaborator(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await assertOwner())) return denied;

  const email = normalizeEmail(readText(formData.get("email"), 160));
  const fullName = readText(formData.get("full_name"), 80);
  const invalid = emailError(email);
  if (invalid) return { status: "error", message: invalid };

  const permissions = selectedPermissions(formData);
  if (permissions.length === 0) {
    return { status: "error", message: "Elige al menos un permiso." };
  }

  const admin = createAdminClient();
  if (!admin) return { status: "error", message: SERVICE_ROLE_HELP };

  const supabase = await createClient();
  const created = await supabase.rpc("create_invitation", {
    p_email: email,
    p_name: fullName,
    p_permissions: permissions,
  });

  if (created.error || !created.data) {
    return { status: "error", message: databaseMessage(created.error ?? {}) };
  }

  const settings = await supabase
    .from("restaurant_settings")
    .select("public_site_url")
    .eq("id", 1)
    .maybeSingle();
  const origin = await resolvePublicOrigin(settings.data?.public_site_url);
  const invite = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: `${origin}/auth/callback?next=/auth/accept-invitation`,
  });

  if (invite.error) {
    await supabase.rpc("revoke_invitation", { p_id: created.data });
    const message = invite.error.message.toLowerCase();
    return {
      status: "error",
      message: message.includes("smtp") || message.includes("email") || message.includes("send")
        ? SMTP_HELP
        : "No se pudo enviar la invitación.",
    };
  }

  revalidatePath("/admin/usuarios");
  return { status: "success", message: "Invitación enviada." };
}

export async function saveCollaboratorPermissions(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await assertOwner())) return denied;

  const userId = String(formData.get("user_id") ?? "");
  if (!isUuid(userId)) return { status: "error", message: "Colaborador no válido." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_collaborator_permissions", {
    p_user_id: userId,
    p_permissions: selectedPermissions(formData),
  });

  if (error) return { status: "error", message: databaseMessage(error) };

  revalidatePath("/admin/usuarios");
  return { status: "success", message: "Permisos actualizados." };
}

export async function revokeCollaborator(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await assertOwner())) return denied;

  const userId = String(formData.get("user_id") ?? "");
  if (!isUuid(userId)) return { status: "error", message: "Colaborador no válido." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_collaborator", { p_user_id: userId });
  if (error) return { status: "error", message: databaseMessage(error) };

  await revokeUserSessions(userId);

  revalidatePath("/admin/usuarios");
  return { status: "success", message: "Acceso revocado." };
}

export async function cancelInvitation(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await assertOwner())) return denied;

  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { status: "error", message: "Invitación no válida." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_invitation", { p_id: id });
  if (error) return { status: "error", message: databaseMessage(error) };

  revalidatePath("/admin/usuarios");
  return { status: "success", message: "Invitación cancelada." };
}
