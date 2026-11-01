import {
  AreaField,
  BoundForm,
  CheckField,
  ConfirmSubmit,
  FileField,
  SelectField,
  SubmitButton,
  TextField,
} from "@/components/admin/forms";
import { PageIntro, SchemaNotice } from "@/components/admin/admin-shell";
import { centsToPriceInput } from "@/lib/admin/validation";
import { isMissingSchema } from "@/lib/admin/validation";
import { formatPrice } from "@/lib/menu/format";
import { createClient } from "@/lib/supabase/server";
import {
  createProduct,
  deleteProduct,
  moveProduct,
  updateProduct,
} from "./actions";

export default async function ProductosPage() {
  const supabase = await createClient();
  const [productsResult, sectionsResult] = await Promise.all([
    supabase
      .from("products")
      .select("id, section_id, name, description, price_cents, image_url, is_available, is_active, is_featured, sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("menu_sections")
      .select("id, name")
      .order("sort_order", { ascending: true }),
  ]);

  if (isMissingSchema(productsResult.error) || isMissingSchema(sectionsResult.error)) {
    return (
      <>
        <PageIntro title="Productos" description="Crea y ordena los platillos del menú." />
        <SchemaNotice />
      </>
    );
  }

  const sections = sectionsResult.data ?? [];
  const products = productsResult.data ?? [];
  const sectionOptions = sections.map((section) => ({
    value: section.id,
    label: section.name,
  }));

  return (
    <>
      <PageIntro
        title="Productos"
        description="Los cambios se guardan en Supabase y aparecen en el menú público según la sección y la disponibilidad."
      />
      {sections.length === 0 ? (
        <p className="mb-4 text-sm text-foreground/70">
          Primero crea una sección. Un producto siempre pertenece a una.
        </p>
      ) : (
        <BoundForm action={createProduct} resetOnSuccess className="mb-6 grid gap-3 rounded-2xl border border-gold/30 bg-surface p-4 md:grid-cols-2">
          <TextField label="Nombre" name="name" required />
          <TextField label="Precio en pesos" name="price" type="number" min={0} step="0.01" required />
          <div className="md:col-span-2">
            <AreaField label="Descripción" name="description" />
          </div>
          <SelectField label="Sección" name="section_id" options={sectionOptions} />
          <TextField label="Orden" name="sort_order" type="number" min={0} defaultValue={products.length + 1} />
          <FileField label="Fotografía" name="image" />
          <div className="flex flex-wrap gap-4 md:col-span-2">
            <CheckField label="Disponible" name="is_available" defaultChecked />
            <CheckField label="Activo" name="is_active" defaultChecked />
            <CheckField label="Destacado" name="is_featured" />
          </div>
          <SubmitButton>Crear producto</SubmitButton>
        </BoundForm>
      )}
      <div className="space-y-3">
        {products.map((product) => (
          <details key={product.id} className="rounded-2xl border border-gold/30 bg-surface p-4">
            <summary className="cursor-pointer text-lg">
              {product.name}
              <span className="ml-3 text-sm text-gold">{formatPrice(product.price_cents)}</span>
            </summary>
            <BoundForm action={updateProduct} className="mt-4 grid gap-3 md:grid-cols-2">
              <input type="hidden" name="id" value={product.id} />
              <TextField label="Nombre" name="name" defaultValue={product.name} required />
              <TextField label="Precio en pesos" name="price" type="number" min={0} step="0.01" defaultValue={centsToPriceInput(product.price_cents)} required />
              <div className="md:col-span-2">
                <AreaField label="Descripción" name="description" defaultValue={product.description ?? ""} />
              </div>
              <SelectField label="Sección" name="section_id" defaultValue={product.section_id} options={sectionOptions} />
              <TextField label="Orden" name="sort_order" type="number" min={0} defaultValue={product.sort_order} />
              <FileField label="Cambiar fotografía" name="image" />
              <div className="flex flex-wrap gap-4 md:col-span-2">
                <CheckField label="Disponible" name="is_available" defaultChecked={product.is_available} />
                <CheckField label="Activo" name="is_active" defaultChecked={product.is_active} />
                <CheckField label="Destacado" name="is_featured" defaultChecked={product.is_featured} />
              </div>
              <SubmitButton>Guardar producto</SubmitButton>
            </BoundForm>
            <div className="mt-3 flex flex-wrap gap-2">
              <BoundForm action={moveProduct}>
                <input type="hidden" name="id" value={product.id} />
                <input type="hidden" name="section_id" value={product.section_id} />
                <input type="hidden" name="direction" value="up" />
                <SubmitButton tone="ghost">Subir</SubmitButton>
              </BoundForm>
              <BoundForm action={moveProduct}>
                <input type="hidden" name="id" value={product.id} />
                <input type="hidden" name="section_id" value={product.section_id} />
                <input type="hidden" name="direction" value="down" />
                <SubmitButton tone="ghost">Bajar</SubmitButton>
              </BoundForm>
              <BoundForm action={deleteProduct}>
                <input type="hidden" name="id" value={product.id} />
                <ConfirmSubmit message="¿Eliminar este producto?">Eliminar</ConfirmSubmit>
              </BoundForm>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
