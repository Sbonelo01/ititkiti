export const SCAN_DEBOUNCE_MS = 2500;
export const VALIDATE_TICKET_PATH = "/api/validate-ticket";
export const VALIDATE_TICKET_TIMEOUT_MS = 15_000;

export const VALIDATION_STATUSES = [
  "valid",
  "already_used",
  "not_found",
  "unauthorized",
  "error",
] as const;

export type ValidationStatus = (typeof VALIDATION_STATUSES)[number];

export type QrDecoderKind = "barcode-detector" | "zxing";

export type ScannedTicket = {
  attendee_name: string;
  email: string;
  event_id?: string;
  created_at?: string;
};

export type ValidationResponse = {
  success: boolean;
  status: ValidationStatus;
  error?: string;
  ticket?: ScannedTicket;
};

export type ScannerOutcome =
  | { kind: "valid"; ticket: ScannedTicket | null }
  | { kind: "already_used"; ticket: ScannedTicket | null }
  | { kind: "not_found"; message: string }
  | { kind: "unauthorized"; message: string }
  | { kind: "error"; message: string };

export type ScanAcceptance =
  | { accept: false; reason: "empty" | "debounced" | "offline" | "busy" }
  | { accept: true };

type ValidateTicketDeps = {
  getAccessToken: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export function selectQrDecoder(barcodeDetectorAvailable: boolean): QrDecoderKind {
  return barcodeDetectorAvailable ? "barcode-detector" : "zxing";
}

/** Local Supabase auth keys, including chunks and the PKCE code verifier. */
export function supabaseAuthStorageKeys(keys: readonly string[]): string[] {
  return keys.filter((key) => key.startsWith("sb-") && key.includes("-auth-token"));
}

export function isValidationStatus(value: unknown): value is ValidationStatus {
  return (
    typeof value === "string" &&
    (VALIDATION_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Continuous camera frames hit the same code many times. Ignore empties,
 * in-flight or result screens, offline, and repeats inside the debounce window.
 * Offline does not stamp the code, so the same QR validates once connectivity returns.
 */
export function acceptScan(input: {
  code: string;
  now: number;
  isOffline: boolean;
  isBusy: boolean;
  lastScannedAt: Readonly<Record<string, number>>;
  debounceMs?: number;
}): ScanAcceptance {
  if (input.isBusy) return { accept: false, reason: "busy" };
  if (input.isOffline) return { accept: false, reason: "offline" };
  if (!input.code) return { accept: false, reason: "empty" };

  const debounceMs = input.debounceMs ?? SCAN_DEBOUNCE_MS;
  const lastAt = input.lastScannedAt[input.code] ?? 0;
  if (input.now - lastAt < debounceMs) {
    return { accept: false, reason: "debounced" };
  }
  return { accept: true };
}

export function outcomeFromValidation(result: ValidationResponse): ScannerOutcome {
  switch (result.status) {
    case "valid":
      return { kind: "valid", ticket: result.ticket ?? null };
    case "already_used":
      return { kind: "already_used", ticket: result.ticket ?? null };
    case "not_found":
      return {
        kind: "not_found",
        message: result.error || "Ticket not found",
      };
    case "unauthorized":
      return {
        kind: "unauthorized",
        message: result.error || "Not authorized to scan tickets",
      };
    case "error":
      return { kind: "error", message: result.error || "Validation failed" };
    default: {
      const _exhaustive: never = result.status;
      return _exhaustive;
    }
  }
}

function readTicket(value: unknown): ScannedTicket | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.attendee_name !== "string" || typeof record.email !== "string") {
    return undefined;
  }
  const ticket: ScannedTicket = {
    attendee_name: record.attendee_name,
    email: record.email,
  };
  if (typeof record.event_id === "string") ticket.event_id = record.event_id;
  if (typeof record.created_at === "string") ticket.created_at = record.created_at;
  return ticket;
}

function statusFromPayload(
  status: unknown,
  httpStatus: number
): ValidationStatus {
  if (isValidationStatus(status)) return status;
  if (httpStatus === 401) return "unauthorized";
  if (httpStatus === 404) return "not_found";
  return "error";
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "AbortError"
  );
}

export async function postValidateTicket(
  qrCodeData: string,
  deps: ValidateTicketDeps
): Promise<ValidationResponse> {
  if (!qrCodeData.trim()) {
    return { success: false, status: "error", error: "Missing QR code data" };
  }

  const authToken = await deps.getAccessToken();
  if (!authToken) {
    return {
      success: false,
      status: "unauthorized",
      error: "Not signed in. Please log in again.",
    };
  }

  const fetchImpl = deps.fetchImpl ?? fetch;
  const timeoutMs = deps.timeoutMs ?? VALIDATE_TICKET_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(VALIDATE_TICKET_PATH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ qr_code_data: qrCodeData }),
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return {
        success: false,
        status: "error",
        error: "Invalid response from server",
      };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return {
        success: false,
        status: "error",
        error: "Invalid response from server",
      };
    }

    const record =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>)
        : {};
    const status = statusFromPayload(record.status, response.status);
    const error = typeof record.error === "string" ? record.error : undefined;
    const ticket = readTicket(record.ticket);

    if (!response.ok) {
      return {
        success: false,
        status,
        error: error || `Validation failed (HTTP ${response.status})`,
        ticket,
      };
    }

    return {
      success: record.success === true,
      status,
      ticket,
      error,
    };
  } catch (error: unknown) {
    if (isAbortError(error)) {
      return {
        success: false,
        status: "error",
        error: "Request timed out. Check your connection and try again.",
      };
    }
    return {
      success: false,
      status: "error",
      error: "Network error. Check your connection.",
    };
  } finally {
    clearTimeout(timeout);
  }
}
