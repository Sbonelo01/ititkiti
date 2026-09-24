import { describe, expect, it, vi, afterEach } from "vitest";
import {
  SCAN_DEBOUNCE_MS,
  VALIDATE_TICKET_PATH,
  acceptScan,
  outcomeFromValidation,
  postValidateTicket,
  selectQrDecoder,
  supabaseAuthStorageKeys,
  type ValidationResponse,
} from "./ticketScan";

function jsonResponse(
  body: unknown,
  init: { ok: boolean; status: number }
): Response {
  return {
    ok: init.ok,
    status: init.status,
    headers: { get: () => "application/json" },
    json: async () => body,
  } as unknown as Response;
}

describe("supabaseAuthStorageKeys", () => {
  it("selects the local auth token and its chunks", () => {
    expect(
      supabaseAuthStorageKeys([
        "sb-placeholder-auth-token",
        "sb-placeholder-auth-token.0",
        "sb-placeholder-auth-token-code-verifier",
        "tikiti.auth.next",
      ])
    ).toEqual([
      "sb-placeholder-auth-token",
      "sb-placeholder-auth-token.0",
      "sb-placeholder-auth-token-code-verifier",
    ]);
  });
});

describe("selectQrDecoder", () => {
  it("uses BarcodeDetector when the browser provides it", () => {
    expect(selectQrDecoder(true)).toBe("barcode-detector");
  });

  it("falls back to zxing for Safari and other browsers without BarcodeDetector", () => {
    expect(selectQrDecoder(false)).toBe("zxing");
  });
});

describe("acceptScan", () => {
  const base = {
    now: 10_000,
    isOffline: false,
    isBusy: false,
    lastScannedAt: {} as Record<string, number>,
  };

  it("accepts a new code", () => {
    expect(acceptScan({ ...base, code: "qr-1" })).toEqual({ accept: true });
  });

  it("ignores empty codes", () => {
    expect(acceptScan({ ...base, code: "" })).toEqual({
      accept: false,
      reason: "empty",
    });
  });

  it("pauses while offline without treating the code as scanned", () => {
    expect(acceptScan({ ...base, code: "qr-1", isOffline: true })).toEqual({
      accept: false,
      reason: "offline",
    });
  });

  it("ignores frames while a validation or result is on screen", () => {
    expect(acceptScan({ ...base, code: "qr-1", isBusy: true })).toEqual({
      accept: false,
      reason: "busy",
    });
  });

  it("debounces the same code for 2.5s and allows a different code", () => {
    const lastScannedAt = { "qr-1": 10_000 };
    expect(
      acceptScan({
        ...base,
        code: "qr-1",
        now: 10_000 + SCAN_DEBOUNCE_MS - 1,
        lastScannedAt,
      })
    ).toEqual({ accept: false, reason: "debounced" });

    expect(
      acceptScan({
        ...base,
        code: "qr-1",
        now: 10_000 + SCAN_DEBOUNCE_MS,
        lastScannedAt,
      })
    ).toEqual({ accept: true });

    expect(
      acceptScan({
        ...base,
        code: "qr-2",
        now: 10_000 + 100,
        lastScannedAt,
      })
    ).toEqual({ accept: true });
  });
});

describe("outcomeFromValidation", () => {
  const ticket = {
    attendee_name: "Amahle Dlamini",
    email: "amahle@example.com",
    event_id: "evt-1",
    created_at: "2026-09-24T18:00:00.000Z",
  };

  it("keeps attendee details for valid and already-used tickets", () => {
    expect(
      outcomeFromValidation({ success: true, status: "valid", ticket })
    ).toEqual({ kind: "valid", ticket });
    expect(
      outcomeFromValidation({
        success: false,
        status: "already_used",
        error: "Ticket has already been used",
        ticket,
      })
    ).toEqual({ kind: "already_used", ticket });
  });

  it("maps not-found, unauthorized, and error messages", () => {
    expect(
      outcomeFromValidation({
        success: false,
        status: "not_found",
        error: "Ticket not found or invalid",
      })
    ).toEqual({ kind: "not_found", message: "Ticket not found or invalid" });

    expect(
      outcomeFromValidation({
        success: false,
        status: "unauthorized",
        error: "Unauthorized",
      })
    ).toEqual({ kind: "unauthorized", message: "Unauthorized" });

    expect(
      outcomeFromValidation({ success: false, status: "error" })
    ).toEqual({ kind: "error", message: "Validation failed" });
  });

  it("uses a fallback message when the server omits one", () => {
    const missing: ValidationResponse = { success: false, status: "not_found" };
    expect(outcomeFromValidation(missing).kind).toBe("not_found");
  });
});

