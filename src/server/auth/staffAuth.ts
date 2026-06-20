import { getSupabaseAdmin } from "@/server/supabaseAdmin";

export type StaffAuthResult =
  | { ok: true; userId: string; role: string }
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

  const role = user.user_metadata?.role as string | undefined;
  if (role !== "admin" && role !== "staff") {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  return { ok: true, userId: user.id, role };
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim() || null;
}
