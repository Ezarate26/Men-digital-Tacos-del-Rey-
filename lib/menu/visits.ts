import { headers } from "next/headers";
import { createPublicClient } from "@/lib/supabase/public";

export async function recordMenuVisit(tableCode: string | null) {
  try {
    const headerStore = await headers();
    const purpose = [
      headerStore.get("purpose"),
      headerStore.get("sec-purpose"),
      headerStore.get("next-router-prefetch"),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (purpose.includes("prefetch")) return;

    const supabase = createPublicClient();
    await supabase.rpc("record_menu_visit", { p_table_code: tableCode });
  } catch {
    // La carta sigue disponible aunque la visita no quede registrada.
  }
}
