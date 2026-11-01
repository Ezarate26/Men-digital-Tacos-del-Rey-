import {
  AreaField,
  BoundForm,
  CheckField,
  ConfirmSubmit,
  FileField,
  SubmitButton,
  TextField,
} from "@/components/admin/forms";
import { PageIntro, SchemaNotice } from "@/components/admin/admin-shell";
import { isMissingSchema } from "@/lib/admin/validation";
import { createClient } from "@/lib/supabase/server";
import { createSection, deleteSection, moveSection, updateSection } from "./actions";

export default async function SeccionesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_sections")
    .select("id, name, description, image_url, sort_order, is_active")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (isMissingSchema(error)) {
    return (
      <>
        <PageIntro title="Secciones del menú" description="Crea secciones nuevas sin cambiar código." />
        <SchemaNotice />
      </>
    );
  }

  const sections = data ?? [];

  return (
    <>
      <PageIntro
        title="Secciones del menú"
        description="Puedes agregar, renombrar, ordenar, activar o eliminar secciones. Eliminar una sección también elimina sus productos."
      />
      <BoundForm action={createSection} resetOnSuccess className="mb-6 grid gap-3 rounded-2xl border border-gold/30 bg-surface p-4">
        <TextField label="Nombre" name="name" required />
        <AreaField label="Descripción" name="description" />
        <TextField label="Orden" name="sort_order" type="number" min={0} defaultValue={sections.length + 1} />
        <FileField label="Imagen o icono" name="image" />
        <CheckField label="Activa en el menú público" name="is_active" defaultChecked />
        <SubmitButton>Crear sección</SubmitButton>
      </BoundForm>
      <div className="space-y-3">
        {sections.map((section) => (
          <details key={section.id} className="rounded-2xl border border-gold/30 bg-surface p-4">
            <summary className="cursor-pointer">
              {section.name}
              <span className="ml-3 text-sm text-gold-light">
                {section.is_active ? "Activa" : "Oculta"}
              </span>
            </summary>
            <BoundForm action={updateSection} className="mt-4 grid gap-3">
              <input type="hidden" name="id" value={section.id} />
              <TextField label="Nombre" name="name" defaultValue={section.name} required />
              <AreaField label="Descripción" name="description" defaultValue={section.description ?? ""} />
              <TextField label="Orden" name="sort_order" type="number" min={0} defaultValue={section.sort_order} />
              <FileField label="Cambiar imagen" name="image" />
              <CheckField label="Activa en el menú público" name="is_active" defaultChecked={section.is_active} />
              <SubmitButton>Guardar sección</SubmitButton>
            </BoundForm>
            <div className="mt-3 flex flex-wrap gap-2">
              <BoundForm action={moveSection}>
                <input type="hidden" name="id" value={section.id} />
                <input type="hidden" name="direction" value="up" />
                <SubmitButton tone="ghost">Subir</SubmitButton>
              </BoundForm>
              <BoundForm action={moveSection}>
                <input type="hidden" name="id" value={section.id} />
                <input type="hidden" name="direction" value="down" />
                <SubmitButton tone="ghost">Bajar</SubmitButton>
              </BoundForm>
              <BoundForm action={deleteSection}>
                <input type="hidden" name="id" value={section.id} />
                <ConfirmSubmit message="¿Eliminar esta sección y sus productos?">
                  Eliminar
                </ConfirmSubmit>
              </BoundForm>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
