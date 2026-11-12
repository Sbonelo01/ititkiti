import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";
import { PUBLIC_ORGANIZER_PROFILE_COLUMNS } from "@/lib/events/publicOrganizer";
import {
  fetchPublicOrganizerCard,
  resetOrganizerPublicProfileProbeForTests,
} from "./fetchPublicOrganizer";

vi.mock("@/server/supabaseAdmin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

const ORGANIZER_ID = "550e8400-e29b-41d4-a716-446655440000";
const SECRET_EMAIL = "ada.private@example.com";
const SECRET_PHONE = "0820000000";
const SECRET_BANK = "62200000000";

type ProfileResult = { data: unknown; error: { code?: string; message?: string } | null };
type UserResult = {
  data: { user: { email?: string; user_metadata?: unknown } | null };
  error: { message: string } | null;
};

function installSupabase(options: { profile?: ProfileResult; user?: UserResult; profileThrows?: boolean }) {
  const listUsers = vi.fn();
  const getUserById = vi.fn(async () => {
    return (
      options.user ?? {
        data: { user: null },
        error: { message: "missing" },
      }
    );
  });
  const maybeSingle = vi.fn(async () => options.profile ?? { data: null, error: null });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => {
    if (options.profileThrows) throw new Error("relation does not exist");
    return { select };
  });

  vi.mocked(getSupabaseAdmin).mockReturnValue({
    from,
    auth: { admin: { getUserById, listUsers } },
  } as never);

  return { from, select, eq, getUserById, listUsers };
}

const namedOrganizer: UserResult = {
  data: {
    user: {
      email: SECRET_EMAIL,
      user_metadata: {
        company_name: "Analytical Engines",
        name: "Ada",
        surname: "Lovelace",
        cellphone: SECRET_PHONE,
        company_logo: "https://cdn.example/private-logo.png",
        bank_account: SECRET_BANK,
      },
    },
  },
  error: null,
};

