"use server";

import { revalidatePath } from "next/cache";
import { getAccessContext } from "@/lib/admin/access";
import type { ActionState } from "@/lib/admin/types";
import { databaseMessage, normalizeSiteUrl, readChecked } from "@/lib/admin/validation";
import { createClient } from "@/lib/supabase/server";

const denied: ActionState = {
  status: "error",
  message: "No tienes permiso para esta operación.",
};

export async function updateSettings(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const access = await getAccessContext();
  const owner = access.kind === "owner";
  const canPublish =
    owner || (access.kind === "collaborator" && access.permissions.includes("menu.publish"));

  if (!canPublish) return denied;

  const siteUrl = normalizeSiteUrl(formData.get("public_site_url"));
  if (siteUrl === null) {
    return {
      status: "error",
      message: "El dominio debe ser una dirección https, o http solo en localhost.",
    };
  }

  const supabase = await createClient();
  const menuAvailable = readChecked(formData, "menu_available");

  if (!owner) {
    const published = await supabase.rpc("set_menu_available", { p_available: menuAvailable });
    if (published.error) return { status: "error", message: databaseMessage(published.error) };
    revalidatePath("/admin/configuracion");
    revalidatePath("/menu");
    return { status: "success", message: "Disponibilidad actualizada." };
  }

  const { error } = await supabase
    .from("restaurant_settings")
    .update({
      menu_available: menuAvailable,
      public_site_url: siteUrl || null,
    })
    .eq("id", 1);

  if (error) return { status: "error", message: databaseMessage(error) };

  revalidatePath("/admin/configuracion");
  revalidatePath("/admin/mesas");
  revalidatePath("/menu");
  return { status: "success", message: "Configuración guardada." };
}
