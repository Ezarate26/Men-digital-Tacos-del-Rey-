import {
  BoundForm,
  FileField,
  SubmitButton,
  TextField,
} from "@/components/admin/forms";
import { PageIntro, SchemaNotice } from "@/components/admin/admin-shell";
import { isMissingSchema } from "@/lib/admin/validation";
import { isMenuImage } from "@/lib/menu/images";
import { createClient } from "@/lib/supabase/server";
import { updateBranding } from "./actions";
import Image from "next/image";

export default async function DisenoPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurant_settings")
    .select("display_name, tagline, logo_url")
    .eq("id", 1)
    .maybeSingle();

  if (isMissingSchema(error)) {
    return (
      <>
        <PageIntro title="Diseño y branding" description="Nombre, leyenda y logotipo del menú." />
        <SchemaNotice />
      </>
    );
  }

  const logo = data?.logo_url && isMenuImage(data.logo_url) ? data.logo_url : null;

  return (
    <>
      <PageIntro
        title="Diseño y branding"
        description="El menú público usa este nombre y esta leyenda. La paleta negro y dorado se mantiene."
      />
      <BoundForm action={updateBranding} className="grid max-w-xl gap-3 rounded-2xl border border-gold/30 bg-surface p-4">
        <TextField label="Nombre" name="display_name" defaultValue={data?.display_name ?? "Tacos del Rey"} required />
        <TextField label="Leyenda" name="tagline" defaultValue={data?.tagline ?? "TAQUERÍA"} required />
        {logo ? (
          <Image src={logo} alt="Logotipo actual" width={96} height={96} className="rounded-xl" />
        ) : null}
        <FileField label="Logotipo" name="logo" />
        <SubmitButton>Guardar identidad</SubmitButton>
      </BoundForm>
    </>
  );
}
