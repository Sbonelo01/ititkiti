import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  applyRateLimit,
  rateLimitCoverage,
  resetRateLimitBucketsForTests,
  resolveClientIp,
  setDurableRateLimitStoreForTests,
} from "./rateLimit";

function makeReq(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/test", { headers });
}

describe("applyRateLimit", () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetRateLimitBucketsForTests();
  });

  it("does not report durable coverage for the process-local limiter", async () => {
    const opts = { keyPrefix: "t", windowMs: 60_000, maxRequests: 3 };
    expect(rateLimitCoverage()).toEqual({ durable: false, backend: "memory" });
    expect(await applyRateLimit(makeReq(), opts)).toBeNull();
    expect(rateLimitCoverage().durable).toBe(false);
  });

  it("allows requests under the cap and returns 429 over it", async () => {
    const opts = { keyPrefix: "cap", windowMs: 60_000, maxRequests: 2 };
    expect(await applyRateLimit(makeReq(), opts)).toBeNull();
    expect(await applyRateLimit(makeReq(), opts)).toBeNull();
    const res = await applyRateLimit(makeReq(), opts);
    expect(res?.status).toBe(429);
    const body = await res!.json();
    expect(body.error).toMatch(/Too many requests/i);
  });

  it("ignores a spoofed x-forwarded-for list", async () => {
    const opts = { keyPrefix: "spoof", windowMs: 60_000, maxRequests: 1 };
    expect(resolveClientIp(makeReq({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" })).trusted).toBe(
      false
    );
    expect(await applyRateLimit(makeReq({ "x-forwarded-for": "1.1.1.1" }), opts)).toBeNull();
    const res = await applyRateLimit(makeReq({ "x-forwarded-for": "9.9.9.9" }), opts);
    expect(res?.status).toBe(429);
  });

  it("separates clients by the platform IP when VERCEL is set", async () => {
    vi.stubEnv("VERCEL", "1");
    const opts = { keyPrefix: "platform", windowMs: 60_000, maxRequests: 1 };
    const first = makeReq({
      "x-vercel-forwarded-for": "203.0.113.10",
      "x-forwarded-for": "198.51.100.1",
    });
    const spoofedSamePlatform = makeReq({
      "x-vercel-forwarded-for": "203.0.113.10",
      "x-forwarded-for": "198.51.100.99",
    });
    const other = makeReq({
      "x-vercel-forwarded-for": "203.0.113.11",
      "x-forwarded-for": "203.0.113.10",
    });

    expect(resolveClientIp(first)).toEqual({ ip: "203.0.113.10", trusted: true });
    expect(await applyRateLimit(first, opts)).toBeNull();
    expect((await applyRateLimit(spoofedSamePlatform, opts))?.status).toBe(429);
    expect(await applyRateLimit(other, opts)).toBeNull();
  });

  it("does not trust x-forwarded-for when the platform header is missing", async () => {
    vi.stubEnv("VERCEL", "1");
    expect(resolveClientIp(makeReq({ "x-forwarded-for": "203.0.113.8" })).trusted).toBe(false);
  });

  it("fails closed and stays non-durable when the shared store is unavailable", async () => {
    vi.stubEnv("RATE_LIMIT_DURABLE", "true");
    setDurableRateLimitStoreForTests(async () => {
      const error = new Error("Could not find the function public.consume_rate_limit");
      error.name = "RateLimitNotConfiguredError";
      throw error;
    });
    const res = await applyRateLimit(makeReq(), {
      keyPrefix: "store",
      windowMs: 60_000,
      maxRequests: 5,
    });
    expect(res?.status).toBe(503);
    expect(rateLimitCoverage()).toEqual({ durable: false, backend: "memory" });
  });

  it("uses a successful shared decision and only then reports durable coverage", async () => {
    vi.stubEnv("RATE_LIMIT_DURABLE", "true");
    setDurableRateLimitStoreForTests(async () => ({ allowed: false, retryAfterSeconds: 9 }));
    const res = await applyRateLimit(makeReq(), {
      keyPrefix: "shared",
      windowMs: 60_000,
      maxRequests: 5,
    });
    expect(res?.status).toBe(429);
    expect(res?.headers.get("Retry-After")).toBe("9");
    expect(rateLimitCoverage()).toEqual({ durable: true, backend: "supabase" });
  });
});
