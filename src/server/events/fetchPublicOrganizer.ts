import { getSupabaseAdmin } from "@/server/supabaseAdmin";
import {
  PUBLIC_ORGANIZER_PROFILE_COLUMNS,
  publicOrganizerCardFromAuthMetadata,
  publicOrganizerCardFromProfileRow,
  type PublicOrganizerCard,
} from "@/lib/events/publicOrganizer";

const ORGANIZER_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  try {
    const { data, error } = await supabase
      .from("organizer_public_profiles")
      .select(PUBLIC_ORGANIZER_PROFILE_COLUMNS)
      .eq("organizer_id", organizerId)
      .maybeSingle();

    if (error) {
      if (!isMissingPublicProfile(error)) {
        console.error("[public-organizer] public profile unavailable", error.code ?? "unknown");
      }
      return null;
    }

    return publicOrganizerCardFromProfileRow(data);
  } catch {
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
