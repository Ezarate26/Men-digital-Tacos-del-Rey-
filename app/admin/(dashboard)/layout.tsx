import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { logout } from "@/app/admin/login/actions";
import { AdminShell, SchemaNotice } from "@/components/admin/admin-shell";
import { getOwnerContext } from "@/lib/admin/access";

export const metadata: Metadata = {
  title: "Administración | Tacos del Rey",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-gold">Abriendo el panel...</p>}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}

async function Gate({ children }: { children: React.ReactNode }) {
  const access = await getOwnerContext();

  if (access.kind === "anonymous") redirect("/admin/login");

  if (access.kind === "schema") {
    return (
      <main className="mx-auto max-w-lg px-6 py-16">
        <SchemaNotice />
      </main>
    );
  }

  if (access.kind === "forbidden") {
    return (
      <main className="mx-auto max-w-lg px-6 py-16 text-center">
        <p className="text-xs tracking-[0.28em] text-gold">TACOS DEL REY</p>
        <h1 className="mt-3 text-3xl font-semibold">Sin acceso</h1>
        <p className="mt-3 text-sm leading-6 text-foreground/70">
          {access.email || "Esta cuenta"} no tiene el rol de propietario.
        </p>
        <form action={logout} className="mt-6">
          <button type="submit" className="text-sm tracking-wide text-gold">
            Cerrar sesión
          </button>
        </form>
      </main>
    );
  }

  return (
    <AdminShell email={access.email} name={access.name}>
      {children}
    </AdminShell>
  );
}
