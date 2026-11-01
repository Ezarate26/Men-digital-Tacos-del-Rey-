const NEXT_PATHS = new Set([
  "/admin",
  "/setup/complete",
  "/auth/accept-invitation",
  "/auth/reset-password",
]);

export function safeNextPath(value: string | null) {
  if (!value || !NEXT_PATHS.has(value)) return "/admin";
  return value;
}
