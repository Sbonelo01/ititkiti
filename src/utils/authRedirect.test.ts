import { describe, expect, it, vi, afterEach } from "vitest";
import {
  AUTH_REDIRECT_STORAGE_KEY,
  DEFAULT_AUTH_REDIRECT,
  consumeAuthRedirectPath,
  getOAuthRedirectTo,
  isLocalhostOrigin,
  isOAuthReturnOnWrongPath,
  oauthCallbackHref,
  establishOAuthSession,
  EVENTS_BROWSE_PATH,
  GOOGLE_SIGN_IN_INCOMPLETE_ERROR,
  isGenericAuthRedirect,
  oauthErrorFromParams,
  persistAuthRedirectPath,
  peekAuthRedirectPath,
  resolveAuthOrigin,
  resolvePostAuthPath,
  safeAuthRedirectPath,
} from "@/utils/authRedirect";

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

describe("safeAuthRedirectPath", () => {
  it("returns the fallback when next is missing", () => {
    expect(safeAuthRedirectPath(null)).toBe(DEFAULT_AUTH_REDIRECT);
    expect(safeAuthRedirectPath(undefined)).toBe(DEFAULT_AUTH_REDIRECT);
    expect(safeAuthRedirectPath("")).toBe(DEFAULT_AUTH_REDIRECT);
  });

  it("allows relative app paths including checkout and sell flows", () => {
    expect(safeAuthRedirectPath("/dashboard")).toBe("/dashboard");
    expect(safeAuthRedirectPath("/dashboard/create-event")).toBe(
      "/dashboard/create-event"
    );
    expect(safeAuthRedirectPath("/events/abc-123")).toBe("/events/abc-123");
  });

  it("rejects open redirects", () => {
    expect(safeAuthRedirectPath("https://evil.example")).toBe(DEFAULT_AUTH_REDIRECT);
    expect(safeAuthRedirectPath("//evil.example")).toBe(DEFAULT_AUTH_REDIRECT);
    expect(safeAuthRedirectPath("/\\evil.example")).toBe(DEFAULT_AUTH_REDIRECT);
    expect(safeAuthRedirectPath("events/no-slash")).toBe(DEFAULT_AUTH_REDIRECT);
  });
});

describe("resolveAuthOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the live public origin so preview/apex PKCE stays same-origin", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.tikiti.fun");
    expect(resolveAuthOrigin("https://tikiti.fun")).toBe("https://tikiti.fun");
    expect(resolveAuthOrigin("https://preview.example.vercel.app")).toBe(
      "https://preview.example.vercel.app"
    );
  });

  it("does not send production traffic to localhost when SITE_URL is public", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.tikiti.fun");
    expect(resolveAuthOrigin("http://localhost:3000")).toBe("https://www.tikiti.fun");
    expect(resolveAuthOrigin(undefined)).toBe("https://www.tikiti.fun");
  });

  it("keeps localhost when no public site URL is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(resolveAuthOrigin("http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("ignores a localhost SITE_URL so local dev still works", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    expect(resolveAuthOrigin("http://localhost:3000")).toBe("http://localhost:3000");
  });
});

describe("isLocalhostOrigin", () => {
  it("detects loopback hosts", () => {
    expect(isLocalhostOrigin("http://localhost:3000")).toBe(true);
    expect(isLocalhostOrigin("http://127.0.0.1:3000")).toBe(true);
    expect(isLocalhostOrigin("https://www.tikiti.fun")).toBe(false);
  });
});

describe("getOAuthRedirectTo", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds an exact callback URL with no next query (allowlist-safe)", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.tikiti.fun");
    expect(getOAuthRedirectTo("https://www.tikiti.fun")).toBe(
      "https://www.tikiti.fun/auth/callback"
    );
  });

  it("rewrites localhost to the configured public origin", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.tikiti.fun");
    expect(getOAuthRedirectTo("http://localhost:3000")).toBe(
      "https://www.tikiti.fun/auth/callback"
    );
  });
});

describe("auth redirect storage", () => {
  it("persists a sanitized path and consumes query first", () => {
    const storage = memoryStorage();
    persistAuthRedirectPath("/events/1", storage);
    expect(peekAuthRedirectPath(storage)).toBe("/events/1");
    expect(consumeAuthRedirectPath("/dashboard/create-event", storage)).toBe(
      "/dashboard/create-event"
    );
    expect(peekAuthRedirectPath(storage)).toBeNull();
  });

  it("falls back to stored path when query is missing", () => {
    const storage = memoryStorage({
      [AUTH_REDIRECT_STORAGE_KEY]: "/events/abc",
    });
    expect(consumeAuthRedirectPath(null, storage)).toBe("/events/abc");
  });

  it("rejects stored open redirects", () => {
    const storage = memoryStorage({
      [AUTH_REDIRECT_STORAGE_KEY]: "https://evil.example",
    });
    persistAuthRedirectPath("https://evil.example", storage);
    expect(storage.getItem(AUTH_REDIRECT_STORAGE_KEY)).toBe(DEFAULT_AUTH_REDIRECT);
  });
});

describe("isOAuthReturnOnWrongPath", () => {
  it("detects implicit hash and PKCE code on the site root", () => {
    expect(isOAuthReturnOnWrongPath("/", "", "#access_token=abc")).toBe(true);
    expect(isOAuthReturnOnWrongPath("/", "?code=abc", "")).toBe(true);
    expect(isOAuthReturnOnWrongPath("/", "?error_description=denied", "")).toBe(
      true
    );
  });

  it("leaves /auth/callback and unrelated pages alone", () => {
    expect(
      isOAuthReturnOnWrongPath("/auth/callback", "?code=abc", "#access_token=x")
    ).toBe(false);
    expect(isOAuthReturnOnWrongPath("/events/1", "?foo=1", "")).toBe(false);
    expect(isOAuthReturnOnWrongPath("/login", "?error=1", "")).toBe(false);
  });
});

