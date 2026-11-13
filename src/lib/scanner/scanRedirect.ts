import { safeAuthRedirectPath } from "@/utils/authRedirect";

const SCAN_PATH = "/scan";
const REDIRECT_BASE = "https://auth-redirect.invalid";
const EVENT_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isScannerEventId(value: string | null | undefined): value is string {
  return typeof value === "string" && EVENT_ID.test(value.trim());
}

/** Path-only scanner return. Anything else becomes `/scan`. */
export function scanReturnPath(eventId: string | null | undefined): string {
  if (!isScannerEventId(eventId)) return SCAN_PATH;
  return `${SCAN_PATH}?event=${eventId.trim().toLowerCase()}`;
}

/**
 * Same-origin allowlist for the scanner OAuth return.
 * Only `/scan` and `/scan?event=<uuid>` survive. Absolute URLs, extra
 * parameters, hashes, and backslashes fall back to `/scan`.
 */
export function allowlistedScanRedirect(next: string | null | undefined): string {
  const safe = safeAuthRedirectPath(next, "");
  if (!safe || safe.includes("#") || safe.includes("\\")) return SCAN_PATH;

  let url: URL;
  try {
    url = new URL(safe, REDIRECT_BASE);
  } catch {
    return SCAN_PATH;
  }
  if (url.origin !== REDIRECT_BASE || url.username || url.password) return SCAN_PATH;
  if (url.pathname !== SCAN_PATH || url.hash) return SCAN_PATH;

  const keys = [...url.searchParams.keys()];
  if (keys.length === 0) return SCAN_PATH;
  if (keys.length !== 1 || keys[0] !== "event") return SCAN_PATH;
  const values = url.searchParams.getAll("event");
  if (values.length !== 1 || !isScannerEventId(values[0])) return SCAN_PATH;
  return scanReturnPath(values[0]);
}

export function scannerAccessPath(eventId: string | null | undefined): string {
  const event = new URL(
    allowlistedScanRedirect(eventId ? `/scan?event=${eventId}` : SCAN_PATH),
    REDIRECT_BASE
  ).searchParams.get("event");
  if (!event) return "/api/scanner/access";
  return `/api/scanner/access?eventId=${encodeURIComponent(event)}`;
}
