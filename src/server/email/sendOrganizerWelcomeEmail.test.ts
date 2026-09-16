import { describe, expect, it, vi, afterEach } from "vitest";
import { ORGANIZER_COPY } from "@/constants/organizerCopy";
import {
  buildOrganizerWelcomeEmail,
  isTransactionalEmailConfigured,
  sendOrganizerWelcomeEmail,
} from "./sendOrganizerWelcomeEmail";

describe("sendOrganizerWelcomeEmail", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses ads welcome copy including settlement step 3", () => {
    const email = buildOrganizerWelcomeEmail({
      eventTitle: "Jazz Night",
      eventId: "evt-1",
      organizerName: "Sbonelo Dlamini",
    });
    expect(email.subject).toBe(ORGANIZER_COPY.email.subject);
    expect(email.text).toContain("Hi Sbonelo,");
    expect(email.text).toContain("You made the right call listing Jazz Night on Tikiti.");
    expect(email.text).toContain(ORGANIZER_COPY.email.nextStepShare);
    expect(email.text).toContain(ORGANIZER_COPY.email.nextStepScanner);
    expect(email.text).toContain(ORGANIZER_COPY.email.nextStepInvoice);
    expect(email.text).toContain(ORGANIZER_COPY.email.reminder);
    expect(email.text).toContain(ORGANIZER_COPY.email.contact);
    expect(email.html).toContain("<strong>Jazz Night</strong>");
    expect(email.html).toContain("<strong>Tikiti Scanner</strong>");
    expect(email.html).toContain("<strong>settlement invoice</strong>");
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
    expect(body.subject).toBe(ORGANIZER_COPY.email.subject);
  });
});
