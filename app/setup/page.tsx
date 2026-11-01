import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { registerOwner } from "@/app/setup/actions";
import { BoundForm, SubmitButton, TextField } from "@/components/admin/forms";
import { SchemaNotice } from "@/components/admin/admin-shell";
import { getAccessContext, installationStatus } from "@/lib/admin/access";

export const metadata: Metadata = {
  title: "Configuración inicial | Tacos del Rey",
};

export default function SetupPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-gold">Revisando la instalación...</p>}>
      <SetupScreen />
    </Suspense>
  );
}

async function SetupScreen() {
  const installed = await installationStatus();
  if (installed === true) redirect("/admin/login");

  const access = await getAccessContext();
  if (access.kind === "owner") redirect("/admin");

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-gold/40 bg-surface p-8">
        <KeyRound className="mx-auto text-gold" aria-hidden="true" />
        <p className="mt-4 text-center text-xs tracking-[0.35em] text-gold">TACOS DEL REY</p>
        <h1 className="mt-3 text-center text-3xl font-semibold tracking-wide">Configuración inicial</h1>
        <p className="mt-3 text-center text-sm leading-6 text-foreground/70">
          Crea la cuenta del propietario. Esta pantalla se cierra para siempre cuando el registro termina.
        </p>
        {installed === "missing" ? (
          <div className="mt-6">
            <SchemaNotice />
          </div>
        ) : (
          <BoundForm action={registerOwner} className="mt-6 space-y-4">
            <TextField label="Nombre completo" name="full_name" required />
            <TextField label="Correo electrónico" name="email" type="email" required />
            <TextField label="Contraseña" name="password" type="password" required />
            <TextField label="Confirmar contraseña" name="confirmation" type="password" required />
            <p className="text-sm leading-6 text-foreground/60">
              Mínimo 12 caracteres, con una letra y un número.
            </p>
            <SubmitButton pendingLabel="Creando cuenta...">Crear propietario</SubmitButton>
          </BoundForm>
        )}
      </div>
    </main>
  );
}
