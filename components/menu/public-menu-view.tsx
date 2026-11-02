import type { CSSProperties } from "react";
import { MenuBoard } from "@/components/menu/menu-board";
import { ThemeImage } from "@/components/menu/theme-image";
import { themeStyle } from "@/lib/menu/theme";
import type { MenuTheme } from "@/lib/menu/theme";
import type { MenuSection, MenuTableState } from "@/lib/menu/types";

export function PublicMenuView({
  theme,
  sections,
  table,
  menuAvailable,
  mode,
}: {
  theme: MenuTheme;
  sections: MenuSection[];
  table: MenuTableState;
  menuAvailable: boolean;
  mode: "live" | "preview";
}) {
  const Root = mode === "live" ? "main" : "div";
  const hasProducts = sections.some((section) => section.products.length > 0);

  return (
    <Root
      className={`menu-theme${mode === "live" ? " menu-theme-live" : ""}`}
      style={themeStyle(theme) as CSSProperties}
      data-card={theme.shape.cardStyle}
    >
      <div className="menu-frame">
        {theme.images.coverUrl ? (
          <div className="menu-cover">
            <ThemeImage src={theme.images.coverUrl} alt="Portada" frame priority={mode === "live"} />
          </div>
        ) : null}

        <header className="menu-wrap menu-header">
          <ThemeImage src={theme.images.logoUrl} alt={theme.content.businessName} />
          {theme.content.headerText ? <p className="menu-kicker">{theme.content.headerText}</p> : null}
          <h1 className="menu-title">{theme.content.businessName}</h1>
          <hr className="menu-rule" />
          {theme.content.slogan ? <p className="menu-slogan">{theme.content.slogan}</p> : null}
          {theme.content.welcomeMessage ? (
            <p className="menu-welcome">{theme.content.welcomeMessage}</p>
          ) : null}
          <Meta theme={theme} />
          <TableNotice table={table} />
          {menuAvailable ? null : (
            <p className="menu-note">
              En este momento no estamos recibiendo órdenes. Puedes consultar la carta.
            </p>
          )}
        </header>

        {theme.images.bannerUrl ? (
          <div className="menu-banner">
            <ThemeImage src={theme.images.bannerUrl} alt="Banner" frame sizes="100vw" />
          </div>
        ) : null}

        {theme.images.heroUrl ? (
          <div className="menu-hero">
            <ThemeImage
              src={theme.images.heroUrl}
              alt="Imagen principal"
              frame
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
        ) : null}

        {mode === "preview" && !hasProducts ? (
          <div className="menu-wrap menu-panel">
            <article className="menu-card">
              <div className="menu-card-body">
                <h2 className="menu-product-name">Estilo de tarjeta</h2>
                <p className="menu-description">
                  Los platillos publicados usan este fondo, este borde, esta sombra y este radio.
                </p>
              </div>
            </article>
          </div>
        ) : null}

        <MenuBoard sections={sections} businessName={theme.content.businessName} />
      </div>
    </Root>
  );
}

function Meta({ theme }: { theme: MenuTheme }) {
  const lines = [theme.content.address, theme.content.hours, theme.content.contact].filter(Boolean);
  if (lines.length === 0) return null;

  return (
    <ul className="menu-meta">
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}

function TableNotice({ table }: { table: MenuTableState }) {
  if (table.status === "active") {
    return <p className="menu-table">{table.label}</p>;
  }

  if (table.status === "invalid") {
    return (
      <p className="menu-note">
        No reconocemos esta mesa. Puedes ver la carta.
      </p>
    );
  }

  return (
    <p className="menu-note">
      Estás viendo el menú general.
    </p>
  );
}
