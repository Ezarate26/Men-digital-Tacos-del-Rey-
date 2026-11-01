import QRCode from "qrcode";
import {
  BoundForm,
  CheckField,
  SubmitButton,
  TextField,
} from "@/components/admin/forms";
import { PageIntro, SchemaNotice } from "@/components/admin/admin-shell";
import { QrTools } from "@/components/admin/qr-tools";
import { resolvePublicOrigin } from "@/lib/admin/origin";
import { isMissingSchema } from "@/lib/admin/validation";
import { createClient } from "@/lib/supabase/server";
import { createTable, updateTable } from "./actions";

export default async function MesasPage() {
  const supabase = await createClient();
  const [tablesResult, settingsResult] = await Promise.all([
    supabase
      .from("dining_tables")
      .select("id, code, label, is_active")
      .order("code", { ascending: true }),
    supabase.from("restaurant_settings").select("public_site_url").eq("id", 1).maybeSingle(),
  ]);

  if (isMissingSchema(tablesResult.error) || isMissingSchema(settingsResult.error)) {
    return (
      <>
        <PageIntro title="Mesas" description="Códigos QR para cada mesa." />
        <SchemaNotice />
      </>
    );
  }

  const origin = await resolvePublicOrigin(settingsResult.data?.public_site_url);
  const tables = tablesResult.data ?? [];
  const cards = await Promise.all(
    tables.map(async (table) => {
      const url = `${origin}/menu?mesa=${encodeURIComponent(table.code)}`;
      const dataUrl = origin
        ? await QRCode.toDataURL(url, {
            width: 320,
            margin: 1,
            color: { dark: "#101010", light: "#F5F0E6" },
          })
        : "";
      return { ...table, url, dataUrl };
    }),
  );

  return (
    <>
      <PageIntro
        title="Mesas"
        description="Cada QR abre el menú público con el código de esa mesa. El dominio sale de Configuración."
      />
      {!settingsResult.data?.public_site_url ? (
        <p className="mb-4 text-sm text-gold-light">
          Todavía no hay un dominio de producción. Estos QR usan la dirección actual. Configúralo antes de imprimirlos.
        </p>
      ) : null}
      <BoundForm action={createTable} resetOnSuccess className="mb-6 grid gap-3 rounded-2xl border border-gold/30 bg-surface p-4 md:grid-cols-2">
        <TextField label="Código" name="code" required />
        <TextField label="Nombre" name="label" required />
        <CheckField label="Mesa activa" name="is_active" defaultChecked />
        <div className="md:col-span-2">
          <SubmitButton>Crear mesa</SubmitButton>
        </div>
      </BoundForm>
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((table) => (
          <article key={table.id} className="rounded-2xl border border-gold/30 bg-surface p-4">
            {table.dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={table.dataUrl} alt={`QR de ${table.label}`} width={180} height={180} />
            ) : null}
            <BoundForm action={updateTable} className="mt-4 grid gap-3">
              <input type="hidden" name="id" value={table.id} />
              <TextField label="Código" name="code" defaultValue={table.code} required />
              <TextField label="Nombre" name="label" defaultValue={table.label} required />
              <CheckField label="Mesa activa" name="is_active" defaultChecked={table.is_active} />
              <p className="text-sm break-all text-foreground/70">{table.url}</p>
              <SubmitButton>Guardar mesa</SubmitButton>
            </BoundForm>
            {table.dataUrl ? (
              <div className="mt-3">
                <QrTools
                  dataUrl={table.dataUrl}
                  filename={`mesa-${table.code}.png`}
                  title={table.label}
                  url={table.url}
                />
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </>
  );
}
