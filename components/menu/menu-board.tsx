"use client";

import { useEffect, useRef, useState } from "react";
import { ProductCard } from "@/components/menu/product-card";
import type { MenuSection } from "@/lib/menu/types";

export function MenuBoard({
  sections,
  businessName,
}: {
  sections: MenuSection[];
  businessName: string;
}) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const tabsRef = useRef<HTMLDivElement>(null);
  const active = sections.find((section) => section.id === activeId) ?? sections[0];

  useEffect(() => {
    const list = tabsRef.current;
    const tab = list?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    if (!list || !tab || list.scrollWidth <= list.clientWidth + 1) return;

    const next = tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2;
    list.scrollTo({ left: Math.max(0, next), behavior: "smooth" });
  }, [active?.id]);

  if (!active) {
    return (
      <p className="menu-wrap menu-panel menu-note">
        El menú se está preparando. Vuelve a consultar en un momento.
      </p>
    );
  }

  return (
    <section>
      <div className="menu-tabbar">
        <div ref={tabsRef} role="tablist" aria-label="Secciones del menú" className="menu-tabs menu-wrap">
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
                className="menu-tab"
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
        className="menu-wrap menu-panel"
      >
        {active.description ? <p className="menu-section-copy">{active.description}</p> : null}

        {active.products.length === 0 ? (
          <p className="menu-empty">Esta sección todavía no tiene platillos publicados.</p>
        ) : (
          <ul className="menu-grid">
            {active.products.map((product, index) => (
              <li key={product.id}>
                <ProductCard
                  product={product}
                  businessName={businessName}
                  priority={index === 0}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
