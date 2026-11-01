import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { login } from "@/app/admin/login/actions";
import { BoundForm, SubmitButton, TextField } from "@/components/admin/forms";
import { getOwnerContext } from "@/lib/admin/access";

export const metadata: Metadata = {
  title: "Entrar | Tacos del Rey",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-gold">Abriendo acceso...</p>}>
      <LoginScreen />
    </Suspense>
  );
}

async function LoginScreen() {
  const access = await getOwnerContext();
  if (access.kind === "owner") redirect("/admin");

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-gold/40 bg-surface p-8">
        <p className="text-center text-xs tracking-[0.35em] text-gold">TACOS DEL REY</p>
        <h1 className="mt-3 text-center text-3xl font-semibold tracking-wide">
          Administración
        </h1>
        <p className="mt-3 text-center text-sm leading-6 text-foreground/70">
          Solo el propietario puede entrar a este panel.
        </p>
        <BoundForm action={login} className="mt-6 space-y-4">
          <TextField label="Correo" name="email" type="email" required />
          <TextField label="Contraseña" name="password" type="password" required />
          <SubmitButton>Entrar</SubmitButton>
        </BoundForm>
      </div>
    </main>
  );
}
