import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  declaredBodyTooLarge,
  readBoundedJson,
  readBoundedText,
  REQUEST_LIMITS,
} from "./boundedBody";

function post(url: string, body: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body,
  });
}

describe("bounded request bodies", () => {
  it("reads a JSON object inside the byte ceiling", async () => {
    const req = post("http://localhost/api/purchase-tickets", JSON.stringify({ ok: true }));
    const result = await readBoundedJson(req, REQUEST_LIMITS.purchaseBytes);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ ok: true });
  });

  it("rejects a body larger than the ceiling before parsing it as JSON", async () => {
    const body = `{"reference":"${"x".repeat(REQUEST_LIMITS.purchaseBytes)}"}`;
    const req = post("http://localhost/api/purchase-tickets", body);
    const result = await readBoundedJson(req, REQUEST_LIMITS.purchaseBytes);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(413);
      expect(await result.response.json()).toEqual({ error: "Payload too large" });
    }
  });

  it("rejects a declared Content-Length above the ceiling", () => {
    const req = post("http://localhost/api/paystack/webhook", "{}", {
      "content-length": String(REQUEST_LIMITS.webhookBytes + 1),
    });
    const response = declaredBodyTooLarge(req, REQUEST_LIMITS.webhookBytes);
    expect(response?.status).toBe(413);
  });

  it("returns the exact text used for webhook signatures when the body fits", async () => {
    const raw = JSON.stringify({ event: "charge.success", data: { reference: "R1" } });
    const req = post("http://localhost/api/paystack/webhook", raw);
    const result = await readBoundedText(req, REQUEST_LIMITS.webhookBytes);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.text).toBe(raw);
  });

  it("rejects invalid JSON with 400", async () => {
    const req = post("http://localhost/api/purchase-tickets", "{");
    const result = await readBoundedJson(req, REQUEST_LIMITS.purchaseBytes);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });
});
