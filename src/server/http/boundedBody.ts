import { NextRequest, NextResponse } from "next/server";

/**
 * Byte and collection ceilings for internet-facing JSON bodies.
 * Purchase and webhook ceilings stay above real checkout and Paystack charge payloads.
 * Ticket quantity matches the integer argument of the finalize-purchase RPC.
 */
export const REQUEST_LIMITS = {
  purchaseBytes: 64 * 1024,
  webhookBytes: 1024 * 1024,
  ticketScanBytes: 32 * 1024,
  eventCreateBytes: 512 * 1024,
  smallJsonBytes: 16 * 1024,
  maxTicketSelections: 100,
  maxTicketQuantity: 2_147_483_647,
  maxReferenceLength: 256,
  maxEmailLength: 320,
  maxNameLength: 2_000,
  maxUserIdLength: 128,
  maxTicketTypeIdLength: 128,
} as const;

function payloadTooLarge(): NextResponse {
  return NextResponse.json({ error: "Payload too large" }, { status: 413 });
}

function invalidBody(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

/** Reject a declared Content-Length above the route ceiling before any parse. */
export function declaredBodyTooLarge(req: NextRequest, maxBytes: number): NextResponse | null {
  const declared = req.headers.get("content-length");
  if (declared == null || declared === "") return null;
  if (!/^\d+$/.test(declared)) return invalidBody("Invalid request body");
  const length = Number(declared);
  if (!Number.isSafeInteger(length) || length > maxBytes) return payloadTooLarge();
  return null;
}

export async function readBoundedText(
  req: NextRequest,
  maxBytes: number,
  invalidMessage = "Invalid request body"
): Promise<{ ok: true; text: string } | { ok: false; response: NextResponse }> {
  const declared = declaredBodyTooLarge(req, maxBytes);
  if (declared) return { ok: false, response: declared };

  const stream = req.body;
  if (!stream) return { ok: true, text: "" };

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { ok: false, response: payloadTooLarge() };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, response: invalidBody(invalidMessage) };
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { ok: true, text: new TextDecoder("utf-8", { fatal: false }).decode(bytes) };
}

export async function readBoundedJson(
  req: NextRequest,
  maxBytes: number,
  invalidMessage = "Invalid request body"
): Promise<{ ok: true; value: unknown } | { ok: false; response: NextResponse }> {
  const read = await readBoundedText(req, maxBytes, invalidMessage);
  if (!read.ok) return read;

  try {
    return { ok: true, value: JSON.parse(read.text) as unknown };
  } catch {
    return { ok: false, response: invalidBody(invalidMessage) };
  }
}
