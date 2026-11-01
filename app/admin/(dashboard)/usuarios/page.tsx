import { Mail, Shield, UserPlus, Users } from "lucide-react";
import {
  cancelInvitation,
  inviteCollaborator,
  revokeCollaborator,
  saveCollaboratorPermissions,
} from "@/app/admin/(dashboard)/usuarios/actions";
import { BoundForm, SubmitButton, TextField } from "@/components/admin/forms";
import { PageIntro, SchemaNotice } from "@/components/admin/admin-shell";
import { PermissionFields } from "@/components/admin/permission-fields";
import { can, getAccessContext } from "@/lib/admin/access";
import { isMissingSchema } from "@/lib/admin/validation";
import { isPermission, type Permission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export default async function UsuariosPage() {
  const access = await getAccessContext();
  if (access.kind === "schema") {
    return (
      <>
        <PageIntro title="Usuarios" description="Colaboradores e invitaciones." />
        <SchemaNotice />
      </>
    );
  }
  if (!can(access, ["users.view"])) {
    return (
      <PageIntro
        title="Usuarios"
        description="No tienes permiso para consultar colaboradores."
      />
    );
  }

  const supabase = await createClient();
  const collaborators = await supabase.rpc("list_collaborators");

  if (isMissingSchema(collaborators.error)) {
    return (
      <>
        <PageIntro title="Usuarios" description="Colaboradores e invitaciones." />
        <SchemaNotice />
      </>
    );
  }

  const isOwner = access.kind === "owner";
  const invitations = isOwner
    ? await supabase
        .from("invitations")
        .select("id, email, full_name, status, expires_at, created_at")
        .order("created_at", { ascending: false })
    : { data: [], error: null };
  const rows = (collaborators.data ?? []) as Array<{
    id: string;
    full_name: string;
    email: string;
    is_active: boolean;
    permissions: string[] | null;
  }>;

  return (
    <>
      <PageIntro
        title="Usuarios"
        description="El propietario invita colaboradores y decide, uno por uno, qué puede hacer cada persona."
      />
      {isOwner ? (
        <BoundForm action={inviteCollaborator} resetOnSuccess className="mb-6 grid gap-4 rounded-2xl border border-gold/30 bg-surface p-4">
          <div className="flex items-center gap-2 text-gold">
            <UserPlus aria-hidden="true" size={18} />
            <h2 className="text-sm tracking-[0.16em]">INVITAR</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="Nombre" name="full_name" />
            <TextField label="Correo" name="email" type="email" required />
          </div>
          <PermissionFields selected={[]} />
          <SubmitButton pendingLabel="Enviando...">Enviar invitación</SubmitButton>
        </BoundForm>
      ) : null}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm tracking-[0.16em] text-gold">
          <Users aria-hidden="true" size={18} />
          COLABORADORES
        </h2>
        {rows.length === 0 ? (
          <p className="text-sm text-foreground/70">Todavía no hay colaboradores.</p>
        ) : (
          rows.map((person) => {
            const permissions = (person.permissions ?? []).filter(isPermission);
            return (
              <article key={person.id} className="rounded-2xl border border-gold/30 bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{person.full_name || "Sin nombre"}</p>
                    <p className="text-sm text-foreground/70">{person.email}</p>
                  </div>
                  <p className="text-xs tracking-[0.14em] text-gold">
                    {person.is_active ? "ACTIVO" : "REVOCADO"}
                  </p>
                </div>
                {isOwner && person.is_active ? (
                  <BoundForm action={saveCollaboratorPermissions} className="mt-4 grid gap-4">
                    <input type="hidden" name="user_id" value={person.id} />
                    <PermissionFields selected={permissions} />
                    <div className="flex flex-wrap gap-2">
                      <SubmitButton>Guardar permisos</SubmitButton>
                    </div>
                  </BoundForm>
                ) : (
                  <PermissionSummary permissions={permissions} />
                )}
                {isOwner && person.is_active ? (
                  <BoundForm action={revokeCollaborator} className="mt-3">
                    <input type="hidden" name="user_id" value={person.id} />
                    <SubmitButton tone="ghost">Revocar acceso</SubmitButton>
                  </BoundForm>
                ) : null}
              </article>
            );
          })
        )}
      </section>

      {isOwner ? (
        <section className="mt-8 space-y-3">
          <h2 className="flex items-center gap-2 text-sm tracking-[0.16em] text-gold">
            <Mail aria-hidden="true" size={18} />
            INVITACIONES
          </h2>
          {(invitations.data ?? []).length === 0 ? (
            <p className="text-sm text-foreground/70">No hay invitaciones.</p>
          ) : (
            (invitations.data ?? []).map((invitation) => (
              <article key={invitation.id} className="rounded-2xl border border-gold/30 bg-surface p-4">
                <p className="font-semibold">{invitation.full_name || invitation.email}</p>
                <p className="text-sm text-foreground/70">{invitation.email}</p>
                <p className="mt-1 text-xs tracking-[0.14em] text-gold">{invitation.status}</p>
                {invitation.status === "pending" ? (
                  <BoundForm action={cancelInvitation} className="mt-3">
                    <input type="hidden" name="id" value={invitation.id} />
                    <SubmitButton tone="ghost">Cancelar invitación</SubmitButton>
                  </BoundForm>
                ) : null}
              </article>
            ))
          )}
        </section>
      ) : (
        <p className="mt-6 flex items-center gap-2 text-sm text-foreground/70">
          <Shield aria-hidden="true" size={16} />
          Solo el propietario invita, cambia permisos y revoca accesos.
        </p>
      )}
    </>
  );
}

function PermissionSummary({ permissions }: { permissions: Permission[] }) {
  if (permissions.length === 0) return <p className="mt-3 text-sm text-foreground/60">Sin permisos.</p>;

  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {permissions.map((permission) => (
        <li key={permission} className="rounded-full border border-gold/30 px-3 py-1 text-xs text-foreground/80">
          {permission}
        </li>
      ))}
    </ul>
  );
}
