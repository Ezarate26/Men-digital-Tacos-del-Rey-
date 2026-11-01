import { AttentionBar } from "@/components/menu/attention-bar";
import { MenuBoard } from "@/components/menu/menu-board";
import { getPublicMenu } from "@/lib/menu/queries";
import { recordMenuVisit } from "@/lib/menu/visits";
import type { MenuTableState } from "@/lib/menu/types";

export async function MenuContent({
  searchParams,
}: {
  searchParams: Promise<{ mesa?: string | string[] }>;
}) {
  const { mesa } = await searchParams;
  const result = await getPublicMenu(mesa);

  if (!result.ok) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-6">
        <div className="w-full rounded-2xl border border-gold/40 bg-surface px-6 py-10 text-center">
          <p className="text-xs tracking-[0.35em] text-gold">TAQUERÍA</p>
          <h1 className="mt-3 text-3xl font-bold tracking-wide">TACOS DEL REY</h1>
          <p className="mt-4 text-sm leading-6 text-foreground/75">
            {result.reason === "unpublished"
              ? "El menú todavía no está publicado."
              : "No pudimos cargar el menú. Revisa tu conexión e inténtalo de nuevo."}
          </p>
        </div>
      </main>
    );
  }

  const { menu } = result;
  const tableCode = menu.table.status === "active" ? menu.table.code : null;
  await recordMenuVisit(tableCode);

  return (
    <main className="min-h-screen pb-32">
      <header className="mx-auto w-full max-w-lg px-5 pt-8 pb-5 text-center md:max-w-3xl">
        <p className="text-xs tracking-[0.35em] text-gold uppercase">
          {menu.brand.eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-wide uppercase md:text-4xl">
          {menu.brand.name}
        </h1>
        <div className="mx-auto my-4 h-px w-16 bg-gold" />
        <TableNotice table={menu.table} />
        {menu.menuAvailable ? null : (
          <p className="mt-4 text-sm leading-6 text-gold-light">
            En este momento no estamos recibiendo órdenes. Puedes consultar la
            carta.
          </p>
        )}
      </header>

      <MenuBoard sections={menu.sections} />
      <AttentionBar tableCode={tableCode} />
    </main>
  );
}

function TableNotice({ table }: { table: MenuTableState }) {
  if (table.status === "active") {
    return (
      <p className="inline-flex rounded-full border border-gold px-4 py-1 text-sm tracking-[0.22em] text-gold-light uppercase">
        {table.label}
      </p>
    );
  }

  if (table.status === "invalid") {
    return (
      <p className="text-sm leading-6 text-foreground/75">
        No reconocemos esta mesa. Puedes ver la carta, pero para llamar al
        mesero escanea el QR de una mesa activa.
      </p>
    );
  }

  return (
    <p className="text-sm leading-6 text-foreground/75">
      Estás viendo el menú general. Escanea el QR de tu mesa para llamar al
      mesero.
    </p>
  );
}
