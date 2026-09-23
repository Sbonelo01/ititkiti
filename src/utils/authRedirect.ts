export const DEFAULT_AUTH_REDIRECT = "/dashboard";
/** Public events list — post-auth landing when the user has never listed an event. */
export const EVENTS_BROWSE_PATH = "/events";
export const AUTH_REDIRECT_STORAGE_KEY = "tikiti.auth.next";
export const GOOGLE_SIGN_IN_INCOMPLETE_ERROR =
  "Could not complete Google sign-in. Please try again.";

const LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * Only allow same-origin relative paths for post-auth redirects.
 * Rejects protocol-relative URLs and anything that could leave the site.
 */
export function safeAuthRedirectPath(
  next: string | null | undefined,
  fallback: string = DEFAULT_AUTH_REDIRECT
): string {
  if (!next) return fallback;

  const trimmed = next.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("://") ||
    trimmed.includes("\\")
  ) {
    return fallback;
  }

  return trimmed;
}

export function isLocalhostOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return LOCALHOST_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

function configuredSiteOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return null;
  try {
    const url = new URL(
      configured.includes("://") ? configured : `https://${configured}`
    );
    return url.origin;
  } catch {
    return null;
  }
}

function originFrom(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * Origin used for OAuth `redirectTo` / email confirmation.
 * Prefer the live page origin (production, preview, or local) so PKCE stays
 * same-origin. If the runtime origin is localhost but `NEXT_PUBLIC_SITE_URL`
 * is a public host, use the configured site URL — never send production
 * users to localhost.
 */
export function resolveAuthOrigin(runtimeOrigin?: string | null): string {
  const runtime = originFrom(runtimeOrigin?.trim().replace(/\/$/, "") || "");
  const configured = configuredSiteOrigin();

  if (runtime && !isLocalhostOrigin(runtime)) {
    return runtime;
  }
  if (configured && !isLocalhostOrigin(configured)) {
    return configured;
  }
  return runtime || configured || "http://localhost:3000";
}

/** Exact `/auth/callback` URL (no query). Query `next` can miss allowlists. */
export function getOAuthRedirectTo(origin: string): string {
  return new URL("/auth/callback", resolveAuthOrigin(origin)).toString();
}

export function persistAuthRedirectPath(
  next: string | null | undefined,
  storage?: Pick<Storage, "setItem"> | null
): string {
  const path = safeAuthRedirectPath(next);
  try {
    const store = storage ?? (typeof sessionStorage !== "undefined" ? sessionStorage : null);
    store?.setItem(AUTH_REDIRECT_STORAGE_KEY, path);
  } catch {
    // Private mode / SSR — query param on `/login` still carries the path.
  }
  return path;
}

export function peekAuthRedirectPath(
  storage?: Pick<Storage, "getItem"> | null
): string | null {
  try {
    const store = storage ?? (typeof sessionStorage !== "undefined" ? sessionStorage : null);
    const stored = store?.getItem(AUTH_REDIRECT_STORAGE_KEY);
    if (!stored) return null;
    return safeAuthRedirectPath(stored);
  } catch {
    return null;
  }
}

export function consumeAuthRedirectPath(
  nextFromQuery?: string | null,
  storage?: Pick<Storage, "getItem" | "removeItem"> | null
): string {
  const fromQuery = nextFromQuery
    ? safeAuthRedirectPath(nextFromQuery, "")
    : "";

  try {
    const store =
      storage ?? (typeof sessionStorage !== "undefined" ? sessionStorage : null);
    const stored = store?.getItem(AUTH_REDIRECT_STORAGE_KEY);
    store?.removeItem(AUTH_REDIRECT_STORAGE_KEY);
    if (fromQuery) return fromQuery;
    return safeAuthRedirectPath(stored);
  } catch {
    return fromQuery || DEFAULT_AUTH_REDIRECT;
  }
}

/** True when this URL is an OAuth return that landed off `/auth/callback`. */
export function isOAuthReturnOnWrongPath(
  pathname: string,
  search: string,
  hash: string
): boolean {
  if (pathname === "/auth/callback" || pathname.startsWith("/auth/callback/")) {
    return false;
  }

  const searchParams = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search
  );
  const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
  const hasCode = searchParams.has("code");
  const hasImplicit =
    hashParams.has("access_token") || hashParams.has("refresh_token");
  const hasOAuthError =
    searchParams.has("error_description") ||
    hashParams.has("error_description") ||
    ((searchParams.has("error") || hashParams.has("error")) &&
      (pathname === "/" || pathname === ""));

  return hasCode || hasImplicit || hasOAuthError;
}

export function oauthCallbackHref(
  origin: string,
  next: string,
  search: string,
  hash: string
): string {
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("next", safeAuthRedirectPath(next));
  const searchParams = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search
  );
  for (const key of ["code", "error", "error_description"] as const) {
    const value = searchParams.get(key);
    if (value) url.searchParams.set(key, value);
  }
  return `${url.pathname}${url.search}${hash || ""}`;
}

export function oauthErrorFromParams(
  search: URLSearchParams,
  hash: URLSearchParams
): string | null {
  return (
    search.get("error_description") ||
    search.get("error") ||
    hash.get("error_description") ||
    hash.get("error")
  );
}

/**
 * True when post-auth should use the smart landing (events browse vs dashboard)
 * instead of an explicit deep link such as checkout or create-event.
 */
export function isGenericAuthRedirect(next: string | null | undefined): boolean {
  if (next == null || next.trim() === "") return true;
  const pathOnly = next.trim().split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  const generic = DEFAULT_AUTH_REDIRECT.replace(/\/+$/, "") || "/";
  return pathOnly === generic;
}

/**
 * Honor an explicit post-auth path. When `explicitNext` is empty or the
 * generic default (`/dashboard`), send organizers who have listed an event
 * to the dashboard and everyone else to the public events list.
 */
export async function resolvePostAuthPath(
  userId: string | null | undefined,
  explicitNext: string | null | undefined,
  hasOrganizerEvents: (userId: string) => Promise<boolean>
): Promise<string> {
  const next = safeAuthRedirectPath(explicitNext);
  if (!isGenericAuthRedirect(next)) {
    return next;
  }
  if (!userId) {
    return EVENTS_BROWSE_PATH;
  }
  try {
    const listed = await hasOrganizerEvents(userId);
    return listed ? DEFAULT_AUTH_REDIRECT : EVENTS_BROWSE_PATH;
  } catch {
    return DEFAULT_AUTH_REDIRECT;
  }
}

type OAuthUserSession = { user: { id: string } };

/**
 * Complete a PKCE return. An existing session wins so a code that was already
 * exchanged is not sent again. Otherwise exchange `code` once.
 */
export async function establishOAuthSession(input: {
  code: string | null;
  getSession: () => Promise<OAuthUserSession | null>;
  exchangeCodeForSession: (code: string) => Promise<{
    session: OAuthUserSession | null;
    errorMessage: string | null;
  }>;
}): Promise<{ session: OAuthUserSession | null; errorMessage: string | null }> {
  const code = input.code?.trim() || null;
  const existing = await input.getSession();
  if (!code || existing) {
    return { session: existing, errorMessage: null };
  }

  const exchanged = await input.exchangeCodeForSession(code);
  if (exchanged.session) {
    return { session: exchanged.session, errorMessage: null };
  }

  const afterExchange = await input.getSession();
  if (afterExchange) {
    return { session: afterExchange, errorMessage: null };
  }

  return { session: null, errorMessage: GOOGLE_SIGN_IN_INCOMPLETE_ERROR };
}
