import { isMenuImage } from "@/lib/menu/images";

export const CURRENT_BUSINESS_SLUG = "tacos-del-rey";

export const FONT_OPTIONS = [
  { value: "classic", label: "Clásica" },
  { value: "modern", label: "Moderna" },
  { value: "neutral", label: "Neutra" },
  { value: "rounded", label: "Redondeada" },
  { value: "condensed", label: "Condensada" },
] as const;

export const TITLE_OPTIONS = [
  { value: "sm", label: "Pequeño" },
  { value: "md", label: "Mediano" },
  { value: "lg", label: "Grande" },
  { value: "xl", label: "Muy grande" },
] as const;

export const RADIUS_OPTIONS = [
  { value: "none", label: "Recto" },
  { value: "sm", label: "Suave" },
  { value: "md", label: "Redondeado" },
  { value: "lg", label: "Amplio" },
  { value: "pill", label: "Cápsula" },
] as const;

export const BORDER_OPTIONS = [
  { value: "none", label: "Sin borde" },
  { value: "thin", label: "Fino" },
  { value: "thick", label: "Grueso" },
] as const;

export const SHADOW_OPTIONS = [
  { value: "none", label: "Sin sombra" },
  { value: "soft", label: "Suave" },
  { value: "strong", label: "Marcada" },
] as const;

export const CARD_OPTIONS = [
  { value: "flat", label: "Plana" },
  { value: "outlined", label: "Con borde" },
  { value: "elevated", label: "Elevada" },
  { value: "filled", label: "Relleno" },
] as const;

export const SPACING_OPTIONS = [
  { value: "compact", label: "Compacto" },
  { value: "regular", label: "Regular" },
  { value: "relaxed", label: "Amplio" },
] as const;

export const IMAGE_SLOTS = [
  { slot: "logo", label: "Logotipo", key: "logoUrl" },
  { slot: "hero", label: "Imagen principal", key: "heroUrl" },
  { slot: "banner", label: "Banner", key: "bannerUrl" },
  { slot: "cover", label: "Imagen de portada", key: "coverUrl" },
] as const;

type FontId = (typeof FONT_OPTIONS)[number]["value"];
type TitleSize = (typeof TITLE_OPTIONS)[number]["value"];
type Radius = (typeof RADIUS_OPTIONS)[number]["value"];
type Border = (typeof BORDER_OPTIONS)[number]["value"];
type Shadow = (typeof SHADOW_OPTIONS)[number]["value"];
type CardStyle = (typeof CARD_OPTIONS)[number]["value"];
type Spacing = (typeof SPACING_OPTIONS)[number]["value"];

export type MenuTheme = {
  content: {
    businessName: string;
    slogan: string;
    welcomeMessage: string;
    headerText: string;
    contact: string;
    hours: string;
    address: string;
    attentionButton: string;
  };
  images: {
    logoUrl: string | null;
    heroUrl: string | null;
    bannerUrl: string | null;
    coverUrl: string | null;
  };
  colors: {
    background: string;
    primary: string;
    secondary: string;
    button: string;
    text: string;
  };
  typography: {
    font: FontId;
    titleSize: TitleSize;
  };
  shape: {
    radius: Radius;
    border: Border;
    shadow: Shadow;
    cardStyle: CardStyle;
    spacing: Spacing;
  };
};

const FONT_STACKS: Record<FontId, string> = {
  classic: 'Georgia, "Times New Roman", serif',
  modern: 'system-ui, "Segoe UI", sans-serif',
  neutral: "Arial, Helvetica, sans-serif",
  rounded: '"Trebuchet MS", "Segoe UI", sans-serif',
  condensed: '"Arial Narrow", "Franklin Gothic Medium", sans-serif',
};

const TITLE_SIZES: Record<TitleSize, string> = {
  sm: "1.5rem",
  md: "1.875rem",
  lg: "2.25rem",
  xl: "3rem",
};

const RADII: Record<Radius, string> = {
  none: "0px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  pill: "999px",
};

const BORDERS: Record<Border, string> = {
  none: "0px",
  thin: "1px",
  thick: "2px",
};

const SHADOWS: Record<Shadow, string> = {
  none: "none",
  soft: "0 8px 24px rgba(0, 0, 0, 0.16)",
  strong: "0 16px 40px rgba(0, 0, 0, 0.28)",
};

