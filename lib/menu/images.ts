export function isMenuImage(src: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!base) {
    return false;
  }

  try {
    const image = new URL(src);
    const project = new URL(base);

    return (
      image.protocol === "https:" &&
      image.hostname === project.hostname &&
      image.pathname.startsWith("/storage/v1/object/public/")
    );
  } catch {
    return false;
  }
}
