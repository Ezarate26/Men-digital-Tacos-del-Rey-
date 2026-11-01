import { Suspense } from "react";
import { redirect } from "next/navigation";
import { installationStatus } from "@/lib/admin/access";
import { databaseMessage } from "@/lib/admin/validation";
import { createClient } from "@/lib/supabase/server";

export default function CompleteSetupPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-gold">Completando la instalación...</p>}>
      <Complete />
    </Suspense>
  );
}

async function Complete() {
  const installed = await installationStatus();
  if (installed === true) redirect("/admin/login");
  if (installed === "missing") redirect("/setup");

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/admin/login");

  const claim = await supabase.rpc("claim_owner");

  if (!claim.error) redirect("/admin");

  await supabase.auth.signOut();

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-gold/40 bg-surface p-8 text-center">
        <p className="text-xs tracking-[0.35em] text-gold">TACOS DEL REY</p>
        <h1 className="mt-3 text-3xl font-semibold">No se completó la instalación</h1>
        <p className="mt-3 text-sm leading-6 text-foreground/70">{databaseMessage(claim.error)}</p>
      </div>
    </main>
  );
}
