import { AppearanceEditor } from "@/components/admin/appearance-editor";
import { AccessDenied, PageIntro, SchemaNotice } from "@/components/admin/admin-shell";
import { allowedPage } from "@/lib/admin/access";
import { loadAppearanceEditor } from "@/lib/admin/appearance";
import { getPublicMenu } from "@/lib/menu/queries";

export default async function DisenoPage() {
  if ((await allowedPage(["branding.view", "branding.update", "branding.publish"])) === "no") {
    return <AccessDenied title="Diseño y branding" />;
  }

  const record = await loadAppearanceEditor();

  if (record.status !== "ready") {
    return (
      <>
        <PageIntro
          title="Diseño y branding"
          description="Personaliza el menú QR y revisa los cambios antes de publicarlos."
        />
        {record.status === "schema" ? (
          <SchemaNotice />
        ) : (
          <p className="rounded-2xl border border-gold/40 bg-surface px-4 py-4 text-sm leading-6 text-foreground/80">
            No encontramos la configuración visual de este negocio. Aplica la migración del editor
            en el SQL Editor de Supabase.
          </p>
        )}
      </>
    );
  }

  const menu = await getPublicMenu(undefined);

  return (
    <>
      <PageIntro
        title="Diseño y branding"
        description="El panel izquierdo cambia el borrador al momento. El menú QR usa solo la versión publicada, salvo que actives la publicación inmediata."
      />
      <AppearanceEditor
        initialTheme={record.draft}
        publishedTheme={record.published}
        publishImmediately={record.publishImmediately}
        hasPrevious={record.hasPrevious}
        sections={menu.ok ? menu.menu.sections : []}
        menuAvailable={menu.ok ? menu.menu.menuAvailable : true}
      />
    </>
  );
}
