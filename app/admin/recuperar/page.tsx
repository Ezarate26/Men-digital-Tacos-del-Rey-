import type { Metadata } from "next";
import Link from "next/link";
import { requestPasswordReset } from "@/app/admin/recuperar/actions";
import { BoundForm, SubmitButton, TextField } from "@/components/admin/forms";

export const metadata: Metadata = {
  title: "Recuperar contraseña | Tacos del Rey",
};

export default function RecoverPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-gold/40 bg-surface p-8">
        <p className="text-center text-xs tracking-[0.35em] text-gold">TACOS DEL REY</p>
        <h1 className="mt-3 text-center text-3xl font-semibold">Recuperar contraseña</h1>
        <p className="mt-3 text-center text-sm leading-6 text-foreground/70">
          Te enviaremos un enlace para elegir una contraseña nueva.
        </p>
        <BoundForm action={requestPasswordReset} className="mt-6 space-y-4">
          <TextField label="Correo electrónico" name="email" type="email" required />
          <SubmitButton pendingLabel="Enviando...">Enviar enlace</SubmitButton>
        </BoundForm>
        <p className="mt-4 text-center text-sm">
          <Link href="/admin/login" className="text-gold">
            Volver al acceso
          </Link>
        </p>
      </div>
    </main>
  );
}
