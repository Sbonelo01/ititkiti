import { describe, expect, it, vi, afterEach } from "vitest";
import { ORGANIZER_COPY } from "@/constants/organizerCopy";
import {
  buildOrganizerWelcomeEmail,
  isTransactionalEmailConfigured,
  resolveBrevoSender,
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

  it("skips sending when BREVO_API_KEY is unset", async () => {
    vi.stubEnv("BREVO_API_KEY", "");
    vi.stubEnv("RESEND_API_KEY", "re_ignored");
    expect(isTransactionalEmailConfigured()).toBe(false);
    const fetchImpl = vi.fn();
    const result = await sendOrganizerWelcomeEmail(
      { to: "org@test.com", eventTitle: "Jazz Night", eventId: "evt-1" },
      { fetchImpl: fetchImpl as unknown as typeof fetch }
    );
    expect(result).toEqual({ ok: false, skipped: true, reason: "not_configured" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("posts to Brevo and falls back to Tikiti <hello@tikiti.fun>", async () => {
    vi.stubEnv("BREVO_API_KEY", "xkeysib-test");
    vi.stubEnv("BREVO_FROM_EMAIL", "");
    vi.stubEnv("BREVO_FROM_NAME", "");
    expect(resolveBrevoSender()).toEqual({ name: "Tikiti", email: "hello@tikiti.fun" });
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messageId: "<msg-1@brevo>" }),
    });
    const result = await sendOrganizerWelcomeEmail(
      {
        to: "org@test.com",
        eventTitle: "Jazz Night",
        eventId: "evt-1",
        idempotencyKey: "organizer-welcome:evt-1",
      },
      { fetchImpl: fetchImpl as unknown as typeof fetch }
    );
    expect(result).toEqual({ ok: true, id: "<msg-1@brevo>" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    const headers = init.headers as Record<string, string>;
    expect(headers["api-key"]).toBe("xkeysib-test");
    expect(headers.Authorization).toBeUndefined();
    expect(headers["Idempotency-Key"]).toBeUndefined();
    const body = JSON.parse(String(init.body)) as {
      sender: { name: string; email: string };
      to: { email: string }[];
      subject: string;
      htmlContent: string;
      textContent: string;
    };
    expect(body.sender).toEqual({ name: "Tikiti", email: "hello@tikiti.fun" });
    expect(body.to).toEqual([{ email: "org@test.com" }]);
    expect(body.subject).toBe(ORGANIZER_COPY.email.subject);
    expect(body.htmlContent).toContain("Jazz Night");
    expect(body.textContent).toContain("Jazz Night");
  });

  it("uses BREVO_FROM_EMAIL and BREVO_FROM_NAME when set", () => {
    vi.stubEnv("BREVO_FROM_EMAIL", "Tikiti <hello@tikiti.fun>");
    vi.stubEnv("BREVO_FROM_NAME", "Tikiti Events");
    expect(resolveBrevoSender()).toEqual({ name: "Tikiti Events", email: "hello@tikiti.fun" });
  });
});
