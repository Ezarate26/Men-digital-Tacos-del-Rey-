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
  return (
    <article className="menu-card">
      <div className="menu-card-media">
        {product.imageUrl && isMenuImage(product.imageUrl) ? (
          <div className={product.isAvailable ? "menu-photo" : "menu-photo menu-photo-off"}>
            <ThemeImage
              src={product.imageUrl}
              alt={product.name}
              frame
              priority={priority}
              sizes="(max-width: 768px) 100vw, 360px"
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
          <h3 className="menu-product-name">{product.name}</h3>
          <p className="menu-price">{formatPrice(product.priceCents)}</p>
        </div>
        {product.description ? <p className="menu-description">{product.description}</p> : null}
      </div>
    </article>
  );
}
