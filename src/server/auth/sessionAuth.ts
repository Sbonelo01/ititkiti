import { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";
import { extractBearerToken, requireStaffAuth } from "@/server/auth/staffAuth";

export type SessionAuthResult =
  | { ok: true; user: User }
  | { ok: false; status: 401; error: string };

export async function requireSession(
  authHeader: string | null
): Promise<SessionAuthResult> {
  const token = extractBearerToken(authHeader);
  if (!token) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const supabase = getSupabaseAdmin();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  return { ok: true, user };
}

export type OrganizerAuthResult =
  | { ok: true; user: User }
  | { ok: false; status: 401 | 403; error: string };

export async function requireOrganizerAuth(
  authHeader: string | null
): Promise<OrganizerAuthResult> {
  const session = await requireSession(authHeader);
  if (!session.ok) {
    return session;
  }

  const role = session.user.user_metadata?.role as string | undefined;
  if (role !== "organizer") {
    return { ok: false, status: 403, error: "Organizer access required" };
  }

  return { ok: true, user: session.user };
}

export async function canAccessInvoice(
  authHeader: string | null,
  organizerId: string
): Promise<{ ok: true; user: User; isStaff: boolean } | { ok: false; status: number; error: string }> {
  const session = await requireSession(authHeader);
  if (!session.ok) {
    return session;
  }

  const staff = await requireStaffAuth(extractBearerToken(authHeader));
  if (staff.ok) {
    return { ok: true, user: session.user, isStaff: true };
  }

  if (session.user.id === organizerId) {
    const role = session.user.user_metadata?.role as string | undefined;
    if (role === "organizer") {
      return { ok: true, user: session.user, isStaff: false };
    }
  }

  return { ok: false, status: 403, error: "Forbidden" };
}
