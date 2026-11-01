"use server";

import { revalidatePath } from "next/cache";
import { assertOwner } from "@/lib/admin/access";
import type { ActionState } from "@/lib/admin/types";
import {
  databaseMessage,
  isUuid,
  normalizeWhatsapp,
  readChecked,
  readText,
} from "@/lib/admin/validation";
import { createClient } from "@/lib/supabase/server";

const denied: ActionState = {
  status: "error",
  message: "No tienes permiso para esta operación.",
};

function refresh() {
  revalidatePath("/admin/meseros");
  revalidatePath("/admin/solicitudes");
}

export async function createWaiter(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await assertOwner())) return denied;
  const parsed = readWaiter(formData);
  if (!parsed.ok) return { status: "error", message: parsed.message };

  const supabase = await createClient();
  const { error } = await supabase.from("waiters").insert(parsed.value);
  if (error) return { status: "error", message: databaseMessage(error) };

  refresh();
  return { status: "success", message: "Mesero registrado." };
}

export async function updateWaiter(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await assertOwner())) return denied;

  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { status: "error", message: "Mesero no válido." };

  const parsed = readWaiter(formData);
  if (!parsed.ok) return { status: "error", message: parsed.message };

  const supabase = await createClient();
  const { error } = await supabase.from("waiters").update(parsed.value).eq("id", id);
  if (error) return { status: "error", message: databaseMessage(error) };

  refresh();
  return { status: "success", message: "Mesero actualizado." };
}

function readWaiter(formData: FormData) {
  const fullName = readText(formData.get("full_name"), 80);
  const whatsapp = normalizeWhatsapp(formData.get("whatsapp"));

  if (!fullName) return { ok: false as const, message: "El mesero necesita un nombre." };
  if (!whatsapp) {
    return { ok: false as const, message: "El WhatsApp debe tener entre 10 y 15 dígitos." };
  }

  return {
    ok: true as const,
    value: {
      full_name: fullName,
      whatsapp,
      is_active: readChecked(formData, "is_active"),
      is_available: readChecked(formData, "is_available"),
    },
  };
}
