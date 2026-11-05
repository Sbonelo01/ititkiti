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
