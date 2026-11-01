import { isPermission, readPermissionList, type Permission } from "@/lib/auth/permissions";
import { isMissingSchema } from "@/lib/admin/validation";
import { createClient } from "@/lib/supabase/server";

export type OwnerAccess =
  | { kind: "anonymous" }
  | { kind: "schema" }
  | { kind: "forbidden"; email: string }
  | { kind: "owner"; userId: string; email: string; name: string };

export type AccessContext =
  | { kind: "anonymous" }
  | { kind: "schema" }
  | { kind: "revoked"; email: string }
  | { kind: "forbidden"; email: string }
  | { kind: "owner"; userId: string; email: string; name: string }
  | {
      kind: "collaborator";
      userId: string;
      email: string;
      name: string;
      permissions: Permission[];
    };

export async function getAccessContext(): Promise<AccessContext> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) return { kind: "anonymous" };

  const profile = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", data.user.id)
    .maybeSingle();

  if (isMissingSchema(profile.error)) return { kind: "schema" };

  const access = await supabase.rpc("my_access");

  if (isMissingSchema(access.error)) {
    if (profile.data?.role === "owner") {
      return identity("owner", data.user.id, data.user.email, profile.data);
    }

    return { kind: "forbidden", email: data.user.email ?? "" };
  }

  const kind = access.data?.kind;

  if (kind === "owner") {
    return identity("owner", data.user.id, data.user.email, profile.data);
  }

  if (kind === "revoked") {
    return { kind: "revoked", email: data.user.email ?? profile.data?.email ?? "" };
  }

  if (kind === "collaborator") {
    const permissions = readPermissionList(
      Array.isArray(access.data.permissions) ? access.data.permissions.filter(isString) : [],
    );

    return {
      kind: "collaborator",
      userId: data.user.id,
      email: data.user.email || profile.data?.email || "",
      name: profile.data?.full_name ?? "",
      permissions,
    };
  }

  return { kind: "forbidden", email: data.user.email ?? "" };
}

export async function getOwnerContext(): Promise<OwnerAccess> {
  const access = await getAccessContext();

  if (access.kind === "owner" || access.kind === "anonymous" || access.kind === "schema") {
    return access;
  }

  return { kind: "forbidden", email: access.email };
}

export async function assertOwner() {
  const access = await getAccessContext();
  return access.kind === "owner" ? access : null;
}

export async function assertPermission(permission: Permission) {
  const access = await getAccessContext();
  if (access.kind === "owner") return access;
  if (access.kind === "collaborator" && access.permissions.includes(permission)) return access;
  return null;
}

export function can(
  access: AccessContext,
  permission: Permission | "owner" | readonly Permission[],
) {
  if (access.kind === "owner") return true;
  if (access.kind !== "collaborator" || permission === "owner") return false;
  const required = Array.isArray(permission) ? permission : [permission];
  return required.some((item) => access.permissions.includes(item));
}

export async function allowedPage(permission: Permission | "owner" | readonly Permission[]) {
  const access = await getAccessContext();
  if (access.kind === "schema") return "schema" as const;
  return can(access, permission) ? ("yes" as const) : ("no" as const);
}

export async function installationStatus(): Promise<boolean | "missing"> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("installation_status");
  if (isMissingSchema(error)) return "missing";
  if (error) return "missing";
  return data === true;
}

function identity(
  kind: "owner",
  userId: string,
  email: string | undefined,
  profile: { full_name?: string | null; email?: string | null } | null,
): AccessContext {
  return {
    kind,
    userId,
    email: email || profile?.email || "",
    name: profile?.full_name ?? "",
  };
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isKnownPermission(value: string): value is Permission {
  return isPermission(value);
}
