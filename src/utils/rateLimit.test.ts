import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { applyRateLimit, resetRateLimitBucketsForTests } from "./rateLimit";

function makeReq(ip: string) {
  return new NextRequest("http://localhost/api/test", {
    headers: { "x-forwarded-for": ip },
  });
}

describe("applyRateLimit", () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests();
  });

  it("allows requests under the cap", () => {
    const opts = { keyPrefix: "t", windowMs: 60_000, maxRequests: 3 };
    expect(applyRateLimit(makeReq("1.1.1.1"), opts)).toBeNull();
    expect(applyRateLimit(makeReq("1.1.1.1"), opts)).toBeNull();
    expect(applyRateLimit(makeReq("1.1.1.1"), opts)).toBeNull();
  });

  it("returns 429 when cap exceeded", async () => {
    const opts = { keyPrefix: "cap", windowMs: 60_000, maxRequests: 2 };
    expect(applyRateLimit(makeReq("2.2.2.2"), opts)).toBeNull();
    expect(applyRateLimit(makeReq("2.2.2.2"), opts)).toBeNull();
    const res = applyRateLimit(makeReq("2.2.2.2"), opts);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);
    const body = await res!.json();
    expect(body.error).toMatch(/Too many requests/i);
  });

  it("tracks different client IPs separately", () => {
    const opts = { keyPrefix: "ip", windowMs: 60_000, maxRequests: 1 };
    expect(applyRateLimit(makeReq("10.0.0.1"), opts)).toBeNull();
    expect(applyRateLimit(makeReq("10.0.0.2"), opts)).toBeNull();
  });
});
