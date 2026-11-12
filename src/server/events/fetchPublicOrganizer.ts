import { getSupabaseAdmin } from "@/server/supabaseAdmin";
import {
  PUBLIC_ORGANIZER_PROFILE_COLUMNS,
  publicOrganizerCardFromAuthMetadata,
  publicOrganizerCardFromProfileRow,
  type PublicOrganizerCard,
} from "@/lib/events/publicOrganizer";

const ORGANIZER_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The optional table is not queried until this is exactly "true".
 * Leave it unset while supabase/migrations/20261111160007_organizer_public_profiles.sql
 * is unapplied. A missing relation is remembered for this process so a premature
 * flag does not repeat the database error.
 */
let optionalProfileTableMissing = false;

export function organizerPublicProfilesEnabled(): boolean {
  return process.env.ORGANIZER_PUBLIC_PROFILES === "true";
}

export function resetOrganizerPublicProfileProbeForTests(): void {
  optionalProfileTableMissing = false;
}

function isMissingPublicProfile(error: { code?: string; message?: string }): boolean {
  const code = error.code ?? "";
  if (code === "PGRST205" || code === "42P01" || code === "PGRST204") return true;
  const message = (error.message ?? "").toLowerCase();
  return (
    message.includes("does not exist") ||
    message.includes("could not find the table") ||
    message.includes("schema cache")
  );
}

function asLookupError(error: unknown): { code?: string; message?: string } {
  if (error instanceof Error) return { message: error.message };
  if (!error || typeof error !== "object") return {};
  const record = error as { code?: unknown; message?: unknown };
  return {
    code: typeof record.code === "string" ? record.code : undefined,
    message: typeof record.message === "string" ? record.message : undefined,
  };
}

/**
 * Loads the public organiser card for one event owner.
 * Uses a single auth user lookup by id. Does not list auth users.
 * Failures return null so the event page still renders.
 */
export async function fetchPublicOrganizerCard(
  organizerId: string
): Promise<PublicOrganizerCard | null> {
  if (!ORGANIZER_UUID.test(organizerId)) return null;

  const supabase = getSupabaseAdmin();
  const fromProfile = await readExplicitPublicProfile(supabase, organizerId);
  if (fromProfile) return fromProfile;

  return readPublishedName(supabase, organizerId);
}

async function readExplicitPublicProfile(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  organizerId: string
): Promise<PublicOrganizerCard | null> {
  if (!organizerPublicProfilesEnabled() || optionalProfileTableMissing) return null;

  try {
    const { data, error } = await supabase
      .from("organizer_public_profiles")
      .select(PUBLIC_ORGANIZER_PROFILE_COLUMNS)
      .eq("organizer_id", organizerId)
      .maybeSingle();

    if (error) {
      if (isMissingPublicProfile(error)) {
        optionalProfileTableMissing = true;
        return null;
      }
      console.error("[public-organizer] public profile unavailable", error.code ?? "unknown");
      return null;
    }

    return publicOrganizerCardFromProfileRow(data);
  } catch (error) {
    if (isMissingPublicProfile(asLookupError(error))) {
      optionalProfileTableMissing = true;
    }
    return null;
  }
}

async function readPublishedName(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  organizerId: string
): Promise<PublicOrganizerCard | null> {
  try {
    const { data, error } = await supabase.auth.admin.getUserById(organizerId);
    if (error || !data.user) return null;
    return publicOrganizerCardFromAuthMetadata(data.user.user_metadata);
  } catch {
    return null;
  }
}
