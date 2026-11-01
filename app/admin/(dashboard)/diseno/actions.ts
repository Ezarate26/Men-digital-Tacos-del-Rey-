"use server";

import { revalidatePath } from "next/cache";
import { getAccessContext } from "@/lib/admin/access";
import { readMenuImage, removeMenuImage, uploadMenuImage } from "@/lib/admin/media";
import type { ActionState } from "@/lib/admin/types";
import { databaseMessage, isMissingSchema, readChecked, readText } from "@/lib/admin/validation";
import {
  CURRENT_BUSINESS_SLUG,
  IMAGE_SLOTS,
  parseThemeFields,
  themeImageUrls,
  coerceTheme,
  type MenuTheme,
} from "@/lib/menu/theme";
import { createClient } from "@/lib/supabase/server";

const denied: ActionState = {
  status: "error",
  message: "No tienes permiso para esta operación.",
};

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export async function saveAppearance(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const intent = formData.get("intent");
  if (intent !== "draft" && intent !== "publish" && intent !== "restore") {
    return { status: "error", message: "No reconocimos la operación." };
  }

  const immediate = readChecked(formData, "publish_immediately");
  const publish = intent === "publish" || intent === "restore" || immediate;
  const access = await getAccessContext();
  const permitted =
    access.kind === "owner" ||
    (access.kind === "collaborator" &&
      access.permissions.includes(publish ? "branding.publish" : "branding.update"));

  if (!permitted) return denied;

  const supabase = await createClient();
  const business = await supabase
    .from("businesses")
    .select("id")
    .eq("slug", CURRENT_BUSINESS_SLUG)
    .maybeSingle();

  if (business.error || !business.data) {
    return { status: "error", message: databaseMessage(business.error ?? { code: "PGRST205" }) };
  }

  const current = await supabase
    .from("menu_themes")
    .select("draft, published, previous_published")
    .eq("business_id", business.data.id)
    .maybeSingle();

  if (current.error || !current.data) {
    return { status: "error", message: databaseMessage(current.error ?? { code: "PGRST205" }) };
  }

  const storedDraft = coerceTheme(current.data.draft);
  const storedPublished = coerceTheme(current.data.published);
  const storedPrevious = current.data.previous_published
    ? coerceTheme(current.data.previous_published)
    : null;

  if (intent === "restore") {
    if (!storedPrevious) {
      return { status: "error", message: "No hay una configuración anterior." };
    }

    const restored = await supabase.rpc("save_menu_theme", {
      p_draft: storedPrevious,
      p_published: storedPrevious,
      p_previous: storedPublished,
      p_publish_immediately: true,
      p_publish: true,
    });
    let error = restored.error;

    if (isMissingSchema(restored.error) && access.kind === "owner") {
      const fallback = await supabase
        .from("menu_themes")
        .update({
          draft: storedPrevious,
          published: storedPrevious,
          previous_published: storedPublished,
        })
        .eq("business_id", business.data.id);
      error = fallback.error;
    }

    if (error) return { status: "error", message: databaseMessage(error) };

    await forgetUnusedImages(
      supabase,
      [storedDraft, storedPublished, storedPrevious],
      [storedPrevious, storedPublished],
    );
    await syncPublicProfile(supabase, storedPrevious);
    revalidatePath("/admin/diseno");
    revalidatePath("/menu");
    return {
      status: "success",
      message: "Se restauró la configuración anterior en el menú público.",
    };
  }

  const images = await resolveImages(
    supabase,
    formData,
    storedDraft,
    storedPublished,
    storedPrevious,
  );

  if (!images.ok) return { status: "error", message: images.message };

  const parsed = parseThemeFields({
    content: {
      businessName: readText(formData.get("businessName"), 80),
      slogan: readText(formData.get("slogan"), 80),
      welcomeMessage: readText(formData.get("welcomeMessage"), 240),
      headerText: readText(formData.get("headerText"), 60),
      contact: readText(formData.get("contact"), 120),
      hours: readText(formData.get("hours"), 180),
      address: readText(formData.get("address"), 180),
      attentionButton: readText(formData.get("attentionButton"), 60),
    },
    colors: {
      background: readText(formData.get("background"), 7),
      primary: readText(formData.get("primary"), 7),
      secondary: readText(formData.get("secondary"), 7),
      button: readText(formData.get("button"), 7),
      text: readText(formData.get("text"), 7),
    },
    typography: {
      font: readText(formData.get("font"), 20),
      titleSize: readText(formData.get("titleSize"), 8),
    },
    shape: {
      radius: readText(formData.get("radius"), 8),
      border: readText(formData.get("border"), 8),
      shadow: readText(formData.get("shadow"), 8),
      cardStyle: readText(formData.get("cardStyle"), 16),
      spacing: readText(formData.get("spacing"), 16),
    },
    images: images.images,
  });

  if (!parsed.ok) {
    await forgetUrls(supabase, images.uploaded);
    return { status: "error", message: parsed.message };
  }

  const saved = await supabase.rpc("save_menu_theme", {
    p_draft: parsed.theme,
    p_published: publish ? parsed.theme : storedPublished,
    p_previous: publish ? storedPublished : storedPrevious,
    p_publish_immediately: immediate,
    p_publish: publish,
  });
  let error = saved.error;

  if (isMissingSchema(saved.error)) {
    const fallback = await supabase
      .from("menu_themes")
      .update(
        publish
          ? {
              draft: parsed.theme,
              published: parsed.theme,
              previous_published: storedPublished,
              publish_immediately: immediate,
            }
          : {
              draft: parsed.theme,
              publish_immediately: immediate,
            },
      )
      .eq("business_id", business.data.id);
    error = fallback.error;
  }

  if (error) {
    await forgetUrls(supabase, images.uploaded);
    return { status: "error", message: databaseMessage(error) };
  }

  if (publish) {
    await forgetUnusedImages(
      supabase,
      [storedDraft, storedPublished, storedPrevious],
      [parsed.theme, storedPublished],
    );
    await syncPublicProfile(supabase, parsed.theme);
    revalidatePath("/menu");
  } else {
    await forgetUnusedImages(
      supabase,
      [storedDraft, storedPublished, storedPrevious],
      [parsed.theme, storedPublished, storedPrevious],
    );
  }

  revalidatePath("/admin/diseno");

  return {
    status: "success",
    message: publish
      ? "Los cambios ya están publicados en el menú QR."
      : "Borrador guardado. El menú público conserva la versión publicada.",
  };
}

