import { supabase } from "@/utils/supabaseClient";
import type { AssignableRole } from "@/utils/roles";

export type AdminUserView = {
  id: string;
  email: string;
  role: AssignableRole;
};

async function authHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }
  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

export async function searchAdminUsers(email: string): Promise<AdminUserView[]> {
  const params = new URLSearchParams({ email });
  const res = await fetch(`/api/admin/users?${params.toString()}`, {
    headers: await authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to search users");
  }
  return data.users as AdminUserView[];
}

export async function updateAdminUserRole(
  email: string,
  role: AssignableRole
): Promise<AdminUserView> {
  const res = await fetch("/api/admin/users", {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify({ email, role }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to update role");
  }
  return data.user as AdminUserView;
}
