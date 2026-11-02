"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { ThemeImage } from "@/components/menu/theme-image";
import { formatPrice } from "@/lib/menu/format";
import { isMenuImage } from "@/lib/menu/images";
import type { MenuProduct } from "@/lib/menu/types";

export function ProductCard({
  product,
  businessName,
  priority = false,
}: {
  product: MenuProduct;
  businessName: string;
  priority?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const cardRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => closeRef.current?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      cardRef.current?.focus();
    };
  }, [open]);

  const themeHost = open ? cardRef.current?.closest(".menu-theme") : null;

  return (
    <>
      <article
        ref={cardRef}
        className="menu-card menu-product"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <ProductFace product={product} businessName={businessName} priority={priority} />
      </article>

      {open
        ? createPortal(
            <div
              className="menu-theme menu-modal"
              data-card={themeHost instanceof HTMLElement ? themeHost.dataset.card : undefined}
              style={themeHost instanceof HTMLElement ? readTheme(themeHost) : undefined}
              onClick={() => setOpen(false)}
            >
              <article
                className="menu-card menu-modal-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  ref={closeRef}
                  type="button"
                  className="menu-modal-close"
                  aria-label="Cerrar"
                  onClick={() => setOpen(false)}
                >
                  <X aria-hidden="true" size={18} />
                </button>
                <ProductFace product={product} businessName={businessName} headingId={titleId} />
              </article>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function readTheme(host: HTMLElement) {
  const style = getComputedStyle(host);
  const theme: Record<string, string> = {};

  for (const name of [
    "--menu-background",
    "--menu-primary",
    "--menu-secondary",
    "--menu-button",
    "--menu-button-ink",
    "--menu-text",
    "--menu-surface",
    "--menu-font",
    "--menu-title-size",
    "--menu-radius",
    "--menu-border-width",
    "--menu-shadow",
    "--menu-gap",
    "--menu-pad",
  ]) {
    const value = style.getPropertyValue(name).trim();
    if (value) theme[name] = value;
  }

  return theme;
}

function ProductFace({
  product,
  businessName,
  priority = false,
  headingId,
}: {
  product: MenuProduct;
  businessName: string;
  priority?: boolean;
  headingId?: string;
}) {
  return (
    <>
      <div className="menu-card-media">
        {product.imageUrl && isMenuImage(product.imageUrl) ? (
          <div className={product.isAvailable ? "menu-photo" : "menu-photo menu-photo-off"}>
            <ThemeImage
              src={product.imageUrl}
              alt={product.name}
              frame
              priority={priority}
              sizes="(max-width: 768px) 100vw, 512px"
            />
          </div>
        ) : (
          <div className="menu-photo-fallback">{businessName}</div>
        )}

        <div className="menu-chips">
          <p className="menu-chip">{product.isAvailable ? "Disponible" : "No disponible"}</p>
          {product.isFeatured ? <p className="menu-chip-solid">Destacado</p> : null}
        </div>
      </div>

      <div className="menu-card-body">
        <div className="menu-product-row">
          <h3 id={headingId} className="menu-product-name">
            {product.name}
          </h3>
          <p className="menu-price">{formatPrice(product.priceCents)}</p>
        </div>
        {product.description ? <p className="menu-description">{product.description}</p> : null}
      </div>
    </>
  );
}
