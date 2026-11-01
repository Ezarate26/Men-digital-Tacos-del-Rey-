"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { saveAppearance } from "@/app/admin/(dashboard)/diseno/actions";
import { PublicMenuView } from "@/components/menu/public-menu-view";
import { idleAction, type ActionState } from "@/lib/admin/types";
import {
  BORDER_OPTIONS,
  CARD_OPTIONS,
  FONT_OPTIONS,
  IMAGE_SLOTS,
  RADIUS_OPTIONS,
  SHADOW_OPTIONS,
  SPACING_OPTIONS,
  TITLE_OPTIONS,
  type MenuTheme,
} from "@/lib/menu/theme";
import type { MenuSection } from "@/lib/menu/types";

const control =
  "w-full rounded-xl border border-gold/30 bg-black px-3 py-2 text-sm text-foreground outline-none focus:border-gold";

const emptyRemoved = { logo: false, hero: false, banner: false, cover: false };

type PreviewMap = Partial<Record<(typeof IMAGE_SLOTS)[number]["slot"], string>>;

export function AppearanceEditor(props: {
  initialTheme: MenuTheme;
  publishedTheme: MenuTheme;
  publishImmediately: boolean;
  hasPrevious: boolean;
  sections: MenuSection[];
  menuAvailable: boolean;
}) {
  const router = useRouter();
  const refreshed = useRef<ActionState | null>(null);
  const [state, formAction] = useActionState(saveAppearance, idleAction);

  useEffect(() => {
    if (state.status !== "success" || refreshed.current === state) return;
    refreshed.current = state;
    router.refresh();
  }, [state, router]);

  return (
    <EditorForm
      key={`${JSON.stringify(props.initialTheme)}:${props.publishImmediately}`}
      {...props}
      state={state}
      formAction={formAction}
    />
  );
}

