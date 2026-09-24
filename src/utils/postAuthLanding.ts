import { supabase } from "@/utils/supabaseClient";

/** True when this user owns at least one row in `events` (`organizer_id`). */
export async function userHasOrganizerEvents(userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("organizer_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return (count ?? 0) > 0;
}
