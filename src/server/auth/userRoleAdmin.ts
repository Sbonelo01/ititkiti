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

const LIST_PAGE_SIZE = 200;
const LIST_MAX_PAGES = 5;

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

export async function findAuthUsersByEmail(emailQuery: string): Promise<User[]> {
  const q = emailQuery.trim().toLowerCase();
  if (q.length < 3) return [];

  const supabase = getSupabaseAdmin();
  const matches: User[] = [];

  for (let page = 1; page <= LIST_MAX_PAGES; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: LIST_PAGE_SIZE,
    });
    if (error) {
      throw error;
    }

    const users = data.users ?? [];
    matches.push(...matchUsersByEmail(users, q));

    if (q.includes("@") && matches.length > 0) {
      return matches;
    }
    if (users.length < LIST_PAGE_SIZE) {
      break;
    }
  }

  return matches;
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
