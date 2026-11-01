"use server";

import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/admin/access";
import type { ActionState } from "@/lib/admin/types";
import {
  databaseMessage,
  isUuid,
  readChecked,
  readTableCodeInput,
  readText,
} from "@/lib/admin/validation";
import { createClient } from "@/lib/supabase/server";

const denied: ActionState = {
  status: "error",
  message: "No tienes permiso para esta operación.",
};

function refresh() {
  revalidatePath("/admin/mesas");
  revalidatePath("/admin");
  revalidatePath("/menu");
}

export async function createTable(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await assertPermission("tables.create"))) return denied;
  const parsed = readTable(formData);
  if (!parsed.ok) return { status: "error", message: parsed.message };

  const supabase = await createClient();
  const { error } = await supabase.from("dining_tables").insert(parsed.value);
  if (error) return { status: "error", message: databaseMessage(error) };

  refresh();
  return { status: "success", message: "Mesa creada." };
}

export async function updateTable(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await assertPermission("tables.update"))) return denied;

  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { status: "error", message: "Mesa no válida." };

  const parsed = readTable(formData);
  if (!parsed.ok) return { status: "error", message: parsed.message };

  const supabase = await createClient();
  const { error } = await supabase.from("dining_tables").update(parsed.value).eq("id", id);
  if (error) return { status: "error", message: databaseMessage(error) };

  refresh();
  return { status: "success", message: "Mesa actualizada." };
}

function readTable(formData: FormData) {
  const code = readTableCodeInput(formData.get("code"));
  const label = readText(formData.get("label"), 40);

  if (!code) {
    return {
      ok: false as const,
      message: "El código de mesa usa letras, números o guiones, hasta 12 caracteres.",
    };
  }
  if (!label) return { ok: false as const, message: "La mesa necesita un nombre." };

  return {
    ok: true as const,
    value: {
      code,
      label,
      is_active: readChecked(formData, "is_active"),
    },
  };
}
