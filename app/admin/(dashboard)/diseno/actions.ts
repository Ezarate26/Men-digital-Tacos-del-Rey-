"use server";

import { revalidatePath } from "next/cache";
import { assertOwner } from "@/lib/admin/access";
import { readMenuImage, removeMenuImage, uploadMenuImage } from "@/lib/admin/media";
import type { ActionState } from "@/lib/admin/types";
import { databaseMessage, readText } from "@/lib/admin/validation";
import { createClient } from "@/lib/supabase/server";

const denied: ActionState = {
  status: "error",
  message: "No tienes permiso para esta operación.",
};

export async function updateBranding(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await assertOwner())) return denied;

  const displayName = readText(formData.get("display_name"), 80);
  const tagline = readText(formData.get("tagline"), 40);

  if (!displayName) return { status: "error", message: "El nombre del lugar es obligatorio." };
  if (!tagline) return { status: "error", message: "La leyenda es obligatoria." };

  const image = await readMenuImage(formData, "logo");
  if (!image.ok) return { status: "error", message: image.message };

  const supabase = await createClient();
  const current = await supabase
    .from("restaurant_settings")
    .select("logo_url")
    .eq("id", 1)
    .maybeSingle();

  if (current.error || !current.data) {
    return { status: "error", message: "No encontramos la configuración." };
  }

  let logoUrl = current.data.logo_url as string | null;
  let uploadedUrl: string | null = null;

  if (image.image) {
    const uploaded = await uploadMenuImage(supabase, "branding", image.image);
    if (!uploaded.ok) return { status: "error", message: uploaded.message };
    uploadedUrl = uploaded.url;
    logoUrl = uploaded.url;
  }

  const { error } = await supabase
    .from("restaurant_settings")
    .update({ display_name: displayName, tagline, logo_url: logoUrl })
    .eq("id", 1);

  if (error) {
    await removeMenuImage(supabase, uploadedUrl);
    return { status: "error", message: databaseMessage(error) };
  }

  if (uploadedUrl) await removeMenuImage(supabase, current.data.logo_url);
  revalidatePath("/admin/diseno");
  revalidatePath("/menu");
  return { status: "success", message: "Identidad actualizada." };
}
