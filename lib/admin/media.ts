import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type ImageKind = {
  contentType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
};

export async function readMenuImage(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);

  if (!(value instanceof File) || value.size === 0) {
    return { ok: true as const, image: null };
  }

  if (value.size > MAX_IMAGE_BYTES) {
    return {
      ok: false as const,
      message: "La imagen debe pesar menos de 5 MB.",
    };
  }

  const bytes = Buffer.from(await value.arrayBuffer());
  const kind = detectImage(bytes);

  if (!kind) {
    return {
      ok: false as const,
      message: "Usa una imagen JPG, PNG o WebP.",
    };
  }

  return {
    ok: true as const,
    image: { bytes, ...kind },
  };
}

export async function uploadMenuImage(
  supabase: SupabaseClient,
  folder: "products" | "sections" | "branding",
  image: { bytes: Buffer; contentType: string; extension: string },
) {
  const path = `${folder}/${crypto.randomUUID()}.${image.extension}`;
  const { error } = await supabase.storage.from("menu").upload(path, image.bytes, {
    contentType: image.contentType,
    upsert: false,
  });

  if (error) {
    return { ok: false as const, message: "No se pudo subir la imagen." };
  }

  const { data } = supabase.storage.from("menu").getPublicUrl(path);
  return { ok: true as const, url: data.publicUrl, path };
}

export async function removeMenuImage(supabase: SupabaseClient, publicUrl: string | null) {
  const path = storagePath(publicUrl);
  if (!path) return;

  await supabase.storage.from("menu").remove([path]);
}

function storagePath(publicUrl: string | null) {
  if (!publicUrl) return null;

  const marker = "/storage/v1/object/public/menu/";
  const index = publicUrl.indexOf(marker);
  if (index === -1) return null;

  const path = decodeURIComponent(publicUrl.slice(index + marker.length)).split("?")[0];

  if (!/^(products|sections|branding)\/[A-Za-z0-9-]+\.(jpg|png|webp)$/.test(path)) {
    return null;
  }

  return path;
}

function detectImage(bytes: Buffer): ImageKind | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }

  if (
    bytes.length > 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { contentType: "image/png", extension: "png" };
  }

  if (
    bytes.length > 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { contentType: "image/webp", extension: "webp" };
  }

  return null;
}
