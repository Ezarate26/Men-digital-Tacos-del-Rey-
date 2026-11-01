import { BoundForm, CheckField, SubmitButton, TextField } from "@/components/admin/forms";
import { AccessDenied, PageIntro, SchemaNotice } from "@/components/admin/admin-shell";
import { allowedPage } from "@/lib/admin/access";
import { isMissingSchema } from "@/lib/admin/validation";
import { createClient } from "@/lib/supabase/server";
import { updateSettings } from "./actions";

export default async function ConfiguracionPage() {
  if ((await allowedPage(["menu.view", "menu.publish"])) === "no") {
    return <AccessDenied title="Configuración" />;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurant_settings")
    .select("menu_available, public_site_url")
    .eq("id", 1)
    .maybeSingle();

  if (isMissingSchema(error)) {
    return (
      <>
        <PageIntro title="Configuración" description="Disponibilidad del comedor y dominio de los QR." />
        <SchemaNotice />
      </>
    );
  }

  return (
    <>
      <PageIntro
        title="Configuración"
        description="El dominio se usa para generar los códigos QR. Si lo dejas vacío, se usa la dirección desde la que estás viendo el panel."
      />
      <BoundForm action={updateSettings} className="grid max-w-xl gap-3 rounded-2xl border border-gold/30 bg-surface p-4">
        <CheckField
          label="El comedor está recibiendo órdenes"
          name="menu_available"
          defaultChecked={data?.menu_available === true}
        />
        <TextField
          label="Dominio público"
          name="public_site_url"
          defaultValue={data?.public_site_url ?? ""}
        />
        <SubmitButton>Guardar configuración</SubmitButton>
      </BoundForm>
    </>
  );
}