describe("fetchPublicOrganizerCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    resetOrganizerPublicProfileProbeForTests();
  });

  it("uses only the name fallback and does not query a missing optional table", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const supabase = installSupabase({
      profile: { data: null, error: { code: "42P01", message: 'relation "public.organizer_public_profiles" does not exist' } },
      user: namedOrganizer,
    });

    const first = await fetchPublicOrganizerCard(ORGANIZER_ID);
    const second = await fetchPublicOrganizerCard(ORGANIZER_ID);

    expect(first).toEqual({ displayName: "Analytical Engines" });
    expect(second).toEqual({ displayName: "Analytical Engines" });
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.getUserById).toHaveBeenCalledTimes(2);
    expect(supabase.listUsers).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(JSON.stringify(first)).not.toContain(SECRET_EMAIL);
    expect(JSON.stringify(first)).not.toContain(SECRET_PHONE);
    errorSpy.mockRestore();
  });

  it("does not treat other flag values as permission to query the table", async () => {
    vi.stubEnv("ORGANIZER_PUBLIC_PROFILES", "1");
    const supabase = installSupabase({ user: namedOrganizer });

    await fetchPublicOrganizerCard(ORGANIZER_ID);

    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.getUserById).toHaveBeenCalledTimes(1);
  });

  it("queries the optional table once, then remembers that it is missing", async () => {
    vi.stubEnv("ORGANIZER_PUBLIC_PROFILES", "true");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const supabase = installSupabase({
      profile: {
        data: null,
        error: { code: "PGRST205", message: "Could not find the table organizer_public_profiles" },
      },
      user: namedOrganizer,
    });

    const first = await fetchPublicOrganizerCard(ORGANIZER_ID);
    const second = await fetchPublicOrganizerCard(ORGANIZER_ID);

    expect(first).toEqual({ displayName: "Analytical Engines" });
    expect(second).toEqual({ displayName: "Analytical Engines" });
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(supabase.from).toHaveBeenCalledWith("organizer_public_profiles");
    expect(supabase.getUserById).toHaveBeenCalledTimes(2);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(JSON.stringify(first)).not.toContain(SECRET_EMAIL);
    expect(JSON.stringify(first)).not.toContain("private-logo");
    errorSpy.mockRestore();
  });

  it("remembers a thrown missing-relation error and does not query again", async () => {
    vi.stubEnv("ORGANIZER_PUBLIC_PROFILES", "true");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const supabase = installSupabase({
      profileThrows: true,
      user: namedOrganizer,
    });

    await fetchPublicOrganizerCard(ORGANIZER_ID);
    await fetchPublicOrganizerCard(ORGANIZER_ID);

    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(supabase.getUserById).toHaveBeenCalledTimes(2);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("retries an unexpected profile error instead of treating the table as missing", async () => {
    vi.stubEnv("ORGANIZER_PUBLIC_PROFILES", "true");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const supabase = installSupabase({
      profile: { data: null, error: { code: "57014", message: "canceling statement due to statement timeout" } },
      user: namedOrganizer,
    });

    await fetchPublicOrganizerCard(ORGANIZER_ID);
    await fetchPublicOrganizerCard(ORGANIZER_ID);

    expect(supabase.from).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledWith("[public-organizer] public profile unavailable", "57014");
    errorSpy.mockRestore();
  });

  it("returns the explicit public profile without reading the auth user", async () => {
    vi.stubEnv("ORGANIZER_PUBLIC_PROFILES", "true");
    const supabase = installSupabase({
      profile: {
        data: {
          display_name: "Analytical Engines",
          bio: "Live shows.",
          website_url: "https://events.example",
          logo_url: "https://cdn.example/logo.png",
          public_email: "press@example.com",
          public_phone: "+27 61 069 2364",
          email: SECRET_EMAIL,
          cellphone: SECRET_PHONE,
          organizer_id: ORGANIZER_ID,
          bank_account: SECRET_BANK,
        },
        error: null,
      },
      user: {
        data: {
          user: {
            email: SECRET_EMAIL,
            user_metadata: { cellphone: SECRET_PHONE, company_name: "Should Not Replace" },
          },
        },
        error: null,
      },
    });

    const card = await fetchPublicOrganizerCard(ORGANIZER_ID);

    expect(supabase.from).toHaveBeenCalledWith("organizer_public_profiles");
    expect(supabase.select).toHaveBeenCalledWith(PUBLIC_ORGANIZER_PROFILE_COLUMNS);
    expect(supabase.select).not.toHaveBeenCalledWith("*");
    expect(PUBLIC_ORGANIZER_PROFILE_COLUMNS.split(",").map((column) => column.trim())).toEqual([
      "display_name",
      "bio",
      "website_url",
      "logo_url",
      "public_email",
      "public_phone",
    ]);
    expect(supabase.eq).toHaveBeenCalledWith("organizer_id", ORGANIZER_ID);
    expect(supabase.getUserById).not.toHaveBeenCalled();
    expect(supabase.listUsers).not.toHaveBeenCalled();
    expect(card).toEqual({
      displayName: "Analytical Engines",
      bio: "Live shows.",
      websiteUrl: "https://events.example/",
      logoUrl: "https://cdn.example/logo.png",
      publicEmail: "press@example.com",
      publicPhone: "+27 61 069 2364",
    });
    expect(JSON.stringify(card)).not.toContain(SECRET_EMAIL);
    expect(JSON.stringify(card)).not.toContain(SECRET_PHONE);
    expect(JSON.stringify(card)).not.toContain(SECRET_BANK);
    expect(JSON.stringify(card)).not.toContain(ORGANIZER_ID);
  });

  it("falls back to the published name when the enabled profile lookup misses", async () => {
    vi.stubEnv("ORGANIZER_PUBLIC_PROFILES", "true");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const supabase = installSupabase({
      profile: { data: null, error: { code: "PGRST205", message: "organizer_public_profiles" } },
      user: {
        data: {
          user: {
            email: SECRET_EMAIL,
            user_metadata: {
              company_name: "Analytical Engines",
              name: "Ada",
              surname: "Lovelace",
              cellphone: SECRET_PHONE,
              company_logo: "https://cdn.example/private-logo.png",
              bank_account: SECRET_BANK,
            },
          },
        },
        error: null,
      },
    });

    const card = await fetchPublicOrganizerCard(ORGANIZER_ID);

    expect(supabase.getUserById).toHaveBeenCalledWith(ORGANIZER_ID);
    expect(supabase.listUsers).not.toHaveBeenCalled();
    expect(card).toEqual({ displayName: "Analytical Engines" });
    expect(JSON.stringify(card)).not.toContain(SECRET_EMAIL);
    expect(JSON.stringify(card)).not.toContain(SECRET_PHONE);
    expect(JSON.stringify(card)).not.toContain("private-logo");
    expect(JSON.stringify(card)).not.toContain(SECRET_BANK);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("returns null when the organiser has no public name", async () => {
    vi.stubEnv("ORGANIZER_PUBLIC_PROFILES", "true");
    const supabase = installSupabase({
      profile: { data: null, error: null },
      user: {
        data: {
          user: {
            email: SECRET_EMAIL,
            user_metadata: { cellphone: SECRET_PHONE, email: SECRET_EMAIL },
          },
        },
        error: null,
      },
    });

    await expect(fetchPublicOrganizerCard(ORGANIZER_ID)).resolves.toBeNull();
    expect(supabase.listUsers).not.toHaveBeenCalled();
  });

  it("returns null for a missing organiser id without listing users", async () => {
    const supabase = installSupabase({});
    await expect(fetchPublicOrganizerCard("")).resolves.toBeNull();
    await expect(fetchPublicOrganizerCard("not-a-uuid")).resolves.toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.getUserById).not.toHaveBeenCalled();
    expect(supabase.listUsers).not.toHaveBeenCalled();
  });

  it("still returns null when both lookups fail", async () => {
    vi.stubEnv("ORGANIZER_PUBLIC_PROFILES", "true");
    installSupabase({
      profileThrows: true,
      user: {
        data: { user: null },
        error: null,
      },
    });
    const getUserById = vi.mocked(getSupabaseAdmin()).auth.admin.getUserById as ReturnType<typeof vi.fn>;
    getUserById.mockRejectedValueOnce(new Error("auth down"));

    await expect(fetchPublicOrganizerCard(ORGANIZER_ID)).resolves.toBeNull();
  });
});
