import { isMissingSchema } from "@/lib/admin/validation";
import { coerceTheme, CURRENT_BUSINESS_SLUG, type MenuTheme } from "@/lib/menu/theme";
import { createClient } from "@/lib/supabase/server";

export type AppearanceRecord =
  | { status: "schema" }
  | { status: "empty" }
  | {
      status: "ready";
      draft: MenuTheme;
      published: MenuTheme;
      hasPrevious: boolean;
      publishImmediately: boolean;
    };

export async function loadAppearanceEditor(): Promise<AppearanceRecord> {
  const supabase = await createClient();
  const business = await supabase
    .from("businesses")
    .select("id")
    .eq("slug", CURRENT_BUSINESS_SLUG)
    .maybeSingle();

  if (isMissingSchema(business.error)) return { status: "schema" };
  if (business.error || !business.data) return { status: "empty" };

  const theme = await supabase
    .from("menu_themes")
    .select("draft, published, previous_published, publish_immediately")
    .eq("business_id", business.data.id)
    .maybeSingle();

  if (isMissingSchema(theme.error)) return { status: "schema" };
  if (theme.error || !theme.data) return { status: "empty" };

  return {
    status: "ready",
    draft: coerceTheme(theme.data.draft),
    published: coerceTheme(theme.data.published),
    hasPrevious: theme.data.previous_published != null,
    publishImmediately: theme.data.publish_immediately === true,
  };
}
