import {
  BoundForm,
  CheckField,
  SubmitButton,
  TextField,
} from "@/components/admin/forms";
import { PageIntro, SchemaNotice } from "@/components/admin/admin-shell";
import { isMissingSchema } from "@/lib/admin/validation";
import { createClient } from "@/lib/supabase/server";
import { createWaiter, updateWaiter } from "./actions";

function one<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

const statusLabel: Record<string, string> = {
  pending: "Pendiente",
  assigned: "Asignada",
  resolved: "Atendida",
};

export default async function MeserosPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("waiters")
    .select("id, full_name, whatsapp, is_active, is_available, attention_requests(id, status, created_at, dining_tables(label))")
    .order("full_name", { ascending: true });

  if (isMissingSchema(error)) {
    return (
      <>
        <PageIntro title="Meseros" description="El WhatsApp solo se muestra en este panel." />
        <SchemaNotice />
      </>
    );
  }

  const waiters = data ?? [];

  return (
    <>
      <PageIntro
        title="Meseros"
        description="Registra al personal, su WhatsApp y si puede recibir solicitudes. Ese número no aparece en el menú público."
      />
      <BoundForm action={createWaiter} resetOnSuccess className="mb-6 grid gap-3 rounded-2xl border border-gold/30 bg-surface p-4 md:grid-cols-2">
        <TextField label="Nombre" name="full_name" required />
        <TextField label="WhatsApp" name="whatsapp" required />
        <CheckField label="Activo" name="is_active" defaultChecked />
        <CheckField label="Disponible" name="is_available" defaultChecked />
        <div className="md:col-span-2">
          <SubmitButton>Registrar mesero</SubmitButton>
        </div>
      </BoundForm>
      <div className="space-y-3">
        {waiters.map((waiter) => {
          const requests = waiter.attention_requests ?? [];
          return (
            <article key={waiter.id} className="rounded-2xl border border-gold/30 bg-surface p-4">
              <BoundForm action={updateWaiter} className="grid gap-3 md:grid-cols-2">
                <input type="hidden" name="id" value={waiter.id} />
                <TextField label="Nombre" name="full_name" defaultValue={waiter.full_name} required />
                <TextField label="WhatsApp" name="whatsapp" defaultValue={waiter.whatsapp} required />
                <CheckField label="Activo" name="is_active" defaultChecked={waiter.is_active} />
                <CheckField label="Disponible" name="is_available" defaultChecked={waiter.is_available} />
                <SubmitButton>Guardar mesero</SubmitButton>
              </BoundForm>
              <div className="mt-4">
                <h2 className="text-sm tracking-[0.14em] text-gold-light uppercase">
                  Solicitudes asignadas ({requests.length})
                </h2>
                {requests.length === 0 ? (
                  <p className="mt-2 text-sm text-foreground/70">Todavía no tiene solicitudes.</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm text-foreground/80">
                    {requests.map((request) => {
                      const table = one(request.dining_tables);
                      return (
                        <li key={request.id}>
                          {table?.label ?? "Mesa"} · {statusLabel[request.status] ?? request.status}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
