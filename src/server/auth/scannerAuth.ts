import { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";

export function normalizeScannerEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isPlatformScannerRole(role: string | undefined): boolean {
  return role === "admin" || role === "staff";
}

export async function linkPendingScannerMemberships(
  userId: string,
  email: string | undefined
): Promise<void> {
  if (!email?.trim()) return;

  const supabase = getSupabaseAdmin();
  const normalized = normalizeScannerEmail(email);

  await supabase
    .from("event_scanner_members")
    .update({ user_id: userId })
    .is("user_id", null)
    .eq("invited_email", normalized)
    .is("revoked_at", null);
}

export async function canScanEvent(user: User, eventId: string): Promise<boolean> {
  const role = user.user_metadata?.role as string | undefined;

  if (isPlatformScannerRole(role)) {
    return true;
  }

  const supabase = getSupabaseAdmin();

  if (role === "organizer") {
    const { data: event } = await supabase
      .from("events")
      .select("organizer_id")
      .eq("id", eventId)
      .maybeSingle();

    if (event?.organizer_id === user.id) {
      return true;
    }
  }

  const { data: byUser } = await supabase
    .from("event_scanner_members")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .maybeSingle();

  if (byUser) {
    return true;
  }

  const email = user.email ? normalizeScannerEmail(user.email) : null;
  if (!email) {
    return false;
  }

  const { data: byEmail } = await supabase
    .from("event_scanner_members")
    .select("id")
    .eq("event_id", eventId)
    .eq("invited_email", email)
    .is("user_id", null)
    .is("revoked_at", null)
    .maybeSingle();

  return Boolean(byEmail);
}

export async function requireScannerAppAccess(user: User): Promise<boolean> {
  const role = user.user_metadata?.role as string | undefined;

  if (isPlatformScannerRole(role) || role === "organizer") {
    return true;
  }

  const supabase = getSupabaseAdmin();

  const { data: byUser } = await supabase
    .from("event_scanner_members")
    .select("id")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();

  if (byUser) {
    return true;
  }

  const email = user.email ? normalizeScannerEmail(user.email) : null;
  if (!email) {
    return false;
  }

  const { data: byEmail } = await supabase
    .from("event_scanner_members")
    .select("id")
    .eq("invited_email", email)
    .is("user_id", null)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();

  return Boolean(byEmail);
}

export interface ScannerEventSummary {
  id: string;
  title: string;
}

export async function listScannerEventsForUser(user: User): Promise<ScannerEventSummary[]> {
  const role = user.user_metadata?.role as string | undefined;
  const supabase = getSupabaseAdmin();

  if (isPlatformScannerRole(role)) {
    const { data: events } = await supabase
      .from("events")
      .select("id, title")
      .order("date", { ascending: false })
      .limit(200);

    return events ?? [];
  }

  if (role === "organizer") {
    const { data: events } = await supabase
      .from("events")
      .select("id, title")
      .eq("organizer_id", user.id)
      .order("date", { ascending: false });

    return events ?? [];
  }

  const email = user.email ? normalizeScannerEmail(user.email) : null;

  const { data: byUserRows } = await supabase
    .from("event_scanner_members")
    .select("event_id")
    .eq("user_id", user.id)
    .is("revoked_at", null);

  const { data: byEmailRows } = email
    ? await supabase
        .from("event_scanner_members")
        .select("event_id")
        .eq("invited_email", email)
        .is("user_id", null)
        .is("revoked_at", null)
    : { data: [] as { event_id: string }[] };

  const eventIds = [
    ...new Set([
      ...(byUserRows ?? []).map((m) => m.event_id),
      ...(byEmailRows ?? []).map((m) => m.event_id),
    ]),
  ];
  if (eventIds.length === 0) {
    return [];
  }

  const { data: events } = await supabase
    .from("events")
    .select("id, title")
    .in("id", eventIds)
    .order("date", { ascending: false });

  return events ?? [];
}
