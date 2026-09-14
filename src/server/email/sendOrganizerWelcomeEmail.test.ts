import { describe, expect, it, vi, afterEach } from "vitest";
import {
  buildOrganizerWelcomeEmail,
  isTransactionalEmailConfigured,
  sendOrganizerWelcomeEmail,
} from "./sendOrganizerWelcomeEmail";

describe("sendOrganizerWelcomeEmail", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds subject and mirrors share + scanner steps only", () => {
    const email = buildOrganizerWelcomeEmail({
      eventTitle: "Jazz Night",
      eventId: "evt-1",
      organizerName: "Sbonelo",
    });
    expect(email.subject).toContain("Jazz Night");
    expect(email.text).toContain("Hi Sbonelo");
    expect(email.text.toLowerCase()).toContain("scanner");
    expect(email.text.toLowerCase()).toContain("share");
    expect(email.text.toLowerCase()).not.toContain("settlement");
    expect(email.html).toContain("Jazz Night");
  });

  it("skips sending when RESEND_API_KEY is unset", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect(isTransactionalEmailConfigured()).toBe(false);
    const fetchImpl = vi.fn();
    const result = await sendOrganizerWelcomeEmail(
      { to: "org@test.com", eventTitle: "Jazz Night", eventId: "evt-1" },
      { fetchImpl: fetchImpl as unknown as typeof fetch }
    );
    expect(result).toEqual({ ok: false, skipped: true, reason: "not_configured" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("posts to Resend when configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("RESEND_FROM_EMAIL", "Tikiti <hello@tikiti.fun>");
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "email_1" }),
    });
    const result = await sendOrganizerWelcomeEmail(
      { to: "org@test.com", eventTitle: "Jazz Night", eventId: "evt-1" },
      { fetchImpl: fetchImpl as unknown as typeof fetch }
    );
    expect(result).toEqual({ ok: true, id: "email_1" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer re_test");
    const body = JSON.parse(String(init.body)) as { to: string[]; subject: string };
    expect(body.to).toEqual(["org@test.com"]);
    expect(body.subject).toContain("Jazz Night");
  });
});
