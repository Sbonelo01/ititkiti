import { getSupabaseAdmin } from "@/server/supabaseAdmin";
import { getPrivilegedRole, type PrivilegedRole } from "@/utils/roles";

export type StaffAuthResult =
  | { ok: true; userId: string; role: PrivilegedRole }
  | { ok: false; status: 401; error: string };

export async function requireStaffAuth(accessToken: string | null | undefined): Promise<StaffAuthResult> {
  if (!accessToken) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const supabase = getSupabaseAdmin();
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const role = getPrivilegedRole(user);
  if (!role) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  return { ok: true, userId: user.id, role };
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim() || null;
}
