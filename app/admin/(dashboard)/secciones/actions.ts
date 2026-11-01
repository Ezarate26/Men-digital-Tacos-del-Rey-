"use server";

import { revalidatePath } from "next/cache";
import { assertOwner } from "@/lib/admin/access";
import { readMenuImage, removeMenuImage, uploadMenuImage } from "@/lib/admin/media";
import type { ActionState } from "@/lib/admin/types";
import {
  databaseMessage,
  isUuid,
  readChecked,
  readSortOrder,
  readText,
  slugify,
} from "@/lib/admin/validation";
import { createClient } from "@/lib/supabase/server";

const denied: ActionState = {
  status: "error",
  message: "No tienes permiso para esta operación.",
};

function refresh() {
  revalidatePath("/admin/secciones");
  revalidatePath("/admin/productos");
  revalidatePath("/admin");
  revalidatePath("/menu");
}

export async function createSection(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await assertOwner())) return denied;

  const parsed = readSection(formData);
  if (!parsed.ok) return { status: "error", message: parsed.message };

  const image = await readMenuImage(formData, "image");
  if (!image.ok) return { status: "error", message: image.message };

  const supabase = await createClient();
  const slug = await uniqueSlug(supabase, parsed.value.name);
  let imageUrl: string | null = null;

  if (image.image) {
    const uploaded = await uploadMenuImage(supabase, "sections", image.image);
    if (!uploaded.ok) return { status: "error", message: uploaded.message };
    imageUrl = uploaded.url;
  }

  const { error } = await supabase.from("menu_sections").insert({
    ...parsed.value,
    slug,
    image_url: imageUrl,
  });

  if (error) {
    await removeMenuImage(supabase, imageUrl);
    return { status: "error", message: databaseMessage(error) };
  }

  refresh();
  return { status: "success", message: "Sección creada." };
}

export async function updateSection(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await assertOwner())) return denied;

  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { status: "error", message: "Sección no válida." };

  const parsed = readSection(formData);
  if (!parsed.ok) return { status: "error", message: parsed.message };

  const image = await readMenuImage(formData, "image");
  if (!image.ok) return { status: "error", message: image.message };

  const supabase = await createClient();
  const current = await supabase.from("menu_sections").select("image_url").eq("id", id).maybeSingle();
  if (current.error || !current.data) {
    return { status: "error", message: "No encontramos la sección." };
  }

  let imageUrl = current.data.image_url as string | null;
  let uploadedUrl: string | null = null;

  if (image.image) {
    const uploaded = await uploadMenuImage(supabase, "sections", image.image);
    if (!uploaded.ok) return { status: "error", message: uploaded.message };
    uploadedUrl = uploaded.url;
    imageUrl = uploaded.url;
  }

  const { error } = await supabase
    .from("menu_sections")
    .update({ ...parsed.value, image_url: imageUrl })
    .eq("id", id);

  if (error) {
    await removeMenuImage(supabase, uploadedUrl);
    return { status: "error", message: databaseMessage(error) };
  }

  if (uploadedUrl) await removeMenuImage(supabase, current.data.image_url);
  refresh();
  return { status: "success", message: "Sección actualizada." };
}

export async function deleteSection(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await assertOwner())) return denied;

  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { status: "error", message: "Sección no válida." };

  const supabase = await createClient();
  const current = await supabase.from("menu_sections").select("image_url").eq("id", id).maybeSingle();
  const { error } = await supabase.from("menu_sections").delete().eq("id", id);

  if (error) return { status: "error", message: databaseMessage(error) };

  await removeMenuImage(supabase, current.data?.image_url ?? null);
  refresh();
  return { status: "success", message: "Sección eliminada." };
}

export async function moveSection(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await assertOwner())) return denied;

  const id = String(formData.get("id") ?? "");
  const direction = formData.get("direction") === "up" ? -1 : 1;
  if (!isUuid(id)) return { status: "error", message: "Sección no válida." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_sections")
    .select("id")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) return { status: "error", message: "No se pudo reordenar." };

  const index = data.findIndex((row) => row.id === id);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= data.length) {
    return { status: "success", message: "La sección ya está en ese extremo." };
  }

  const copy = [...data];
  const [item] = copy.splice(index, 1);
  copy.splice(nextIndex, 0, item);

  const updates = await Promise.all(
    copy.map((row, position) =>
      supabase.from("menu_sections").update({ sort_order: position + 1 }).eq("id", row.id),
    ),
  );

  if (updates.some((result) => result.error)) {
    return { status: "error", message: "No se pudo reordenar." };
  }

  refresh();
  return { status: "success", message: "Orden actualizado." };
}

function readSection(formData: FormData) {
  const name = readText(formData.get("name"), 80);
  const description = readText(formData.get("description"), 2000);
  const sortOrder = readSortOrder(formData.get("sort_order"));

  if (!name) return { ok: false as const, message: "La sección necesita un nombre." };
  if (sortOrder === null) {
    return { ok: false as const, message: "El orden debe ser un número entero positivo." };
  }

  return {
    ok: true as const,
    value: {
      name,
      description,
      sort_order: sortOrder,
      is_active: readChecked(formData, "is_active"),
    },
  };
}

async function uniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  name: string,
) {
  const base = slugify(name);
  const { data } = await supabase.from("menu_sections").select("slug").ilike("slug", `${base}%`);
  const taken = new Set((data ?? []).map((row) => row.slug as string));

  if (!taken.has(base)) return base;

  for (let index = 2; index < 50; index += 1) {
    const candidate = `${base}-${index}`;
    if (!taken.has(candidate)) return candidate;
  }

  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}
