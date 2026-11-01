import { createClient } from "@/lib/supabase/server";
import { isMissingSchema } from "@/lib/admin/validation";

export type OwnerAccess =
  | { kind: "anonymous" }
  | { kind: "schema" }
  | { kind: "forbidden"; email: string }
  | { kind: "owner"; userId: string; email: string; name: string };

export async function getOwnerContext(): Promise<OwnerAccess> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { kind: "anonymous" };
  }

  const profile = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", data.user.id)
    .maybeSingle();

  if (isMissingSchema(profile.error)) {
    return { kind: "schema" };
  }

  if (profile.error || profile.data?.role !== "owner") {
    return {
      kind: "forbidden",
      email: data.user.email ?? "",
    };
  }

  return {
    kind: "owner",
    userId: data.user.id,
    email: data.user.email || profile.data.email || "",
    name: profile.data.full_name,
  };
}

export async function assertOwner() {
  const access = await getOwnerContext();
  return access.kind === "owner" ? access : null;
}
