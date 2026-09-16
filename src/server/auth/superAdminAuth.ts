import { getSupabaseAdmin } from "@/server/supabaseAdmin";
import { isSuperAdminEmail } from "@/utils/superAdmin";

export type SuperAdminAuthResult =
  | { ok: true; userId: string; email: string }
  | { ok: false; status: 401 | 403; error: string };

export async function requireSuperAdminAuth(
  accessToken: string | null | undefined
): Promise<SuperAdminAuthResult> {
  if (!accessToken) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const supabase = getSupabaseAdmin();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  if (!isSuperAdminEmail(user.email)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, userId: user.id, email: user.email as string };
}
