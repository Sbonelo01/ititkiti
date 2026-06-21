import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  buildEventShareMessage,
  buildWhatsAppShareUrl,
  getEventShareUrl,
} from "@/utils/eventShare";

describe("eventShare", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://tikiti.fun");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds canonical event URLs", () => {
    expect(getEventShareUrl("abc-123")).toBe("https://tikiti.fun/events/abc-123");
  });

  it("builds share message with event details", () => {
    const message = buildEventShareMessage({
      eventId: "abc-123",
      title: "Summer Fest",
      dateLabel: "Sat, 20 Jun",
      location: "Cape Town",
      priceLabel: "From R150",
    });
    expect(message).toContain("Summer Fest");
    expect(message).toContain("https://tikiti.fun/events/abc-123");
    expect(message).toContain("Cape Town");
  });

  it("encodes WhatsApp share URLs", () => {
    const url = buildWhatsAppShareUrl("Hello world");
    expect(url).toContain("wa.me");
    expect(url).toContain(encodeURIComponent("Hello world"));
  });
});