describe("oauthCallbackHref", () => {
  it("preserves code and hash while attaching a safe next path", () => {
    expect(
      oauthCallbackHref(
        "https://www.tikiti.fun",
        "/events/1",
        "?code=abc",
        "#access_token=tok"
      )
    ).toBe("/auth/callback?next=%2Fevents%2F1&code=abc#access_token=tok");
  });
});

describe("resolvePostAuthPath", () => {
  it("honors explicit checkout and sell destinations", async () => {
    const lookup = vi.fn(async () => false);
    expect(await resolvePostAuthPath("user-1", "/events/abc-123", lookup)).toBe(
      "/events/abc-123"
    );
    expect(
      await resolvePostAuthPath("user-1", "/dashboard/create-event", lookup)
    ).toBe("/dashboard/create-event");
    expect(lookup).not.toHaveBeenCalled();
  });

  it("sends users who have never listed an event to the events browse page", async () => {
    const lookup = vi.fn(async () => false);
    expect(await resolvePostAuthPath("user-1", "/dashboard", lookup)).toBe(
      EVENTS_BROWSE_PATH
    );
    expect(await resolvePostAuthPath("user-1", null, lookup)).toBe(EVENTS_BROWSE_PATH);
    expect(await resolvePostAuthPath("user-1", "", lookup)).toBe(EVENTS_BROWSE_PATH);
    expect(await resolvePostAuthPath(null, "/dashboard", lookup)).toBe(EVENTS_BROWSE_PATH);
  });

  it("sends organizers who have listed an event to the dashboard", async () => {
    const lookup = vi.fn(async () => true);
    expect(await resolvePostAuthPath("user-1", "/dashboard", lookup)).toBe(
      DEFAULT_AUTH_REDIRECT
    );
    expect(await resolvePostAuthPath("user-1", undefined, lookup)).toBe(
      DEFAULT_AUTH_REDIRECT
    );
    expect(lookup).toHaveBeenCalledWith("user-1");
  });

  it("keeps the dashboard default when the organizer-events lookup fails", async () => {
    const lookup = vi.fn(async () => {
      throw new Error("rls");
    });
    expect(await resolvePostAuthPath("user-1", null, lookup)).toBe(DEFAULT_AUTH_REDIRECT);
  });

  it("treats only the generic dashboard path as the smart-landing default", () => {
    expect(isGenericAuthRedirect(null)).toBe(true);
    expect(isGenericAuthRedirect("")).toBe(true);
    expect(isGenericAuthRedirect("/dashboard")).toBe(true);
    expect(isGenericAuthRedirect("/dashboard/")).toBe(true);
    expect(isGenericAuthRedirect("/dashboard/create-event")).toBe(false);
    expect(isGenericAuthRedirect("/events/abc")).toBe(false);
  });
});

describe("establishOAuthSession", () => {
  const session = { user: { id: "user-1" } };

  it("does not exchange when getSession already has a session", async () => {
    const exchange = vi.fn();
    const result = await establishOAuthSession({
      code: "auth-code",
      getSession: async () => session,
      exchangeCodeForSession: exchange,
    });
    expect(result).toEqual({ session, errorMessage: null });
    expect(exchange).not.toHaveBeenCalled();
  });

  it("exchanges a PKCE code when no session exists yet", async () => {
    const exchange = vi.fn(async () => ({ session, errorMessage: null }));
    const result = await establishOAuthSession({
      code: "auth-code",
      getSession: async () => null,
      exchangeCodeForSession: exchange,
    });
    expect(exchange).toHaveBeenCalledWith("auth-code");
    expect(result.session).toEqual(session);
    expect(result.errorMessage).toBeNull();
  });

  it("uses the session if detectSessionInUrl already consumed the code", async () => {
    let reads = 0;
    const result = await establishOAuthSession({
      code: "auth-code",
      getSession: async () => {
        reads += 1;
        return reads === 1 ? null : session;
      },
      exchangeCodeForSession: async () => ({
        session: null,
        errorMessage: "invalid request: code verifier should be non-empty",
      }),
    });
    expect(result).toEqual({ session, errorMessage: null });
  });

  it("returns the friendly error when the code cannot establish a session", async () => {
    const result = await establishOAuthSession({
      code: "auth-code",
      getSession: async () => null,
      exchangeCodeForSession: async () => ({
        session: null,
        errorMessage: "bad code",
      }),
    });
    expect(result).toEqual({
      session: null,
      errorMessage: GOOGLE_SIGN_IN_INCOMPLETE_ERROR,
    });
  });

  it("waits without an error when there is no code and no session yet", async () => {
    const exchange = vi.fn();
    const result = await establishOAuthSession({
      code: null,
      getSession: async () => null,
      exchangeCodeForSession: exchange,
    });
    expect(exchange).not.toHaveBeenCalled();
    expect(result).toEqual({ session: null, errorMessage: null });
  });
});

describe("oauthErrorFromParams", () => {
  it("prefers error_description from the query string", () => {
    const search = new URLSearchParams("error=access_denied&error_description=User+cancelled");
    expect(oauthErrorFromParams(search, new URLSearchParams())).toBe("User cancelled");
  });

  it("reads implicit-flow errors from the hash", () => {
    const hash = new URLSearchParams("error=server_error");
    expect(oauthErrorFromParams(new URLSearchParams(), hash)).toBe("server_error");
  });
});
