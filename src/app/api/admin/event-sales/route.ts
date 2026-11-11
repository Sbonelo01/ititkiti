import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { extractBearerToken } from "@/server/auth/staffAuth";
import { requireSuperAdminAuth } from "@/server/auth/superAdminAuth";
import { loadEventSalesDashboard } from "@/server/admin/loadEventSalesDashboard";
import { applyRateLimit } from "@/utils/rateLimit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const querySchema = z.object({
  q: z.string().trim().max(200),
  when: z.enum(["all", "upcoming", "past"]),
  page: z.coerce.number().int().min(1).max(10_000),
});

function json(body: unknown, status = 200): NextResponse {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Vary", "Authorization");
  return response;
}

export async function GET(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, {
    keyPrefix: "admin-event-sales",
    windowMs: 60_000,
    maxRequests: 30,
  });
  if (rateLimited) {
    rateLimited.headers.set("Cache-Control", "private, no-store, max-age=0");
    rateLimited.headers.set("Vary", "Authorization");
    return rateLimited;
  }

  const auth = await requireSuperAdminAuth(extractBearerToken(req.headers.get("authorization")));
  if (!auth.ok) {
    return json({ error: auth.error }, auth.status);
  }

  const parsed = querySchema.safeParse({
    q: req.nextUrl.searchParams.get("q") ?? "",
    when: req.nextUrl.searchParams.get("when") ?? "all",
    page: req.nextUrl.searchParams.get("page") ?? "1",
  });
  if (!parsed.success) {
    return json({ error: "Invalid sales filter" }, 400);
  }

  try {
    const report = await loadEventSalesDashboard({
      search: parsed.data.q,
      when: parsed.data.when,
      page: parsed.data.page,
    });
    return json(report);
  } catch {
    return json({ error: "Failed to load event sales" }, 500);
  }
}
