import { createClient } from "@/lib/supabase/server";
import type { DashboardCounts } from "@/lib/admin/types";
import { isMissingSchema } from "@/lib/admin/validation";

export async function loadDashboardCounts(): Promise<
  | { ok: true; counts: DashboardCounts }
  | { ok: false; reason: "schema" | "error" }
> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("owner_dashboard_counts");

  if (isMissingSchema(error)) return { ok: false, reason: "schema" };
  if (error || !data || typeof data !== "object") return { ok: false, reason: "error" };

  const source = data as Record<string, unknown>;

  return {
    ok: true,
    counts: {
      visitsTotal: numberValue(source.visits_total),
      visitsToday: numberValue(source.visits_today),
      visitsWeek: numberValue(source.visits_week),
      visitsMonth: numberValue(source.visits_month),
      visitsByDay: Array.isArray(source.visits_by_day)
        ? source.visits_by_day.map((item) => {
            const row = item as Record<string, unknown>;
            return {
              day: typeof row.day === "string" ? row.day : "",
              total: numberValue(row.total),
            };
          })
        : [],
      attentionPending: numberValue(source.attention_pending),
      attentionAssigned: numberValue(source.attention_assigned),
      attentionResolved: numberValue(source.attention_resolved),
      attentionTotal: numberValue(source.attention_total),
      activeTables: numberValue(source.active_tables),
      activeProducts: numberValue(source.active_products),
      activeSections: numberValue(source.active_sections),
    },
  };
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
