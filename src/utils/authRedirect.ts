export const DEFAULT_AUTH_REDIRECT = "/dashboard";

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

/** App origin + `/auth/callback?next=` for `signInWithOAuth` redirectTo. */
export function getOAuthRedirectTo(origin: string, next: string): string {
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("next", safeAuthRedirectPath(next));
  return url.toString();
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
