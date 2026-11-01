"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/admin/login/actions";

const links = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/secciones", label: "Secciones del menú" },
  { href: "/admin/diseno", label: "Diseño y branding" },
  { href: "/admin/mesas", label: "Mesas" },
  { href: "/admin/meseros", label: "Meseros" },
  { href: "/admin/solicitudes", label: "Solicitudes de atención" },
  { href: "/admin/estadisticas", label: "Estadísticas" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/configuracion", label: "Configuración" },
];

export function AdminShell({
  email,
  name,
  children,
}: {
  email: string;
  name: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside
        className={`${open ? "block" : "hidden"} border-b border-gold/25 bg-surface md:block md:min-h-screen md:border-r md:border-b-0`}
      >
        <div className="px-5 py-6">
          <p className="text-xs tracking-[0.28em] text-gold">TACOS DEL REY</p>
          <p className="mt-1 text-sm text-foreground/70">Administración</p>
        </div>
        <nav className="flex flex-col gap-1 px-3 pb-4">
          {links.map((link) => {
            const active =
              link.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`rounded-xl px-3 py-2 text-sm ${
                  active
                    ? "bg-gold text-black"
                    : "text-foreground/80 hover:bg-black/40"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-gold/20 px-5 py-4">
          <p className="text-sm text-foreground">{name || "Propietario"}</p>
          <p className="truncate text-xs text-foreground/60">{email}</p>
          <form action={logout} className="mt-3">
            <button type="submit" className="text-sm tracking-wide text-gold">
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex items-center justify-between border-b border-gold/20 px-4 py-3 md:hidden">
          <p className="text-sm tracking-[0.2em] text-gold">ADMINISTRACIÓN</p>
          <button
            type="button"
            className="rounded-full border border-gold/40 px-3 py-1 text-sm text-gold"
            onClick={() => setOpen((current) => !current)}
          >
            {open ? "Cerrar" : "Menú"}
          </button>
        </header>
        <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8">{children}</div>
      </div>
    </div>
  );
}

export function PageIntro({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="mb-6">
      <h1 className="text-3xl font-semibold tracking-wide">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground/70">{description}</p>
    </header>
  );
}

export function SchemaNotice() {
  return (
    <p className="rounded-2xl border border-gold/40 bg-surface px-4 py-4 text-sm leading-6 text-foreground/80">
      Falta aplicar las migraciones en Supabase. Ejecuta, en orden, los archivos
      de <span className="text-gold">supabase/migrations</span> desde el SQL Editor.
    </p>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-gold/30 bg-surface p-4 ${className}`}>
      {children}
    </section>
  );
}