function EditorForm({
  initialTheme,
  publishedTheme,
  publishImmediately,
  hasPrevious,
  sections,
  menuAvailable,
  state,
  formAction,
}: {
  initialTheme: MenuTheme;
  publishedTheme: MenuTheme;
  publishImmediately: boolean;
  hasPrevious: boolean;
  sections: MenuSection[];
  menuAvailable: boolean;
  state: ActionState;
  formAction: (formData: FormData) => void;
}) {
  const [theme, setTheme] = useState(initialTheme);
  const [immediate, setImmediate] = useState(publishImmediately);
  const [device, setDevice] = useState<"phone" | "desktop">("phone");
  const [previews, setPreviews] = useState<PreviewMap>({});
  const [removed, setRemoved] = useState(emptyRemoved);
  const [notice, setNotice] = useState("");
  const previewsRef = useRef(previews);

  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  useEffect(() => {
    return () => {
      for (const url of Object.values(previewsRef.current)) {
        if (url) URL.revokeObjectURL(url);
      }
    };
  }, []);

  const previewTheme: MenuTheme = {
    ...theme,
    images: {
      logoUrl: imagePreview("logo", theme, previews, removed),
      heroUrl: imagePreview("hero", theme, previews, removed),
      bannerUrl: imagePreview("banner", theme, previews, removed),
      coverUrl: imagePreview("cover", theme, previews, removed),
    },
  };
  const dirty =
    JSON.stringify(theme) !== JSON.stringify(publishedTheme) ||
    Object.values(previews).some(Boolean) ||
    Object.values(removed).some(Boolean);

  function chooseFile(slot: (typeof IMAGE_SLOTS)[number]["slot"], file: File | undefined) {
    if (!file) {
      setNotice("Usa una imagen JPG, PNG o WebP de menos de 5 MB.");
      return;
    }

    if (file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setNotice("Usa una imagen JPG, PNG o WebP de menos de 5 MB.");
      return;
    }

    setNotice("");
    setRemoved((current) => ({ ...current, [slot]: false }));
    setPreviews((current) => {
      const previewUrl = current[slot];
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      return { ...current, [slot]: URL.createObjectURL(file) };
    });
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(300px,420px)_minmax(0,1fr)]">
      <form action={formAction} className="grid gap-4 xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto xl:pr-2">
        <section className="grid gap-3 rounded-2xl border border-gold/30 bg-surface p-4">
          <h2 className="text-xs tracking-[0.18em] text-gold">CONTENIDO</h2>
          <LineField label="Nombre del negocio" name="businessName" value={theme.content.businessName} maxLength={80} onChange={(value) => patchContent("businessName", value)} />
          <LineField label="Eslogan" name="slogan" value={theme.content.slogan} maxLength={80} onChange={(value) => patchContent("slogan", value)} />
          <LineField label="Mensaje de bienvenida" name="welcomeMessage" value={theme.content.welcomeMessage} maxLength={240} multiline onChange={(value) => patchContent("welcomeMessage", value)} />
          <LineField label="Texto del encabezado" name="headerText" value={theme.content.headerText} maxLength={60} onChange={(value) => patchContent("headerText", value)} />
          <LineField label="Información de contacto" name="contact" value={theme.content.contact} maxLength={120} onChange={(value) => patchContent("contact", value)} />
          <LineField label="Horarios" name="hours" value={theme.content.hours} maxLength={180} multiline onChange={(value) => patchContent("hours", value)} />
          <LineField label="Dirección" name="address" value={theme.content.address} maxLength={180} multiline onChange={(value) => patchContent("address", value)} />
          <LineField label="Texto del botón de atención" name="attentionButton" value={theme.content.attentionButton} maxLength={60} onChange={(value) => patchContent("attentionButton", value)} />
        </section>

        <section className="grid gap-4 rounded-2xl border border-gold/30 bg-surface p-4">
          <h2 className="text-xs tracking-[0.18em] text-gold">IMÁGENES</h2>
          <p className="text-sm leading-6 text-foreground/70">JPG, PNG o WebP. Máximo 5 MB. En el menú se sirven optimizadas.</p>
          {IMAGE_SLOTS.map((field) => (
            <ImageSlot
              key={field.slot}
              slot={field.slot}
              label={field.label}
              uploadKey={0}
              storedUrl={theme.images[field.key]}
              removed={removed[field.slot]}
              onFile={(file) => chooseFile(field.slot, file)}
              onRemove={(checked) => {
                setRemoved((current) => ({ ...current, [field.slot]: checked }));
                if (checked) {
                  setPreviews((current) => {
                    const previewUrl = current[field.slot];
                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                    const next = { ...current };
                    delete next[field.slot];
                    return next;
                  });
                }
              }}
            />
          ))}
        </section>

        <section className="grid gap-3 rounded-2xl border border-gold/30 bg-surface p-4">
          <h2 className="text-xs tracking-[0.18em] text-gold">COLORES</h2>
          <ColorField label="Color de fondo" name="background" value={theme.colors.background} onChange={(value) => patchColor("background", value)} />
          <ColorField label="Color principal" name="primary" value={theme.colors.primary} onChange={(value) => patchColor("primary", value)} />
          <ColorField label="Color secundario" name="secondary" value={theme.colors.secondary} onChange={(value) => patchColor("secondary", value)} />
          <ColorField label="Color de botones" name="button" value={theme.colors.button} onChange={(value) => patchColor("button", value)} />
          <ColorField label="Color de textos" name="text" value={theme.colors.text} onChange={(value) => patchColor("text", value)} />
        </section>

        <section className="grid gap-3 rounded-2xl border border-gold/30 bg-surface p-4">
          <h2 className="text-xs tracking-[0.18em] text-gold">TIPOGRAFÍA Y FORMA</h2>
          <ChoiceField label="Tipografía" name="font" value={theme.typography.font} options={FONT_OPTIONS} onChange={(value) => patchTypography("font", value)} />
          <ChoiceField label="Tamaño de títulos" name="titleSize" value={theme.typography.titleSize} options={TITLE_OPTIONS} onChange={(value) => patchTypography("titleSize", value)} />
          <ChoiceField label="Bordes" name="border" value={theme.shape.border} options={BORDER_OPTIONS} onChange={(value) => patchShape("border", value)} />
          <ChoiceField label="Sombras" name="shadow" value={theme.shape.shadow} options={SHADOW_OPTIONS} onChange={(value) => patchShape("shadow", value)} />
          <ChoiceField label="Estilo de tarjetas" name="cardStyle" value={theme.shape.cardStyle} options={CARD_OPTIONS} onChange={(value) => patchShape("cardStyle", value)} />
          <ChoiceField label="Radio de bordes" name="radius" value={theme.shape.radius} options={RADIUS_OPTIONS} onChange={(value) => patchShape("radius", value)} />
          <ChoiceField label="Espaciados" name="spacing" value={theme.shape.spacing} options={SPACING_OPTIONS} onChange={(value) => patchShape("spacing", value)} />
        </section>

        <section className="grid gap-3 rounded-2xl border border-gold/30 bg-surface p-4">
          <h2 className="text-xs tracking-[0.18em] text-gold">PUBLICACIÓN</h2>
          <label className="flex items-start gap-3 text-sm leading-6">
            <input
              type="checkbox"
              name="publish_immediately"
              checked={immediate}
              onChange={(event) => setImmediate(event.target.checked)}
              className="mt-1"
            />
            <span>Publicar de inmediato al guardar el borrador.</span>
          </label>
          <p className="text-sm leading-6 text-foreground/70">
            {dirty
              ? "Hay cambios que todavía no están en el menú QR."
              : "El borrador coincide con lo que ve el cliente."}
          </p>
          {notice ? <p className="text-sm text-gold-light">{notice}</p> : null}
          <Status state={state} />
          <EditorActions hasPrevious={hasPrevious} />
        </section>
      </form>

      <aside className="xl:sticky xl:top-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs tracking-[0.18em] text-gold">VISTA PREVIA</p>
          <div className="flex gap-2">
            <button type="button" className={device === "phone" ? "rounded-full bg-gold px-3 py-1 text-sm text-black" : "rounded-full border border-gold/40 px-3 py-1 text-sm text-gold"} onClick={() => setDevice("phone")}>
              Celular
            </button>
            <button type="button" className={device === "desktop" ? "rounded-full bg-gold px-3 py-1 text-sm text-black" : "rounded-full border border-gold/40 px-3 py-1 text-sm text-gold"} onClick={() => setDevice("desktop")}>
              Escritorio
            </button>
          </div>
        </div>
        <div className={device === "phone" ? "mx-auto w-[390px] max-w-full" : "w-full"}>
          <div className="max-h-[760px] overflow-y-auto rounded-[1.6rem] border border-gold/30">
            <PublicMenuView
              theme={previewTheme}
              sections={sections}
              table={{ status: "none" }}
              menuAvailable={menuAvailable}
              mode="preview"
            />
          </div>
        </div>
      </aside>
    </div>
  );

  function patchContent(key: keyof MenuTheme["content"], value: string) {
    setTheme((current) => ({ ...current, content: { ...current.content, [key]: value } }));
  }

  function patchColor(key: keyof MenuTheme["colors"], value: string) {
    setTheme((current) => ({ ...current, colors: { ...current.colors, [key]: value } }));
  }

  function patchTypography<Key extends keyof MenuTheme["typography"]>(
    key: Key,
    value: MenuTheme["typography"][Key],
  ) {
    setTheme((current) => ({ ...current, typography: { ...current.typography, [key]: value } }));
  }

  function patchShape<Key extends keyof MenuTheme["shape"]>(key: Key, value: MenuTheme["shape"][Key]) {
    setTheme((current) => ({ ...current, shape: { ...current.shape, [key]: value } }));
  }
}

