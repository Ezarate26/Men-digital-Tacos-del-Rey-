import Image from "next/image";
import { isMenuImage } from "@/lib/menu/images";

export function ThemeImage({
  src,
  alt,
  frame = false,
  priority = false,
  sizes = "100vw",
}: {
  src: string | null;
  alt: string;
  frame?: boolean;
  priority?: boolean;
  sizes?: string;
}) {
  if (!src) return null;

  const preview = src.startsWith("blob:");
  if (!preview && !isMenuImage(src)) return null;

  if (preview) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={frame ? "menu-frame-image" : "menu-logo"} />
    );
  }

  if (frame) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        quality={75}
        className="object-cover"
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={160}
      height={64}
      quality={75}
      className="menu-logo"
    />
  );
}
