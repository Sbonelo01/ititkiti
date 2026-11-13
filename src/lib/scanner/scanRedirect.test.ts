import { describe, expect, it } from "vitest";
import {
  allowlistedScanRedirect,
  scannerAccessPath,
  scanReturnPath,
} from "@/lib/scanner/scanRedirect";

const EVENT_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("scanner redirect allowlist", () => {
  it("keeps /scan and a single event id", () => {
    expect(allowlistedScanRedirect("/scan")).toBe("/scan");
    expect(allowlistedScanRedirect(`/scan?event=${EVENT_ID}`)).toBe(`/scan?event=${EVENT_ID}`);
    expect(allowlistedScanRedirect(`/scan?event=${EVENT_ID.toUpperCase()}`)).toBe(
      `/scan?event=${EVENT_ID}`
    );
    expect(scanReturnPath(`  ${EVENT_ID.toUpperCase()}  `)).toBe(`/scan?event=${EVENT_ID}`);
  });

  it("drops open redirects, extra parameters, and non-scan paths", () => {
    expect(allowlistedScanRedirect("https://evil.example/scan")).toBe("/scan");
    expect(allowlistedScanRedirect("https://www.tikiti.fun/scan?event=" + EVENT_ID)).toBe("/scan");
    expect(allowlistedScanRedirect("//evil.example/scan")).toBe("/scan");
    expect(allowlistedScanRedirect("/\\scan")).toBe("/scan");
    expect(allowlistedScanRedirect("/scan?event=" + EVENT_ID + "&next=https://evil.example")).toBe(
      "/scan"
    );
    expect(allowlistedScanRedirect("/dashboard")).toBe("/scan");
    expect(allowlistedScanRedirect("/scan?event=not-an-id")).toBe("/scan");
    expect(allowlistedScanRedirect(`/scan?event=${EVENT_ID}#token`)).toBe("/scan");
    expect(allowlistedScanRedirect(null)).toBe("/scan");
  });

  it("builds an access URL only for an allowlisted event", () => {
    expect(scannerAccessPath(EVENT_ID)).toBe(`/api/scanner/access?eventId=${EVENT_ID}`);
    expect(scannerAccessPath("https://evil.example")).toBe("/api/scanner/access");
    expect(scannerAccessPath(null)).toBe("/api/scanner/access");
  });
});