function imagePreview(
  slot: (typeof IMAGE_SLOTS)[number]["slot"],
  theme: MenuTheme,
  previews: PreviewMap,
  removed: typeof emptyRemoved,
) {
  const preview = previews[slot];
  if (preview) return preview;
  if (removed[slot]) return null;
  const field = IMAGE_SLOTS.find((item) => item.slot === slot);
  return field ? theme.images[field.key] : null;
}

function EditorActions({ hasPrevious }: { hasPrevious: boolean }) {
  const { pending } = useFormStatus();

  return (
    <div className="flex flex-wrap gap-2">
      <button type="submit" name="intent" value="draft" disabled={pending} className="rounded-full border border-gold/40 px-4 py-2 text-sm text-gold-light disabled:opacity-60">
        {pending ? "Guardando..." : "Guardar borrador"}
      </button>
      <button type="submit" name="intent" value="publish" disabled={pending} className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
        {pending ? "Guardando..." : "Publicar cambios"}
      </button>
      <button
        type="submit"
        name="intent" 
        value="restore"
        disabled={pending || !hasPrevious}
        className="rounded-full border border-gold/40 px-4 py-2 text-sm text-gold-light disabled:opacity-60"
        onClick={(event) => {
          if (!window.confirm("Esto vuelve a publicar la configuración anterior y reemplaza el borrador.")) {
            event.preventDefault();
          }
        }}
      >
        Restaurar configuración anterior
      </button>
    </div>
  );
}

