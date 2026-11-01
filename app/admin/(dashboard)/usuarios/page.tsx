import {
  BoundForm,
  SelectField,
  SubmitButton,
  TextField,
} from "@/components/admin/forms";
import { PageIntro, SchemaNotice } from "@/components/admin/admin-shell";
import { isMissingSchema } from "@/lib/admin/validation";
import { createClient } from "@/lib/supabase/server";
import { changeRole, createUser } from "./actions";

const roles = [
  { value: "owner", label: "Propietario" },
  { value: "admin", label: "Administrador" },
  { value: "manager", label: "Gerente" },
  { value: "waiter", label: "Mesero" },
];

export default async function UsuariosPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at")
    .order("created_at", { ascending: true });

  if (isMissingSchema(error)) {
    return (
      <>
        <PageIntro title="Usuarios" description="Cuentas y roles del sistema." />
        <SchemaNotice />
      </>
    );
  }

  return (
    <>
      <PageIntro
        title="Usuarios"
        description="Hoy solo el rol de propietario entra a este panel. Los demás roles quedan guardados para el personal."
      />
      <BoundForm action={createUser} resetOnSuccess className="mb-6 grid gap-3 rounded-2xl border border-gold/30 bg-surface p-4 md:grid-cols-2">
        <TextField label="Nombre" name="full_name" required />
        <TextField label="Correo" name="email" type="email" required />
        <TextField label="Contraseña temporal" name="password" type="password" required />
        <SelectField label="Rol" name="role" defaultValue="waiter" options={roles} />
        <div className="md:col-span-2">
          <SubmitButton>Crear usuario</SubmitButton>
        </div>
      </BoundForm>
      <div className="space-y-3">
        {(data ?? []).map((profile) => (
          <article key={profile.id} className="rounded-2xl border border-gold/30 bg-surface p-4">
            <p className="font-semibold">{profile.full_name || "Sin nombre"}</p>
            <p className="text-sm text-foreground/70">{profile.email}</p>
            <BoundForm action={changeRole} className="mt-3 flex flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={profile.id} />
              <div className="min-w-48">
                <SelectField label="Rol" name="role" defaultValue={profile.role} options={roles} />
              </div>
              <SubmitButton>Actualizar rol</SubmitButton>
            </BoundForm>
          </article>
        ))}
      </div>
    </>
  );
}
