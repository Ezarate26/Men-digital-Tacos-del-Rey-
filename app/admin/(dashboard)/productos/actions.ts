"use server";

import { revalidatePath } from "next/cache";
import { assertOwner } from "@/lib/admin/access";
import { readMenuImage, removeMenuImage, uploadMenuImage } from "@/lib/admin/media";
import type { ActionState } from "@/lib/admin/types";
import {
  databaseMessage,
  isUuid,
  pesosToCents,
  readChecked,
  readSortOrder,
  readText,
} from "@/lib/admin/validation";
import { createClient } from "@/lib/supabase/server";

const denied: ActionState = {
  status: "error",
  message: "No tienes permiso para esta operación.",
};

function refresh() {
  revalidatePath("/admin/productos");
  revalidatePath("/admin");
  revalidatePath("/admin/estadisticas");
  revalidatePath("/menu");
}

export async function createProduct(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await assertOwner())) return denied;

  const parsed = readProduct(formData);
  if (!parsed.ok) return { status: "error", message: parsed.message };

  const image = await readMenuImage(formData, "image");
  if (!image.ok) return { status: "error", message: image.message };

  const supabase = await createClient();
  let imageUrl: string | null = null;

  if (image.image) {
    const uploaded = await uploadMenuImage(supabase, "products", image.image);
    if (!uploaded.ok) return { status: "error", message: uploaded.message };
    imageUrl = uploaded.url;
  }

  const { error } = await supabase.from("products").insert({
    ...parsed.value,
    image_url: imageUrl,
  });

  if (error) {
    await removeMenuImage(supabase, imageUrl);
    return { status: "error", message: databaseMessage(error) };
  }

  refresh();
  return { status: "success", message: "Producto creado." };
}

export async function updateProduct(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await assertOwner())) return denied;

  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { status: "error", message: "Producto no válido." };

  const parsed = readProduct(formData);
  if (!parsed.ok) return { status: "error", message: parsed.message };

  const image = await readMenuImage(formData, "image");
  if (!image.ok) return { status: "error", message: image.message };

  const supabase = await createClient();
  const current = await supabase.from("products").select("image_url").eq("id", id).maybeSingle();
  if (current.error || !current.data) {
    return { status: "error", message: "No encontramos el producto." };
  }

  let imageUrl = current.data.image_url as string | null;
  let uploadedUrl: string | null = null;

  if (image.image) {
    const uploaded = await uploadMenuImage(supabase, "products", image.image);
    if (!uploaded.ok) return { status: "error", message: uploaded.message };
    uploadedUrl = uploaded.url;
    imageUrl = uploaded.url;
  }

  const { error } = await supabase
    .from("products")
    .update({ ...parsed.value, image_url: imageUrl })
    .eq("id", id);

  if (error) {
    await removeMenuImage(supabase, uploadedUrl);
    return { status: "error", message: databaseMessage(error) };
  }

  if (uploadedUrl) await removeMenuImage(supabase, current.data.image_url);
  refresh();
  return { status: "success", message: "Producto actualizado." };
}

export async function deleteProduct(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await assertOwner())) return denied;

  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { status: "error", message: "Producto no válido." };

  const supabase = await createClient();
  const current = await supabase.from("products").select("image_url").eq("id", id).maybeSingle();
  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) return { status: "error", message: databaseMessage(error) };

  await removeMenuImage(supabase, current.data?.image_url ?? null);
  refresh();
  return { status: "success", message: "Producto eliminado." };
}

export async function moveProduct(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await assertOwner())) return denied;

  const id = String(formData.get("id") ?? "");
  const sectionId = String(formData.get("section_id") ?? "");
  const direction = formData.get("direction") === "up" ? -1 : 1;

  if (!isUuid(id) || !isUuid(sectionId)) {
    return { status: "error", message: "Producto no válido." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("section_id", sectionId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) return { status: "error", message: "No se pudo reordenar." };

  const reordered = moveRow(data, id, direction);
  if (!reordered) return { status: "success", message: "El producto ya está en ese extremo." };

  const updates = await Promise.all(
    reordered.map((row, index) =>
      supabase.from("products").update({ sort_order: index + 1 }).eq("id", row.id),
    ),
  );

  if (updates.some((result) => result.error)) {
    return { status: "error", message: "No se pudo reordenar." };
  }

  refresh();
  return { status: "success", message: "Orden actualizado." };
}

function readProduct(formData: FormData) {
  const name = readText(formData.get("name"), 120);
  const description = readText(formData.get("description"), 2000);
  const priceCents = pesosToCents(formData.get("price"));
  const sectionId = String(formData.get("section_id") ?? "");
  const sortOrder = readSortOrder(formData.get("sort_order"));

  if (!name) return { ok: false as const, message: "El producto necesita un nombre." };
  if (priceCents === null) {
    return { ok: false as const, message: "El precio debe ser cero o mayor, con hasta dos decimales." };
  }
  if (!isUuid(sectionId)) return { ok: false as const, message: "Elige una sección." };
  if (sortOrder === null) {
    return { ok: false as const, message: "El orden debe ser un número entero positivo." };
  }

  return {
    ok: true as const,
    value: {
      section_id: sectionId,
      name,
      description,
      price_cents: priceCents,
      is_available: readChecked(formData, "is_available"),
      is_active: readChecked(formData, "is_active"),
      is_featured: readChecked(formData, "is_featured"),
      sort_order: sortOrder,
    },
  };
}

function moveRow<T extends { id: string }>(rows: T[], id: string, direction: number) {
  const index = rows.findIndex((row) => row.id === id);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= rows.length) return null;

  const copy = [...rows];
  const [item] = copy.splice(index, 1);
  copy.splice(nextIndex, 0, item);
  return copy;
}
