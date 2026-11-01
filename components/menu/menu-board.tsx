"use client";

import { useState } from "react";
import { ProductCard } from "@/components/menu/product-card";
import type { MenuSection } from "@/lib/menu/types";

export function MenuBoard({ sections }: { sections: MenuSection[] }) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const active = sections.find((section) => section.id === activeId) ?? sections[0];

  if (!active) {
    return (
      <p className="px-5 py-16 text-center text-sm leading-6 text-foreground/75">
        El menú se está preparando. Vuelve a consultar en un momento.
      </p>
    );
  }

  return (
    <section>
      <div className="sticky top-0 z-10 border-y border-gold/25 bg-background/95 backdrop-blur-md">
        <div
          role="tablist"
          aria-label="Secciones del menú"
          className="menu-tabs mx-auto flex w-full max-w-lg gap-2 overflow-x-auto px-4 py-3 md:max-w-3xl"
        >
          {sections.map((section) => {
            const selected = section.id === active.id;

            return (
              <button
                key={section.id}
                type="button"
                role="tab"
                id={`tab-${section.id}`}
                aria-selected={selected}
                aria-controls={`panel-${section.id}`}
                onClick={() => setActiveId(section.id)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm tracking-wide whitespace-nowrap ${
                  selected
                    ? "border-gold bg-gold text-black"
                    : "border-gold/40 bg-transparent text-gold-light"
                }`}
              >
                {section.name}
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`panel-${active.id}`}
        aria-labelledby={`tab-${active.id}`}
        className="mx-auto w-full max-w-lg px-4 py-5 md:max-w-3xl"
      >
        {active.description ? (
          <p className="mb-4 text-center text-sm text-foreground/70">
            {active.description}
          </p>
        ) : null}

        {active.products.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gold/35 px-4 py-10 text-center text-sm leading-6 text-foreground/75">
            Esta sección todavía no tiene platillos publicados.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {active.products.map((product, index) => (
              <li key={product.id}>
                <ProductCard product={product} priority={index === 0} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
