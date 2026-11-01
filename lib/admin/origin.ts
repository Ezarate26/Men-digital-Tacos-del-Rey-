import { headers } from "next/headers";

export async function resolvePublicOrigin(configured: string | null | undefined) {
  const stored = configured?.trim().replace(/\/$/, "");
  if (stored) return stored;

  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";

  return host ? `${proto}://${host}` : "";
}
