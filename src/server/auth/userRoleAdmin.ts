import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";
import {
  assignableRoleOf,
  roleUpdatePayload,
  type AssignableRole,
  type RoleMetadataSource,
} from "@/utils/roles";

export type AdminUserView = {
  id: string;
  email: string;
  role: AssignableRole;
};

export class AuthUserLookupUnavailableError extends Error {
  constructor() {
    super("Auth user lookup is not configured");
    this.name = "AuthUserLookupUnavailableError";
  }
}

export function toAdminUserView(
  user: { id: string; email?: string | null } & RoleMetadataSource
): AdminUserView {
  return {
    id: user.id,
    email: user.email ?? "",
    role: assignableRoleOf(user),
  };
}

export function matchUsersByEmail<T extends { email?: string | null }>(
  users: T[],
  query: string
): T[] {
  const q = query.trim().toLowerCase();
  if (q.length < 3) return [];
  if (q.includes("@")) {
    return users.filter((user) => (user.email ?? "").toLowerCase() === q);
  }
  return users.filter((user) => (user.email ?? "").toLowerCase().includes(q));
}

function isLookupMissing(error: { code?: string; message?: string }): boolean {
  const code = error.code ?? "";
  if (code === "PGRST202" || code === "42883") return true;
  const message = (error.message ?? "").toLowerCase();
  return message.includes("could not find the function") || message.includes("does not exist");
}

/**
 * Exact email lookup through service-role RPC. Does not page auth.admin.listUsers.
 * Partial queries return nothing. A missing function fails closed.
 */
export async function findAuthUsersByEmail(emailQuery: string): Promise<User[]> {
  const q = emailQuery.trim().toLowerCase();
  if (!q.includes("@") || q.length < 3) return [];

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("lookup_auth_user_by_email", { p_email: q });
  if (error) {
    if (isLookupMissing(error)) {
      throw new AuthUserLookupUnavailableError();
    }
    throw error;
  }
  if (!data || typeof data !== "object") return [];

  const row = data as {
    id?: unknown;
    email?: unknown;
    app_metadata?: User["app_metadata"];
    user_metadata?: User["user_metadata"];
  };
  if (typeof row.id !== "string" || typeof row.email !== "string") return [];
  if (row.email.trim().toLowerCase() !== q) return [];

  return [
    {
      id: row.id,
      email: row.email,
      app_metadata: row.app_metadata ?? {},
      user_metadata: row.user_metadata ?? {},
    } as User,
  ];
}

export async function updateAuthUserRole(
  userId: string,
  role: AssignableRole
): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.admin.updateUserById(
    userId,
    roleUpdatePayload(role)
  );
  if (error || !data.user) {
    return { ok: false, error: "Failed to update user role" };
  }
  return { ok: true, user: data.user };
}
