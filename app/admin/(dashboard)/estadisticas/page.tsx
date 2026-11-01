import { AccessDenied, PageIntro, SchemaNotice } from "@/components/admin/admin-shell";
import { allowedPage } from "@/lib/admin/access";
import { loadDashboardCounts } from "@/lib/admin/counts";

export default async function EstadisticasPage() {
  if ((await allowedPage("analytics.view")) === "no") return <AccessDenied title="Estadísticas" />;

  const result = await loadDashboardCounts();

  if (!result.ok && result.reason === "schema") {
    return (
      <>
        <PageIntro title="Estadísticas" description="Visitas y solicitudes registradas." />
        <SchemaNotice />
      </>
    );
  }

  if (!result.ok) {
    return <PageIntro title="Estadísticas" description="No pudimos consultar las cifras." />;
  }

  const { counts } = result;
  const peak = Math.max(...counts.visitsByDay.map((day) => day.total), 0);

  return (
    <>
      <PageIntro
        title="Estadísticas"
        description="Las visitas se cuentan cuando alguien abre el menú público. Los días sin visitas aparecen en cero."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Hoy" value={counts.visitsToday} />
        <Metric label="Siete días" value={counts.visitsWeek} />
        <Metric label="Mes" value={counts.visitsMonth} />
        <Metric label="Total" value={counts.visitsTotal} />
      </div>
      <section className="mt-6 rounded-2xl border border-gold/30 bg-surface p-4">
        <h2 className="text-lg font-semibold">Visitas por día</h2>
        <ul className="mt-4 space-y-3">
          {counts.visitsByDay.map((day) => (
            <li key={day.day} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-3 text-sm">
              <span className="text-foreground/70">{formatDay(day.day)}</span>
              <span className="h-2 rounded-full bg-black">
                <span
                  className="block h-2 rounded-full bg-gold"
                  style={{ width: peak === 0 ? "0%" : `${(day.total / peak) * 100}%` }}
                />
              </span>
              <span className="text-right tabular-nums">{day.total}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Pendientes" value={counts.attentionPending} />
        <Metric label="Asignadas" value={counts.attentionAssigned} />
        <Metric label="Atendidas" value={counts.attentionResolved} />
      </section>
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-2xl border border-gold/30 bg-surface p-4">
      <p className="text-xs tracking-[0.14em] text-gold-light uppercase">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
    </article>
  );
}

function formatDay(day: string) {
  if (!day) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "America/Mexico_City",
  }).format(new Date(`${day}T12:00:00-06:00`));
}
