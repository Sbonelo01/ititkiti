import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applyRateLimit } from "@/utils/rateLimit";
import { extractBearerToken } from "@/server/auth/staffAuth";
import { requireSuperAdminAuth } from "@/server/auth/superAdminAuth";
import {
  findAuthUsersByEmail,
  toAdminUserView,
  updateAuthUserRole,
} from "@/server/auth/userRoleAdmin";
import { ASSIGNABLE_ROLES } from "@/utils/roles";

const searchQuerySchema = z.object({
  email: z.string().trim().min(3).max(320),
});

const updateBodySchema = z.object({
  email: z.string().trim().email().max(320),
  role: z.enum(ASSIGNABLE_ROLES),
});

const RATE_LIMIT = {
  keyPrefix: "admin-users",
  windowMs: 60_000,
  maxRequests: 20,
} as const;

async function requireGate(req: NextRequest) {
  const rateLimited = applyRateLimit(req, RATE_LIMIT);
  if (rateLimited) return { ok: false as const, response: rateLimited };

  const auth = await requireSuperAdminAuth(
    extractBearerToken(req.headers.get("authorization"))
  );
  if (!auth.ok) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: auth.error }, { status: auth.status }),
    };
  }

  return { ok: true as const };
}

export async function GET(req: NextRequest) {
  const gate = await requireGate(req);
  if (!gate.ok) return gate.response;

  const parsed = searchQuerySchema.safeParse({
    email: req.nextUrl.searchParams.get("email") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Email query is required" }, { status: 400 });
  }

  try {
    const users = await findAuthUsersByEmail(parsed.data.email);
    return NextResponse.json({
      success: true,
      users: users.map(toAdminUserView),
    });
  } catch {
    return NextResponse.json({ error: "Failed to search users" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const gate = await requireGate(req);
  if (!gate.ok) return gate.response;

  try {
    const body = await req.json();
    const parsed = updateBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email or role" }, { status: 400 });
    }

    const matches = await findAuthUsersByEmail(parsed.data.email);
    const existing = matches.find(
      (user) => (user.email ?? "").toLowerCase() === parsed.data.email.trim().toLowerCase()
    );
    if (!existing) {
      return NextResponse.json(
        { error: "No account found for that email. They must sign up first." },
        { status: 404 }
      );
    }

    const updated = await updateAuthUserRole(existing.id, parsed.data.role);
    if (!updated.ok) {
      return NextResponse.json({ error: updated.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: toAdminUserView(updated.user),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
