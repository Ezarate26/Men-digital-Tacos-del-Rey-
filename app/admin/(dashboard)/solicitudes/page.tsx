import { BoundForm, SelectField, SubmitButton } from "@/components/admin/forms";
import { AccessDenied, PageIntro, SchemaNotice } from "@/components/admin/admin-shell";
import { allowedPage } from "@/lib/admin/access";
import { isMissingSchema } from "@/lib/admin/validation";
import { createClient } from "@/lib/supabase/server";
import { updateAttention } from "./actions";

function one<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

const statusLabel: Record<string, string> = {
  pending: "Pendiente",
  assigned: "Asignada",
  resolved: "Atendida",
};

export default async function SolicitudesPage() {
  if ((await allowedPage("owner")) === "no") return <AccessDenied title="Solicitudes" />;

  const supabase = await createClient();
  const [requestsResult, waitersResult] = await Promise.all([
    supabase
      .from("attention_requests")
      .select("id, status, created_at, assigned_waiter_id, dining_tables(label, code), waiters(full_name)")
      .order("created_at", { ascending: false }),
    supabase.from("waiters").select("id, full_name, is_available").eq("is_active", true).order("full_name"),
  ]);

  if (isMissingSchema(requestsResult.error) || isMissingSchema(waitersResult.error)) {
    return (
      <>
        <PageIntro title="Solicitudes de atención" description="Llamados reales desde las mesas." />
        <SchemaNotice />
      </>
    );
  }

  const requests = requestsResult.data ?? [];
  const waiters = waitersResult.data ?? [];
  const waiterOptions = waiters.map((waiter) => ({
    value: waiter.id,
    label: waiter.is_available ? waiter.full_name : `${waiter.full_name} (no disponible)`,
  }));

  return (
    <>
      <PageIntro
        title="Solicitudes de atención"
        description="Asigna un mesero o marca la solicitud como atendida. No se inventan llamadas."
      />
      {requests.length === 0 ? (
        <p className="text-sm text-foreground/70">Todavía no hay solicitudes.</p>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const table = one(request.dining_tables);
            const waiter = one(request.waiters);
            return (
            <article key={request.id} className="rounded-2xl border border-gold/30 bg-surface p-4">
              <p className="text-lg">{table?.label ?? "Mesa sin nombre"}</p>
              <p className="text-sm text-foreground/70">
                {statusLabel[request.status] ?? request.status}
                {waiter?.full_name ? ` · ${waiter.full_name}` : ""}
                {" · "}
                {new Intl.DateTimeFormat("es-MX", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "America/Mexico_City",
                }).format(new Date(request.created_at))}
              </p>
              <div className="mt-3 flex flex-col gap-3 md:flex-row">
                <BoundForm action={updateAttention} className="flex flex-1 flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={request.id} />
                  <input type="hidden" name="intent" value="assign" />
                  {waiterOptions.length > 0 ? (
                    <div className="min-w-48 flex-1">
                      <SelectField
                        label="Mesero"
                        name="waiter_id"
                        defaultValue={request.assigned_waiter_id ?? waiterOptions[0]?.value}
                        options={waiterOptions}
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-foreground/70">Registra un mesero activo para asignar.</p>
                  )}
                  <SubmitButton>Asignar</SubmitButton>
                </BoundForm>
                <BoundForm action={updateAttention}>
                  <input type="hidden" name="id" value={request.id} />
                  <input type="hidden" name="intent" value="resolve" />
                  <SubmitButton tone="ghost">Marcar atendida</SubmitButton>
                </BoundForm>
              </div>
            </article>
            );
          })}
        </div>
      )}
    </>
  );
}
