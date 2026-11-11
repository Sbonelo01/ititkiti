import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";
import { resetRateLimitBucketsForTests } from "@/utils/rateLimit";

vi.mock("@/server/supabaseAdmin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

const SUPER_ADMIN = {
  id: "founder-1",
  email: "sbonelomkhize15@gmail.com",
  app_metadata: { role: "admin" },
  user_metadata: { role: "attendee" },
};

function request(url = "http://localhost/api/admin/event-sales", token?: string) {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  return new NextRequest(url, { headers });
}

function mockClient(user: Record<string, unknown> | null, options?: { query?: boolean; error?: string }) {
  const from = vi.fn((table: string) => {
    if (!options?.query) {
      throw new Error("privileged query");
    }
    if (options.error) {
      return {
        select: () => ({
          order: () => ({
            range: () => Promise.resolve({ data: null, error: { message: options.error } }),
          }),
        }),
      };
    }
    const rows =
      table === "events"
        ? [
            {
              id: "evt-a",
              title: "Durban Jazz",
              date: "2026-12-01T18:00:00.000Z",
              organizer_id: "org-a",
            },
            {
              id: "evt-b",
              title: "Cape Market",
              date: "2024-01-01T18:00:00.000Z",
              organizer_id: "org-b",
            },
          ]
        : table === "tickets"
          ? [
              {
                id: "t1",
                event_id: "evt-a",
                payment_status: "paid",
                paystack_reference: "ref-a",
                email: "buyer-secret@example.com",
              },
              {
                id: "t2",
                event_id: "evt-b",
                payment_status: "failed",
                paystack_reference: "ref-b",
              },
            ]
          : [];
    return {
      select: () => ({
        order: () => ({
          range: () => Promise.resolve({ data: rows, error: null }),
        }),
      }),
    };
  });

  vi.mocked(getSupabaseAdmin).mockReturnValue({
    auth: {
      getUser: vi.fn(async () => ({ data: { user }, error: user ? null : { message: "invalid" } })),
      admin: {
        getUserById: vi.fn(async (id: string) => ({
          data: {
            user: {
              id,
              email: "hidden-organiser@example.com",
              user_metadata: { company_name: id === "org-a" ? "Durban Jazz Co" : "Cape Market Co" },
            },
          },
          error: null,
        })),
      },
    },
    from,
  } as never);
  return from;
}

describe("/api/admin/event-sales", () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests();
    vi.mocked(getSupabaseAdmin).mockReset();
  });

  it("returns 401 without a session and does not query sales", async () => {
    const from = mockClient(null);
    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(res.headers.get("Cache-Control")).toContain("private");
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it("returns 401 for an invalid session", async () => {
    const from = mockClient(null);
    const res = await GET(request("http://localhost/api/admin/event-sales", "token"));
    expect(res.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it("returns 403 for staff, another admin, and the founder email without app_metadata admin", async () => {
    const cases = [
      {
        id: "staff-1",
        email: "sbonelomkhize15@gmail.com",
        app_metadata: { role: "staff" },
        user_metadata: { role: "attendee" },
      },
      {
        id: "admin-2",
        email: "other-admin@example.com",
        app_metadata: { role: "admin" },
        user_metadata: {},
      },
      {
        id: "founder-1",
        email: "SboneloMkhize15@Gmail.com",
        app_metadata: {},
        user_metadata: { role: "admin" },
      },
      {
        id: "org-1",
        email: "organizer@example.com",
        app_metadata: {},
        user_metadata: { role: "organizer" },
      },
    ];
    for (const user of cases) {
      const from = mockClient(user);
      const res = await GET(request("http://localhost/api/admin/event-sales", "token"));
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "Forbidden" });
      expect(from).not.toHaveBeenCalled();
    }
  });

  it("returns both organisers for the super admin without buyer or organiser email", async () => {
    mockClient(SUPER_ADMIN, { query: true });
    const res = await GET(request("http://localhost/api/admin/event-sales?when=all&page=1", "token"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
    const body = await res.json();
    expect(body.events.map((event: { title: string; organizerLabel: string }) => event.title)).toEqual([
      "Durban Jazz",
      "Cape Market",
    ]);
    expect(body.events.map((event: { organizerLabel: string }) => event.organizerLabel)).toEqual([
      "Durban Jazz Co",
      "Cape Market Co",
    ]);
    expect(body.totals).toMatchObject({
      paidTickets: 1,
      referencedOrders: 1,
      excludedNonPaidTickets: 1,
      moneyStatus: "incomplete",
      faceValueZar: null,
    });
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("buyer-secret@example.com");
    expect(serialized).not.toContain("hidden-organiser@example.com");
    expect(serialized).not.toContain("user_metadata");
  });

  it("applies the time filter before totals", async () => {
    mockClient(SUPER_ADMIN, { query: true });
    const res = await GET(request("http://localhost/api/admin/event-sales?when=past", "token"));
    const body = await res.json();
    expect(body.events).toHaveLength(1);
    expect(body.events[0].title).toBe("Cape Market");
    expect(body.totals.paidTickets).toBe(0);
    expect(body.totals.moneyStatus).toBe("no_sales");
    expect(body.totals.faceValueZar).toBe(0);
  });

  it("rejects a bad filter before querying", async () => {
    const from = mockClient(SUPER_ADMIN, { query: true });
    const res = await GET(request("http://localhost/api/admin/event-sales?when=draft", "token"));
    expect(res.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it("hides database errors", async () => {
    mockClient(SUPER_ADMIN, { query: true, error: "relation payment_receipts is private" });
    const res = await GET(request("http://localhost/api/admin/event-sales", "token"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Failed to load event sales" });
    expect(JSON.stringify(body)).not.toContain("payment_receipts");
  });

  it("keeps the route on the super-admin helper and the page off the service role", () => {
    const route = readFileSync(path.resolve(process.cwd(), "src/app/api/admin/event-sales/route.ts"), "utf8");
    const page = readFileSync(path.resolve(process.cwd(), "src/components/admin/AdminEventSalesPage.tsx"), "utf8");
    const adminPage = readFileSync(path.resolve(process.cwd(), "src/app/dashboard/admin/page.tsx"), "utf8");
    const dashboard = readFileSync(path.resolve(process.cwd(), "src/app/dashboard/page.tsx"), "utf8");
    expect(route).toContain("requireSuperAdminAuth");
    expect(route).not.toContain("user_metadata");
    expect(route).not.toContain("isStaffOrAdmin");
    expect(page).toContain('cache: "no-store"');
    expect(page).toContain("isSuperAdminUser");
    expect(page).not.toContain("getSupabaseAdmin");
    expect(page).not.toContain("payment_receipts");
    expect(adminPage).not.toContain("computeBuyerServiceFeeZar");
    expect(adminPage).not.toContain("payment_status");
    expect(adminPage).toContain("/dashboard/admin/sales");
    expect(dashboard).toContain("isSuperAdminUser");
    expect(dashboard).toContain("AdminEventSalesPage");
    expect(dashboard).toContain('get("view") === "mine"');
    expect(dashboard).not.toContain("user_metadata.role");
  });
});
