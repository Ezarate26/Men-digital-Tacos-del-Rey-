import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogIn } from "lucide-react";
import { login } from "@/app/admin/login/actions";
import { BoundForm, SubmitButton, TextField } from "@/components/admin/forms";
import { getAccessContext } from "@/lib/admin/access";

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
  const access = await getAccessContext();
  if (access.kind === "owner" || access.kind === "collaborator") redirect("/admin");

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-gold/40 bg-surface p-8">
        <LogIn className="mx-auto text-gold" aria-hidden="true" />
        <p className="mt-4 text-center text-xs tracking-[0.35em] text-gold">TACOS DEL REY</p>
        <h1 className="mt-3 text-center text-3xl font-semibold tracking-wide">
          Administración
        </h1>
        <p className="mt-3 text-center text-sm leading-6 text-foreground/70">
          Entra con el correo y la contraseña de tu cuenta.
        </p>
        <BoundForm action={login} className="mt-6 space-y-4">
          <TextField label="Correo" name="email" type="email" required />
          <TextField label="Contraseña" name="password" type="password" required />
          <SubmitButton pendingLabel="Entrando...">Entrar</SubmitButton>
        </BoundForm>
        <p className="mt-4 text-center text-sm">
          <Link href="/admin/recuperar" className="text-gold">
            Olvidé mi contraseña
          </Link>
        </p>
      </div>
    </main>
  );
}
