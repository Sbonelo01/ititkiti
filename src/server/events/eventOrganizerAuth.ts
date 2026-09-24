import { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";
import { requireSession, SessionAuthResult } from "@/server/auth/sessionAuth";

export type EventOrganizerAuthResult =
  | { ok: true; user: User; eventId: string }
  | { ok: false; status: 401 | 403 | 404; error: string };

export async function requireEventOrganizer(
  authHeader: string | null,
  eventId: string
): Promise<EventOrganizerAuthResult> {
  const session: SessionAuthResult = await requireSession(authHeader);
  if (!session.ok) {
    return session;
  }

  const role = session.user.user_metadata?.role as string | undefined;
  if (role !== "organizer") {
    return { ok: false, status: 403, error: "Organizer access required" };
  }

  const supabase = getSupabaseAdmin();
  const { data: event, error } = await supabase
    .from("events")
    .select("id, organizer_id")
    .eq("id", eventId)
    .maybeSingle();

  if (error || !event) {
    return { ok: false, status: 404, error: "Event not found" };
  }

  if (event.organizer_id !== session.user.id) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, user: session.user, eventId };
}

export async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const normalized = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;

  while (page <= 50) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error || !data.users.length) {
      break;
    }

    const match = data.users.find((u) => u.email?.trim().toLowerCase() === normalized);
    if (match) {
      return match.id;
    }

    if (data.users.length < perPage) {
      break;
    }
    page += 1;
  }

  return null;
}
