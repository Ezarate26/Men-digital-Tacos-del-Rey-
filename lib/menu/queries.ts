import { createPublicClient } from "@/lib/supabase/public";
import { readTableCode } from "@/lib/menu/table-code";
import { coerceTheme, CURRENT_BUSINESS_SLUG, themeFromLegacyBrand } from "@/lib/menu/theme";
import type { MenuTheme } from "@/lib/menu/theme";
import type { MenuProduct, MenuSection, PublicMenu } from "@/lib/menu/types";

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  is_available: boolean;
  is_active: boolean;
  is_featured?: boolean;
  sort_order: number;
};

type SectionRow = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  products: ProductRow[] | null;
};

export type MenuQueryResult =
  | { ok: true; menu: PublicMenu }
  | { ok: false; reason: "unpublished" | "unavailable" };

export async function getPublicMenu(
  mesa: string | string[] | undefined,
): Promise<MenuQueryResult> {
  const supabase = createPublicClient();
  const tableInput = readTableCode(mesa);

  const sectionsQuery = supabase
    .from("menu_sections")
    .select(sectionSelect(true))
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const settingsQuery = supabase
    .from("restaurant_settings")
    .select("menu_available, display_name, tagline, logo_url")
    .eq("id", 1)
    .maybeSingle();

  const themeQuery = supabase.rpc("published_menu_theme", {
    business_slug: CURRENT_BUSINESS_SLUG,
  });

  const tableQuery =
    tableInput.kind === "code"
      ? supabase
          .from("dining_tables")
          .select("code, label")
          .eq("code", tableInput.code)
          .eq("is_active", true)
          .maybeSingle()
      : null;

  const [sectionsResult, settingsResult, tableResult, themeResult] = await Promise.all([
    sectionsQuery,
    settingsQuery,
    tableQuery,
    themeQuery,
  ]);

  const failure = sectionsResult.error ?? settingsResult.error ?? tableResult?.error;

  if (failure?.code === "PGRST204") {
    return getPublicMenuWithoutNewColumns(supabase, tableInput);
  }

  if (failure) {
    return {
      ok: false,
      reason: failure.code === "PGRST205" ? "unpublished" : "unavailable",
    };
  }

  const sections = ((sectionsResult.data ?? []) as unknown as SectionRow[])
    .slice()
    .sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name, "es"))
    .map(mapSection);

  let table: PublicMenu["table"];

  if (tableInput.kind === "absent") {
    table = { status: "none" };
  } else if (tableInput.kind === "invalid" || !tableResult?.data) {
    table = { status: "invalid" };
  } else {
    table = {
      status: "active",
      code: tableResult.data.code,
      label: tableResult.data.label,
    };
  }

  return {
    ok: true,
    menu: {
      menuAvailable: settingsResult.data?.menu_available === true,
      sections,
      table,
      theme: resolveTheme(themeResult.error ? null : themeResult.data, settingsResult.data),
    },
  };
}

function sectionSelect(includeFeatured: boolean) {
  const featured = includeFeatured ? "is_featured," : "";

  return `
    id,
    name,
    description,
    sort_order,
    products (
      id,
      name,
      description,
      price_cents,
      image_url,
      is_available,
      is_active,
      ${featured}
      sort_order
    )
  `;
}

async function getPublicMenuWithoutNewColumns(
  supabase: ReturnType<typeof createPublicClient>,
  tableInput: ReturnType<typeof readTableCode>,
): Promise<MenuQueryResult> {
  const sectionsResult = await supabase
    .from("menu_sections")
    .select(sectionSelect(false))
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const settingsResult = await supabase
    .from("restaurant_settings")
    .select("menu_available")
    .eq("id", 1)
    .maybeSingle();

  const tableResult =
    tableInput.kind === "code"
      ? await supabase
          .from("dining_tables")
          .select("code, label")
          .eq("code", tableInput.code)
          .eq("is_active", true)
          .maybeSingle()
      : null;

  const themeResult = await supabase.rpc("published_menu_theme", {
    business_slug: CURRENT_BUSINESS_SLUG,
  });

  const failure = sectionsResult.error ?? settingsResult.error ?? tableResult?.error;

  if (failure) {
    return {
      ok: false,
      reason: failure.code === "PGRST205" ? "unpublished" : "unavailable",
    };
  }

  let table: PublicMenu["table"];

  if (tableInput.kind === "absent") {
    table = { status: "none" };
  } else if (tableInput.kind === "invalid" || !tableResult?.data) {
    table = { status: "invalid" };
  } else {
    table = {
      status: "active",
      code: tableResult.data.code,
      label: tableResult.data.label,
    };
  }

  return {
    ok: true,
    menu: {
      menuAvailable: settingsResult.data?.menu_available === true,
      sections: ((sectionsResult.data ?? []) as unknown as SectionRow[]).map(mapSection),
      table,
      theme: resolveTheme(themeResult.error ? null : themeResult.data, null),
    },
  };
}

function resolveTheme(
  payload: unknown,
  settings: {
    display_name?: string | null;
    tagline?: string | null;
    logo_url?: string | null;
  } | null,
): MenuTheme {
  if (payload) return coerceTheme(payload);

  return themeFromLegacyBrand({
    name: settings?.display_name,
    eyebrow: settings?.tagline,
    logoUrl: settings?.logo_url,
  });
}

function mapSection(row: SectionRow): MenuSection {
  const products = (row.products ?? [])
    .filter((product) => product.is_active)
    .sort(
      (left, right) =>
        left.sort_order - right.sort_order ||
        left.name.localeCompare(right.name, "es"),
    )
    .map(mapProduct);

  return {
    id: row.id,
    name: row.name,
    description: row.description?.trim() ?? "",
    products,
  };
}

function mapProduct(row: ProductRow): MenuProduct {
  const imageUrl = row.image_url?.trim() || null;

  return {
    id: row.id,
    name: row.name,
    description: row.description?.trim() ?? "",
    priceCents: row.price_cents,
    imageUrl,
    isAvailable: row.is_available,
    isFeatured: row.is_featured === true,
  };
}
