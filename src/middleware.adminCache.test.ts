import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

describe("admin cache headers", () => {
  it("marks the admin sales page private and uncached", () => {
    const response = middleware(new NextRequest("http://localhost/dashboard/admin/sales"));
    expect(response.headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
  });

  it("marks admin APIs private and uncached", () => {
    const response = middleware(new NextRequest("http://localhost/api/admin/event-sales"));
    expect(response.headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
  });
});
