/** Origins allowed to call the scanner APIs from another site. Empty means fail closed. */
export function parseScannerCorsAllowlist(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

/**
 * Reflect an allowlisted Origin. Missing configuration does not fall back to
 * the request origin or to `*`.
 */
export function resolveScannerCorsOrigin(
  origin: string | null,
  allowlist: readonly string[]
): string | null {
  if (allowlist.length === 0) return null;
  if (!origin || !allowlist.includes(origin)) return null;
  return origin;
}