describe("postValidateTicket", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not call the network without a code or a session token", async () => {
    const fetchImpl = vi.fn();
    await expect(
      postValidateTicket("   ", {
        getAccessToken: async () => "token",
        fetchImpl,
      })
    ).resolves.toMatchObject({ status: "error", error: "Missing QR code data" });

    await expect(
      postValidateTicket("qr-1", {
        getAccessToken: async () => null,
        fetchImpl,
      })
    ).resolves.toMatchObject({
      status: "unauthorized",
      error: "Not signed in. Please log in again.",
    });

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("posts the QR payload with a bearer token and maps each API status", async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      if (body.qr_code_data === "valid") {
        return jsonResponse(
          {
            success: true,
            status: "valid",
            ticket: {
              attendee_name: "Ann",
              email: "ann@example.com",
              event_id: "e1",
              created_at: "2026-01-01",
              id: "secret-row",
            },
          },
          { ok: true, status: 200 }
        );
      }
      if (body.qr_code_data === "used") {
        return jsonResponse(
          {
            success: false,
            status: "already_used",
            error: "Ticket has already been used",
            ticket: { attendee_name: "Bob", email: "bob@example.com" },
          },
          { ok: true, status: 200 }
        );
      }
      if (body.qr_code_data === "missing") {
        return jsonResponse(
          { success: false, status: "not_found", error: "Ticket not found or invalid" },
          { ok: false, status: 404 }
        );
      }
      return jsonResponse(
        { success: false, status: "unauthorized", error: "Unauthorized" },
        { ok: false, status: 401 }
      );
    });

    const deps = {
      getAccessToken: async () => "staff-access-token",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    };

    const valid = await postValidateTicket("valid", deps);
    expect(valid).toEqual({
      success: true,
      status: "valid",
      ticket: {
        attendee_name: "Ann",
        email: "ann@example.com",
        event_id: "e1",
        created_at: "2026-01-01",
      },
      error: undefined,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      VALIDATE_TICKET_PATH,
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer staff-access-token",
        },
        body: JSON.stringify({ qr_code_data: "valid" }),
      })
    );

    await expect(postValidateTicket("used", deps)).resolves.toMatchObject({
      status: "already_used",
      ticket: { attendee_name: "Bob", email: "bob@example.com" },
    });
    await expect(postValidateTicket("missing", deps)).resolves.toMatchObject({
      success: false,
      status: "not_found",
      error: "Ticket not found or invalid",
    });
    await expect(postValidateTicket("nope", deps)).resolves.toMatchObject({
      status: "unauthorized",
      error: "Unauthorized",
    });
  });

  it("treats a non-JSON body as an error and maps bare HTTP statuses", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        headers: { get: () => "text/html" },
        json: async () => {
          throw new Error("not json");
        },
      } as unknown as Response)
      .mockResolvedValueOnce(
        jsonResponse({ success: false, error: "nope" }, { ok: false, status: 401 })
      );

    const deps = {
      getAccessToken: async () => "token",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    };

    await expect(postValidateTicket("qr", deps)).resolves.toEqual({
      success: false,
      status: "error",
      error: "Invalid response from server",
    });
    await expect(postValidateTicket("qr", deps)).resolves.toMatchObject({
      status: "unauthorized",
      error: "nope",
    });
  });

  it("maps an aborted request to a timeout and other failures to a network error", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const error = new Error("The operation was aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    });

    const pending = postValidateTicket("qr-1", {
      getAccessToken: async () => "token",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 15000,
    });
    await vi.advanceTimersByTimeAsync(15000);
    await expect(pending).resolves.toEqual({
      success: false,
      status: "error",
      error: "Request timed out. Check your connection and try again.",
    });

    vi.useRealTimers();
    const failingFetch = vi.fn(async () => {
      throw new Error("Failed to fetch");
    });
    await expect(
      postValidateTicket("qr-1", {
        getAccessToken: async () => "token",
        fetchImpl: failingFetch as unknown as typeof fetch,
      })
    ).resolves.toEqual({
      success: false,
      status: "error",
      error: "Network error. Check your connection.",
    });
  });
});
