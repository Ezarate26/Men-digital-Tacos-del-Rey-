"use server";

import { revalidatePath } from "next/cache";
import { assertOwner } from "@/lib/admin/access";
import type { ActionState } from "@/lib/admin/types";
import { databaseMessage, isUuid } from "@/lib/admin/validation";
import { createClient } from "@/lib/supabase/server";

const denied: ActionState = {
  status: "error",
  message: "No tienes permiso para esta operación.",
};

export async function updateAttention(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await assertOwner())) return denied;

  const id = String(formData.get("id") ?? "");
  const waiterId = String(formData.get("waiter_id") ?? "");
  const intent = String(formData.get("intent") ?? "");

  if (!isUuid(id)) return { status: "error", message: "Solicitud no válida." };

  let changes: { status?: string; assigned_waiter_id?: string | null } = {};

  if (intent === "resolve") {
    changes = { status: "resolved" };
  } else if (intent === "assign") {
    if (!isUuid(waiterId)) return { status: "error", message: "Elige un mesero." };
    changes = { status: "assigned", assigned_waiter_id: waiterId };
  } else {
    return { status: "error", message: "Acción no válida." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("attention_requests").update(changes).eq("id", id);

  if (error) return { status: "error", message: databaseMessage(error) };

  revalidatePath("/admin/solicitudes");
  revalidatePath("/admin/meseros");
  revalidatePath("/admin");
  revalidatePath("/admin/estadisticas");
  return { status: "success", message: "Solicitud actualizada." };
}
