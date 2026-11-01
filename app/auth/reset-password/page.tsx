import { Suspense } from "react";
import type { Metadata } from "next";
import { updatePassword } from "@/app/auth/reset-password/actions";
import { BoundForm, SubmitButton, TextField } from "@/components/admin/forms";

export const metadata: Metadata = {
  title: "Nueva contraseña | Tacos del Rey",
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-gold">Abriendo el formulario...</p>}>
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-gold/40 bg-surface p-8">
          <p className="text-center text-xs tracking-[0.35em] text-gold">TACOS DEL REY</p>
          <h1 className="mt-3 text-center text-3xl font-semibold">Nueva contraseña</h1>
          <BoundForm action={updatePassword} className="mt-6 space-y-4">
            <TextField label="Contraseña" name="password" type="password" required />
            <TextField label="Confirmar contraseña" name="confirmation" type="password" required />
            <SubmitButton pendingLabel="Guardando...">Guardar contraseña</SubmitButton>
          </BoundForm>
        </div>
      </main>
    </Suspense>
  );
}
