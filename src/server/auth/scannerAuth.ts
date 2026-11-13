import { User } from "@supabase/supabase-js";
import { getPrivilegedRole, getProductRole } from "@/utils/roles";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";

export function normalizeScannerEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Inbox proof. `confirmed_at` alone is not enough for an email invite. */
export function hasConfirmedEmail(user: Pick<User, "email_confirmed_at">): boolean {
  return typeof user.email_confirmed_at === "string" && user.email_confirmed_at.trim().length > 0;
}

function identityEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = normalizeScannerEmail(value);
  return email || null;
}

/**
 * Google's verified address, only when it is the session email.
 * `user_metadata` is ignored — callers can edit that.
 */
function googleIdentityConfirmsSessionEmail(
  user: Pick<User, "email" | "identities">
): boolean {
  const sessionEmail = identityEmail(user.email);
  if (!sessionEmail) return false;

  for (const identity of user.identities ?? []) {
    if (identity.provider !== "google") continue;
    const data = identity.identity_data;
    if (!data || typeof data !== "object") continue;
    const record = data as Record<string, unknown>;
    if (record.email_verified !== true) continue;
    if (identityEmail(record.email) === sessionEmail) return true;
  }
  return false;
}

export function sessionEmailIsVerified(
  user: Pick<User, "email" | "email_confirmed_at" | "identities">
): boolean {
  return hasConfirmedEmail(user) || googleIdentityConfirmsSessionEmail(user);
}

function confirmedScannerEmail(user: User): string | null {
  if (!sessionEmailIsVerified(user) || !user.email?.trim()) return null;
  return normalizeScannerEmail(user.email);
}

export function hasPlatformScannerAccess(user: User): boolean {
  return getPrivilegedRole(user) !== null;
}

export function hasOrganizerProductRole(user: User): boolean {
  return getProductRole(user) === "organizer";
}

/** Role string returned to the scanner app (privileged role wins over product role). */
export function getScannerRoleForClient(user: User): string | null {
  const privileged = getPrivilegedRole(user);
  if (privileged) {
    return privileged;
  }
  const product = getProductRole(user);
  return product === "organizer" ? "organizer" : product;
}

export async function linkPendingScannerMemberships(user: User): Promise<void> {
  const email = confirmedScannerEmail(user);
  if (!email) return;

  const supabase = getSupabaseAdmin();

  await supabase
    .from("event_scanner_members")
    .update({ user_id: user.id })
    .is("user_id", null)
    .eq("invited_email", email)
    .is("revoked_at", null);
}

export async function canScanEvent(user: User, eventId: string): Promise<boolean> {
  if (hasPlatformScannerAccess(user)) {
    return true;
  }

  const supabase = getSupabaseAdmin();

  if (hasOrganizerProductRole(user)) {
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

  if (!sessionEmailIsVerified(user)) {
    return false;
  }

  if (byUser) {
    return true;
  }

  const email = confirmedScannerEmail(user);
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
  if (hasPlatformScannerAccess(user) || hasOrganizerProductRole(user)) {
    return true;
  }

  if (!sessionEmailIsVerified(user)) {
    return false;
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

  const email = confirmedScannerEmail(user);
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
  const supabase = getSupabaseAdmin();

  if (hasPlatformScannerAccess(user)) {
    const { data: events } = await supabase
      .from("events")
      .select("id, title")
      .order("date", { ascending: false })
      .limit(200);

    return events ?? [];
  }

  if (hasOrganizerProductRole(user)) {
    const { data: events } = await supabase
      .from("events")
      .select("id, title")
      .eq("organizer_id", user.id)
      .order("date", { ascending: false });

    return events ?? [];
  }

  if (!sessionEmailIsVerified(user)) {
    return [];
  }

  const email = confirmedScannerEmail(user);

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
