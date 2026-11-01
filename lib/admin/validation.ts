import { isTableCode } from "@/lib/menu/table-code";
import type { AppRole } from "@/lib/admin/types";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ROLES = new Set<AppRole>(["owner", "admin", "manager", "waiter"]);

export function isUuid(value: string) {
  return UUID.test(value);
}

export function readText(value: FormDataEntryValue | null, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export function pesosToCents(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;

  const normalized = value.trim().replace(",", ".");

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;

  const [whole, fraction = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));

  if (!Number.isInteger(cents) || cents < 0 || cents > 10_000_000) return null;

  return cents;
}

export function centsToPriceInput(cents: number) {
  const pesos = cents / 100;
  return Number.isInteger(pesos) ? String(pesos) : pesos.toFixed(2);
}

export function readSortOrder(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 10_000) return null;
  return parsed;
}

export function readChecked(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

export function readRole(value: FormDataEntryValue | null): AppRole | null {
  if (typeof value !== "string" || !ROLES.has(value as AppRole)) return null;
  return value as AppRole;
}

export function slugify(name: string) {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || "seccion";
}

export function normalizeWhatsapp(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  if (!/^[0-9]{10,15}$/.test(digits)) return null;
  return digits;
}

export function normalizeSiteUrl(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") return "";

  try {
    const url = new URL(value.trim());
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";

    if (url.protocol === "https:" || (url.protocol === "http:" && local)) {
      return url.origin;
    }
  } catch {
    return null;
  }

  return null;
}

export function readTableCodeInput(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const code = value.trim();
  return isTableCode(code) ? code : null;
}

export function databaseMessage(error: { code?: string; message?: string }) {
  if (error.code === "23505") return "Ese dato ya está registrado.";
  if (error.code === "23503") return "No se puede completar porque todavía hay datos relacionados.";
  if (error.code === "23514") return "Hay un dato fuera de las reglas permitidas.";
  if (error.code === "42501" || error.message?.includes("forbidden")) {
    return "No tienes permiso para esta operación.";
  }
  if (error.message?.includes("last_owner") || error.message?.includes("owner_protected")) {
    return "El propietario principal no se puede cambiar desde aquí.";
  }
  if (error.message?.includes("owner_exists")) {
    return "Ya existe un propietario. Esta cuenta no recibió la propiedad.";
  }
  if (error.message?.includes("email_not_confirmed")) {
    return "Confirma el correo antes de activar la cuenta.";
  }
  if (error.message?.includes("invitation_expired")) {
    return "La invitación venció. El propietario debe enviar otra.";
  }
  if (error.message?.includes("invitation_missing")) {
    return "No hay una invitación vigente para este correo.";
  }
  if (error.message?.includes("invitation_pending")) {
    return "Ya hay una invitación pendiente para ese correo.";
  }
  if (error.message?.includes("already_member")) {
    return "Esa persona ya tiene acceso.";
  }
  if (error.message?.includes("invite_self")) {
    return "No puedes invitarte a ti mismo.";
  }
  if (error.message?.includes("invalid_permissions")) {
    return "Hay un permiso que no se puede asignar.";
  }
  if (error.message?.includes("not_collaborator")) {
    return "Esa cuenta no es de un colaborador.";
  }
  if (error.code === "PGRST205" || error.code === "PGRST202" || error.code === "PGRST204") {
    return "Falta aplicar las migraciones en Supabase.";
  }

  return "No se pudo guardar el cambio.";
}

export function isMissingSchema(error: { code?: string } | null | undefined) {
  return error?.code === "PGRST205" || error?.code === "PGRST202" || error?.code === "PGRST204";
}
