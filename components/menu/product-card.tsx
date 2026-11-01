import Image from "next/image";
import { formatPrice } from "@/lib/menu/format";
import { isMenuImage } from "@/lib/menu/images";
import type { MenuProduct } from "@/lib/menu/types";

export function ProductCard({
  product,
  priority = false,
}: {
  product: MenuProduct;
  priority?: boolean;
}) {
  const imageUrl =
    product.imageUrl && isMenuImage(product.imageUrl) ? product.imageUrl : null;

  return (
    <article className="overflow-hidden rounded-2xl border border-gold/35 bg-surface shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
      <div className="relative aspect-[4/3] bg-black">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            priority={priority}
            sizes="(max-width: 768px) 100vw, 360px"
            className={`object-cover ${product.isAvailable ? "" : "grayscale"}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center border border-gold/20 bg-[radial-gradient(circle_at_center,#2a2418,transparent_70%)]">
            <span className="text-xs tracking-[0.35em] text-gold/80">
              TACOS DEL REY
            </span>
          </div>
        )}

        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          <p className="rounded-full border border-gold/50 bg-black/75 px-3 py-1 text-[11px] tracking-[0.16em] text-gold-light uppercase">
            {product.isAvailable ? "Disponible" : "No disponible"}
          </p>
          {product.isFeatured ? (
            <p className="rounded-full border border-gold bg-gold px-3 py-1 text-[11px] tracking-[0.16em] text-black uppercase">
              Destacado
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-xl leading-tight font-semibold tracking-wide">
            {product.name}
          </h3>
          <p className="shrink-0 text-lg font-semibold text-gold tabular-nums">
            {formatPrice(product.priceCents)}
          </p>
        </div>

        {product.description ? (
          <p className="line-clamp-3 text-sm leading-6 text-foreground/75">
            {product.description}
          </p>
        ) : null}
      </div>
    </article>
  );
}
