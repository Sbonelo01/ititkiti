import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";

type RateLimitOptions = {
  keyPrefix: string;
  windowMs: number;
  maxRequests: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

type DurableRateLimitStore = (
  key: string,
  windowMs: number,
  maxRequests: number
) => Promise<RateLimitDecision>;

export type RateLimitCoverage = {
  durable: false;
  backend: "memory";
} | {
  durable: true;
  backend: "supabase";
};

const buckets = new Map<string, Bucket>();
const IPV4 = /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const IPV6 = /^[0-9a-f:]{2,64}$/i;

let durableStoreOverride: DurableRateLimitStore | null = null;
let durableConfirmed = false;

/**
 * Process-local buckets. This is not a shared limit.
 * `durable` is true only after a successful call to the Supabase limiter.
 */
export function rateLimitCoverage(): RateLimitCoverage {
  if (durableConfirmed) {
    return { durable: true, backend: "supabase" };
  }
  return { durable: false, backend: "memory" };
}

/** Clears in-memory buckets and the durable confirmation flag. Tests only. */
export function resetRateLimitBucketsForTests(): void {
  buckets.clear();
  durableConfirmed = false;
  durableStoreOverride = null;
}

/** Inject the durable store. Tests only. Does not by itself mark coverage durable. */
export function setDurableRateLimitStoreForTests(store: DurableRateLimitStore | null): void {
  durableStoreOverride = store;
  durableConfirmed = false;
}

function tooMany(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}

function unavailable(): NextResponse {
  return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
}

function firstValidIp(header: string | null): string | null {
  if (!header) return null;
  const candidate = header.split(",")[0]?.trim() ?? "";
  if (!candidate || candidate.length > 64) return null;
  if (IPV4.test(candidate)) return candidate;
  if (candidate.includes(":") && IPV6.test(candidate) && !candidate.includes("\\")) {
    return candidate;
  }
  return null;
}

/**
 * Client IP from `x-vercel-forwarded-for` only.
 * Vercel documents that header as the copy that a proxy in front of Vercel
 * cannot overwrite. `x-forwarded-for` and `x-real-ip` are documented as the
 * same header family and are not used. Off-platform, or when the platform
 * header is missing, every caller shares one untrusted bucket.
 */
export function resolveClientIp(req: NextRequest): { ip: string; trusted: boolean } {
  if (process.env.VERCEL === "1") {
    const platformIp = firstValidIp(req.headers.get("x-vercel-forwarded-for"));
    if (platformIp) {
      return { ip: platformIp, trusted: true };
    }
  }
  return { ip: "untrusted", trusted: false };
}

function applyMemoryLimit(key: string, options: RateLimitOptions): NextResponse | null {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now > existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return null;
  }

  if (existing.count >= options.maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return tooMany(retryAfterSeconds);
  }

  existing.count += 1;
  buckets.set(key, existing);
  return null;
}

function isMissingLimiter(error: { code?: string; message?: string }): boolean {
  const code = error.code ?? "";
  if (code === "PGRST202" || code === "42883") return true;
  const message = (error.message ?? "").toLowerCase();
  return message.includes("could not find the function") || message.includes("does not exist");
}

function readDecision(data: unknown): RateLimitDecision {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid rate limit response");
  }
  const record = data as { allowed?: unknown; retry_after_seconds?: unknown };
  if (record.allowed === true) return { allowed: true };
  if (record.allowed === false) {
    const retry = Number(record.retry_after_seconds);
    const retryAfterSeconds = Number.isFinite(retry) && retry > 0 ? Math.ceil(retry) : 1;
    return { allowed: false, retryAfterSeconds };
  }
  throw new Error("Invalid rate limit response");
}

async function consumeDurable(
  key: string,
  options: RateLimitOptions
): Promise<RateLimitDecision> {
  if (durableStoreOverride) {
    return durableStoreOverride(key, options.windowMs, options.maxRequests);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("consume_rate_limit", {
    p_key: key,
    p_window_ms: options.windowMs,
    p_max: options.maxRequests,
  });
  if (error) {
    const failure = new Error(error.message || "Rate limit store failed");
    if (isMissingLimiter(error)) {
      failure.name = "RateLimitNotConfiguredError";
    }
    throw failure;
  }
  return readDecision(data);
}

function durableRequested(): boolean {
  return process.env.RATE_LIMIT_DURABLE === "true";
}

export async function applyRateLimit(
  req: NextRequest,
  options: RateLimitOptions
): Promise<NextResponse | null> {
  const { ip } = resolveClientIp(req);
  const key = `${options.keyPrefix}:${ip}`;

  if (!durableRequested()) {
    return applyMemoryLimit(key, options);
  }

  try {
    const decision = await consumeDurable(key, options);
    durableConfirmed = true;
    if (!decision.allowed) {
      return tooMany(decision.retryAfterSeconds);
    }
    return null;
  } catch {
    durableConfirmed = false;
    return unavailable();
  }
}
