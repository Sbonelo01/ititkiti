import { NextRequest, NextResponse } from "next/server";

type RateLimitOptions = {
  keyPrefix: string;
  windowMs: number;
  maxRequests: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return "unknown";
}

export function applyRateLimit(req: NextRequest, options: RateLimitOptions): NextResponse | null {
  const now = Date.now();
  const ip = getClientIp(req);
  const key = `${options.keyPrefix}:${ip}`;
  const existing = buckets.get(key);

  if (!existing || now > existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return null;
  }

  if (existing.count >= options.maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
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

  existing.count += 1;
  buckets.set(key, existing);
  return null;
}