function Status({ state }: { state: ActionState }) {
  if (!state.message) return null;

  return (
    <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "text-sm text-gold-light" : "text-sm text-gold"}>
      {state.message}
    </p>
  );
}

function LineField({
  label,
  name,
  value,
  maxLength,
  multiline = false,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  maxLength: number;
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span>{label}</span>
      {multiline ? (
        <textarea name={name} value={value} maxLength={maxLength} rows={3} className={control} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input name={name} value={value} maxLength={maxLength} className={control} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function ChoiceField<T extends string>({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string;
  name: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span>{label}</span>
      <select name={name} value={value} className={control} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ColorField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span>{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="color"
          name={name}
          value={value}
          aria-label={label}
          className="h-10 w-12 bg-transparent"
          onChange={(event) => onChange(event.target.value.toLowerCase())}
        />
        <input
          key={value}
          defaultValue={value}
          maxLength={7}
          spellCheck={false}
          aria-label={`${label} en hexadecimal`}
          className={control}
          onChange={(event) => {
            const next = event.target.value;
            if (/^#[0-9a-fA-F]{6}$/.test(next)) onChange(next.toLowerCase());
          }}
          onBlur={(event) => {
            event.target.value = value;
          }}
        />
      </span>
    </label>
  );
}

function ImageSlot({
  slot,
  label,
  uploadKey,
  storedUrl,
  removed,
  onFile,
  onRemove,
}: {
  slot: (typeof IMAGE_SLOTS)[number]["slot"];
  label: string;
  uploadKey: number;
  storedUrl: string | null;
  removed: boolean;
  onFile: (file: File | undefined) => void;
  onRemove: (checked: boolean) => void;
}) {
  return (
    <div className="grid gap-2">
      <span className="text-sm">{label}</span>
      <input
        key={`${slot}-${uploadKey}`}
        type="file"
        name={slot}
        accept="image/jpeg,image/png,image/webp"
        className="text-sm text-foreground/80"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const valid =
            file.size <= 5 * 1024 * 1024 &&
            ["image/jpeg", "image/png", "image/webp"].includes(file.type);
          if (!valid) event.target.value = "";
          onFile(valid ? file : undefined);
        }}
      />
      <input type="hidden" name={`${slot}Url`} value={storedUrl ?? ""} />
      {storedUrl ? (
        <label className="flex items-center gap-2 text-sm text-foreground/80">
          <input
            type="checkbox"
            name={`remove_${slot}`}
            checked={removed}
            onChange={(event) => onRemove(event.target.checked)}
          />
          Quitar imagen actual
        </label>
      ) : null}
    </div>
  );
}
