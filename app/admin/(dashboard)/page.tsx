import { PageIntro, SchemaNotice } from "@/components/admin/admin-shell";
import { loadDashboardCounts } from "@/lib/admin/counts";

export default async function ResumenPage() {
  const result = await loadDashboardCounts();

  if (!result.ok && result.reason === "schema") {
    return (
      <>
        <PageIntro
          title="Resumen"
          description="Cifras reales del menú, las mesas y las solicitudes de atención."
        />
        <SchemaNotice />
      </>
    );
  }

  if (!result.ok) {
    return (
      <PageIntro
        title="Resumen"
        description="No pudimos consultar las cifras. Inténtalo de nuevo."
      />
    );
  }

  const { counts } = result;
  const cards = [
    ["Visitas al menú", counts.visitsTotal],
    ["Visitas de hoy", counts.visitsToday],
    ["Últimos siete días", counts.visitsWeek],
    ["Visitas del mes", counts.visitsMonth],
    ["Solicitudes de atención", counts.attentionTotal],
    ["Mesas activas", counts.activeTables],
    ["Productos activos", counts.activeProducts],
    ["Secciones activas", counts.activeSections],
  ];

  return (
    <>
      <PageIntro
        title="Resumen"
        description="Estas cifras salen de Supabase. Un cero significa que todavía no hay registros."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <article key={String(label)} className="rounded-2xl border border-gold/30 bg-surface p-4">
            <p className="text-xs tracking-[0.14em] text-gold-light uppercase">{label}</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums">{value}</p>
          </article>
        ))}
      </div>
    </>
  );
}