const SPACING_GAP: Record<Spacing, string> = {
  compact: "0.75rem",
  regular: "1.25rem",
  relaxed: "2rem",
};

const SPACING_PAD: Record<Spacing, string> = {
  compact: "0.75rem",
  regular: "1rem",
  relaxed: "1.5rem",
};

const HEX = /^#[0-9a-f]{6}$/;

export function defaultTheme(): MenuTheme {
  return {
    content: {
      businessName: "Tacos del Rey",
      slogan: "",
      welcomeMessage: "",
      headerText: "Taquería",
      contact: "",
      hours: "",
      address: "",
      attentionButton: "ESTOY LISTO PARA ORDENAR",
    },
    images: {
      logoUrl: null,
      heroUrl: null,
      bannerUrl: null,
      coverUrl: null,
    },
    colors: {
      background: "#101010",
      primary: "#c9a45c",
      secondary: "#e4c783",
      button: "#c9a45c",
      text: "#f5f0e6",
    },
    typography: {
      font: "neutral",
      titleSize: "md",
    },
    shape: {
      radius: "md",
      border: "thin",
      shadow: "strong",
      cardStyle: "elevated",
      spacing: "regular",
    },
  };
}

export function themeFromLegacyBrand(brand: {
  name?: string | null;
  eyebrow?: string | null;
  logoUrl?: string | null;
}) {
  const theme = defaultTheme();
  const name = brand.name?.trim();
  const eyebrow = brand.eyebrow?.trim();

  if (name) theme.content.businessName = name.slice(0, 80);
  if (eyebrow) theme.content.headerText = eyebrow.slice(0, 60);
  if (brand.logoUrl && isMenuImage(brand.logoUrl)) theme.images.logoUrl = brand.logoUrl;

  return theme;
}

export function coerceTheme(input: unknown): MenuTheme {
  const theme = defaultTheme();
  const record = asRecord(input);
  if (!record) return theme;

  const content = asRecord(record.content);
  const images = asRecord(record.images);
  const colors = asRecord(record.colors);
  const typography = asRecord(record.typography);
  const shape = asRecord(record.shape);

  theme.content.businessName = text(content?.businessName, 80) || theme.content.businessName;
  theme.content.slogan = text(content?.slogan, 80);
  theme.content.welcomeMessage = text(content?.welcomeMessage, 240);
  theme.content.headerText = text(content?.headerText, 60);
  theme.content.contact = text(content?.contact, 120);
  theme.content.hours = text(content?.hours, 180);
  theme.content.address = text(content?.address, 180);
  theme.content.attentionButton =
    text(content?.attentionButton, 60) || theme.content.attentionButton;

  theme.images.logoUrl = imageUrl(images?.logoUrl);
  theme.images.heroUrl = imageUrl(images?.heroUrl);
  theme.images.bannerUrl = imageUrl(images?.bannerUrl);
  theme.images.coverUrl = imageUrl(images?.coverUrl);

  theme.colors.background = hex(colors?.background) ?? theme.colors.background;
  theme.colors.primary = hex(colors?.primary) ?? theme.colors.primary;
  theme.colors.secondary = hex(colors?.secondary) ?? theme.colors.secondary;
  theme.colors.button = hex(colors?.button) ?? theme.colors.button;
  theme.colors.text = hex(colors?.text) ?? theme.colors.text;

  theme.typography.font = choice(typography?.font, FONT_OPTIONS, theme.typography.font);
  theme.typography.titleSize = choice(typography?.titleSize, TITLE_OPTIONS, theme.typography.titleSize);
  theme.shape.radius = choice(shape?.radius, RADIUS_OPTIONS, theme.shape.radius);
  theme.shape.border = choice(shape?.border, BORDER_OPTIONS, theme.shape.border);
  theme.shape.shadow = choice(shape?.shadow, SHADOW_OPTIONS, theme.shape.shadow);
  theme.shape.cardStyle = choice(shape?.cardStyle, CARD_OPTIONS, theme.shape.cardStyle);
  theme.shape.spacing = choice(shape?.spacing, SPACING_OPTIONS, theme.shape.spacing);

  return theme;
}

