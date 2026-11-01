import { PublicMenuView } from "@/components/menu/public-menu-view";
import { getPublicMenu } from "@/lib/menu/queries";
import { recordMenuVisit } from "@/lib/menu/visits";

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
    <PublicMenuView
      theme={menu.theme}
      sections={menu.sections}
      table={menu.table}
      menuAvailable={menu.menuAvailable}
      mode="live"
    />
  );
}
