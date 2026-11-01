import { Suspense } from "react";
import type { Metadata } from "next";
import { acceptInvitation } from "@/app/auth/accept-invitation/actions";
import { BoundForm, SubmitButton, TextField } from "@/components/admin/forms";
import { PERMISSION_GROUPS, isPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Aceptar invitación | Tacos del Rey",
};

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-gold">Abriendo la invitación...</p>}>
      <AcceptScreen />
    </Suspense>
  );
}

async function AcceptScreen() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const invitation = data.user ? await supabase.rpc("my_invitation") : { data: null, error: null };
  const payload = invitation.data as { status?: string; full_name?: string; permissions?: unknown } | null;
  const keys = Array.isArray(payload?.permissions) ? payload.permissions.filter(isPermission) : [];
  const labels = PERMISSION_GROUPS.flatMap((group) =>
    group.items.filter((item) => keys.includes(item.key)),
  );

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-gold/40 bg-surface p-8">
        <p className="text-center text-xs tracking-[0.35em] text-gold">TACOS DEL REY</p>
        <h1 className="mt-3 text-center text-3xl font-semibold">Aceptar invitación</h1>
        {!data.user ? (
          <p className="mt-4 text-center text-sm leading-6 text-foreground/70">
            Abre el enlace que llegó a tu correo. Desde ahí podrás elegir tu contraseña.
          </p>
        ) : payload?.status === "expired" ? (
          <p className="mt-4 text-center text-sm leading-6 text-foreground/70">
            Esta invitación venció. Pide al propietario que envíe una nueva.
          </p>
        ) : payload?.status !== "pending" ? (
          <p className="mt-4 text-center text-sm leading-6 text-foreground/70">
            No hay una invitación pendiente para esta cuenta.
          </p>
        ) : (
          <BoundForm action={acceptInvitation} className="mt-6 space-y-4">
            <TextField label="Nombre" name="full_name" defaultValue={payload.full_name ?? ""} required />
            <TextField label="Contraseña" name="password" type="password" required />
            <TextField label="Confirmar contraseña" name="confirmation" type="password" required />
            <div>
              <p className="text-sm text-foreground/80">Permisos asignados por el propietario</p>
              <ul className="mt-2 space-y-1 text-sm text-foreground/70">
                {labels.map((item) => (
                  <li key={item.key}>{item.label}</li>
                ))}
              </ul>
            </div>
            <SubmitButton pendingLabel="Activando acceso...">Activar mi acceso</SubmitButton>
          </BoundForm>
        )}
      </div>
    </main>
  );
}