export function parseThemeFields(fields: {
  content: Record<string, string>;
  colors: Record<string, string>;
  typography: Record<string, string>;
  shape: Record<string, string>;
  images: MenuTheme["images"];
}): { ok: true; theme: MenuTheme } | { ok: false; message: string } {
  if (!fields.content.businessName.trim()) {
    return { ok: false, message: "El nombre del negocio es obligatorio." };
  }

  if (!fields.content.attentionButton.trim()) {
    return { ok: false, message: "El texto del botón de atención es obligatorio." };
  }

  const colorLabels: Record<string, string> = {
    background: "de fondo",
    primary: "principal",
    secondary: "secundario",
    button: "de botones",
    text: "de textos",
  };

  for (const [name, value] of Object.entries(fields.colors)) {
    if (!hex(value)) {
      return { ok: false, message: `El color ${colorLabels[name] ?? "elegido"} no es válido.` };
    }
  }

  if (!includes(fields.typography.font, FONT_OPTIONS)) {
    return { ok: false, message: "Elige una tipografía de la lista." };
  }

  if (!includes(fields.typography.titleSize, TITLE_OPTIONS)) {
    return { ok: false, message: "Elige un tamaño de título de la lista." };
  }

  if (!includes(fields.shape.radius, RADIUS_OPTIONS)) {
    return { ok: false, message: "Elige un radio de bordes de la lista." };
  }

  if (!includes(fields.shape.border, BORDER_OPTIONS)) {
    return { ok: false, message: "Elige un borde de la lista." };
  }

  if (!includes(fields.shape.shadow, SHADOW_OPTIONS)) {
    return { ok: false, message: "Elige una sombra de la lista." };
  }

  if (!includes(fields.shape.cardStyle, CARD_OPTIONS)) {
    return { ok: false, message: "Elige un estilo de tarjeta de la lista." };
  }

  if (!includes(fields.shape.spacing, SPACING_OPTIONS)) {
    return { ok: false, message: "Elige un espaciado de la lista." };
  }

  return { ok: true, theme: coerceTheme(fields) };
}

export function themeImageUrls(theme: MenuTheme) {
  return Object.values(theme.images).filter((url): url is string => Boolean(url));
}

export function themeStyle(theme: MenuTheme): Record<string, string> {
  return {
    "--menu-background": theme.colors.background,
    "--menu-primary": theme.colors.primary,
    "--menu-secondary": theme.colors.secondary,
    "--menu-button": theme.colors.button,
    "--menu-button-ink": inkFor(theme.colors.button),
    "--menu-text": theme.colors.text,
    "--menu-surface": surfaceFor(theme.colors.background),
    "--menu-font": FONT_STACKS[theme.typography.font],
    "--menu-title-size": TITLE_SIZES[theme.typography.titleSize],
    "--menu-radius": RADII[theme.shape.radius],
    "--menu-border-width": BORDERS[theme.shape.border],
    "--menu-shadow": SHADOWS[theme.shape.shadow],
    "--menu-gap": SPACING_GAP[theme.shape.spacing],
    "--menu-pad": SPACING_PAD[theme.shape.spacing],
  };
}

export function inkFor(hexColor: string) {
  return luminance(hexColor) > 0.45 ? "#101010" : "#f5f0e6";
}

function surfaceFor(background: string) {
  return luminance(background) > 0.55 ? mix(background, "#101010", 0.06) : mix(background, "#ffffff", 0.08);
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function text(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function hex(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return HEX.test(normalized) ? normalized : null;
}

function imageUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && isMenuImage(trimmed) ? trimmed : null;
}

function choice<T extends string>(
  value: unknown,
  options: readonly { value: T }[],
  fallback: T,
) {
  return includes(value, options) ? value : fallback;
}

function includes<T extends string>(value: unknown, options: readonly { value: T }[]): value is T {
  return typeof value === "string" && options.some((option) => option.value === value);
}

function luminance(hexColor: string) {
  const red = channel(hexColor, 1);
  const green = channel(hexColor, 3);
  const blue = channel(hexColor, 5);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function channel(hexColor: string, index: number) {
  const value = Number.parseInt(hexColor.slice(index, index + 2), 16) / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function mix(base: string, target: string, amount: number) {
  const mixChannel = (index: number) => {
    const from = Number.parseInt(base.slice(index, index + 2), 16);
    const to = Number.parseInt(target.slice(index, index + 2), 16);
    return Math.round(from + (to - from) * amount)
      .toString(16)
      .padStart(2, "0");
  };

  return `#${mixChannel(1)}${mixChannel(3)}${mixChannel(5)}`;
}