async function resolveImages(
  supabase: ServerClient,
  formData: FormData,
  storedDraft: MenuTheme,
  storedPublished: MenuTheme,
  storedPrevious: MenuTheme | null,
) {
  const allowed = new Set([
    ...themeImageUrls(storedDraft),
    ...themeImageUrls(storedPublished),
    ...(storedPrevious ? themeImageUrls(storedPrevious) : []),
  ]);
  const images: MenuTheme["images"] = { ...storedDraft.images };
  const uploaded: string[] = [];

  for (const field of IMAGE_SLOTS) {
    const file = await readMenuImage(formData, field.slot);

    if (!file.ok) {
      await forgetUrls(supabase, uploaded);
      return { ok: false as const, message: file.message };
    }

    if (file.image) {
      const saved = await uploadMenuImage(supabase, "branding", file.image);
      if (!saved.ok) {
        await forgetUrls(supabase, uploaded);
        return { ok: false as const, message: saved.message };
      }
      uploaded.push(saved.url);
      images[field.key] = saved.url;
      continue;
    }

    if (readChecked(formData, `remove_${field.slot}`)) {
      images[field.key] = null;
      continue;
    }

    const submitted = readText(formData.get(`${field.slot}Url`), 500);
    images[field.key] =
      submitted && allowed.has(submitted) ? submitted : storedDraft.images[field.key];
  }

  return { ok: true as const, images, uploaded };
}

async function syncPublicProfile(supabase: ServerClient, theme: MenuTheme) {
  await supabase
    .from("restaurant_settings")
    .update({
      display_name: theme.content.businessName,
      tagline: theme.content.headerText || "Taquería",
      logo_url: theme.images.logoUrl,
    })
    .eq("id", 1);
}

async function forgetUnusedImages(
  supabase: ServerClient,
  before: Array<MenuTheme | null>,
  after: Array<MenuTheme | null>,
) {
  const keep = new Set(after.flatMap((theme) => (theme ? themeImageUrls(theme) : [])));
  const drop = before
    .flatMap((theme) => (theme ? themeImageUrls(theme) : []))
    .filter((url) => !keep.has(url));

  await forgetUrls(supabase, drop);
}

async function forgetUrls(supabase: ServerClient, urls: string[]) {
  await Promise.all([...new Set(urls)].map((url) => removeMenuImage(supabase, url)));
}
