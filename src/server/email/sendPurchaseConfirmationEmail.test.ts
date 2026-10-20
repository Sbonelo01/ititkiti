import { describe, expect, it, vi, afterEach } from "vitest";
import { zarToKobo } from "@/constants/pricing";
import { ORGANIZER_COPY } from "@/constants/organizerCopy";
import {
  buildPurchaseConfirmationEmail,
  formatEventWhen,
  renderTicketQrPng,
  resolveTicketFaceValue,
  sendPurchaseConfirmationEmail,
} from "./sendPurchaseConfirmationEmail";

const DASHBOARD = "https://www.tikiti.fun/dashboard";

const mixedTickets = [
  { typeName: "General", attendeeName: "Thandi Nkosi", unitPriceZar: 40, qrCodeData: "QR-LOW-1" },
  { typeName: "General", attendeeName: "Thandi Nkosi", unitPriceZar: 40, qrCodeData: "QR-LOW-2" },
  { typeName: "VIP", attendeeName: "Thandi Nkosi", unitPriceZar: 250, qrCodeData: "QR-VIP" },
];

describe("buildPurchaseConfirmationEmail", () => {
  it("uses buyer-paid pricing, the Paystack reference, and no inline QR image", () => {
    const email = buildPurchaseConfirmationEmail({
      eventTitle: "Jazz Night",
      eventWhen: "Saturday, 20 June 2026 at 18:00",
      venue: "The Commons, Cape Town",
      reference: "PSK&<1>",
      buyerName: "Thandi Nkosi",
      dashboardUrl: DASHBOARD,
      tickets: mixedTickets,
      attachmentNames: ["ticket-1.png", "ticket-2.png", "ticket-3.png"],
    });

    // 40+5, 40+5, 250+12.50 = 352.50 — same total as computeExpectedAmountKobo.
    expect(zarToKobo(email.amounts.totalPaidZar)).toBe(35250);
    expect(email.amounts).toEqual({
      faceValueZar: 330,
      platformFeeZar: 22.5,
      totalPaidZar: 352.5,
    });
    expect(email.subject).toBe("Your tickets for Jazz Night");
    expect(email.text).toContain("Hi Thandi,");
    expect(email.text).toContain("Saturday, 20 June 2026 at 18:00");
    expect(email.text).toContain("The Commons, Cape Town");
    expect(email.text).toContain("General — Thandi Nkosi · R40.00");
    expect(email.text).toContain("VIP — Thandi Nkosi · R250.00");
    expect(email.text).toContain("Ticket price: R330.00");
    expect(email.text).toContain("Platform fee: R22.50");
    expect(email.text).toContain("Total paid: R352.50");
    expect(email.text).toContain("The organizer keeps the full ticket price.");
    expect(email.text).toContain("Payment reference: PSK&<1>");
    expect(email.text).toContain("ticket-1.png");
    expect(email.text).toContain(DASHBOARD);
    expect(email.text).toContain(ORGANIZER_COPY.email.contact);
    expect(email.html).toContain("<strong>Jazz Night</strong>");
    expect(email.html).toContain("PSK&amp;&lt;1&gt;");
    expect(email.html).not.toContain("PSK&<1>");
    expect(email.html).not.toContain("data:image");
    expect(email.html).toContain(`href="${DASHBOARD}"`);
    expect(email.html).toContain("tikiti.");
    expect(email.html).toContain("R352.50");
  });

  it("formats the event in South African time", () => {
    expect(formatEventWhen("2026-06-20T16:00:00.000Z")).toBe("Saturday, 20 June 2026 at 18:00");
  });

  it("resolves face value from the ticket type, then the event price", () => {
    expect(resolveTicketFaceValue([{ name: "VIP", price: "250" }], 10)).toEqual({
      typeName: "VIP",
      unitPriceZar: 250,
    });
    expect(resolveTicketFaceValue({ name: "General", price: 40 }, 10)).toEqual({
      typeName: "General",
      unitPriceZar: 40,
    });
    expect(resolveTicketFaceValue(null, 30)).toEqual({
      typeName: "General",
      unitPriceZar: 30,
    });
  });
});

describe("sendPurchaseConfirmationEmail", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("skips sending when BREVO_API_KEY is unset", async () => {
    vi.stubEnv("BREVO_API_KEY", "");
    const fetchImpl = vi.fn();
    const result = await sendPurchaseConfirmationEmail(
      {
        to: "guest@example.com",
        reference: "REF-1",
        eventTitle: "Jazz Night",
        eventWhen: "Saturday, 20 June 2026 at 18:00",
        venue: "Cape Town",
        dashboardUrl: DASHBOARD,
        tickets: mixedTickets,
      },
      { fetchImpl: fetchImpl as unknown as typeof fetch }
    );
    expect(result).toEqual({ ok: false, skipped: true, reason: "not_configured" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("posts amounts, the reference, and QR attachments to Brevo", async () => {
    vi.stubEnv("BREVO_API_KEY", "xkeysib-test");
    vi.stubEnv("BREVO_FROM_EMAIL", "");
    vi.stubEnv("BREVO_FROM_NAME", "");
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messageId: "<msg-1@brevo>" }),
    });
    const renderQr = vi.fn(async (data: string) => Buffer.from(`png:${data}`));
    const result = await sendPurchaseConfirmationEmail(
      {
        to: " guest@example.com ",
        reference: "PSK&<1>",
        buyerName: "Thandi Nkosi",
        eventTitle: "Jazz Night",
        eventWhen: "Saturday, 20 June 2026 at 18:00",
        venue: "The Commons, Cape Town",
        dashboardUrl: DASHBOARD,
        tickets: mixedTickets,
        idempotencyKey: "purchase-confirmation:PSK&<1>",
      },
      { fetchImpl: fetchImpl as unknown as typeof fetch, renderQr }
    );

    expect(result).toEqual({ ok: true, id: "<msg-1@brevo>" });
    expect(renderQr).toHaveBeenCalledTimes(3);
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
      attachment: { name: string; content: string }[];
    };
    expect(body.sender).toEqual({ name: "Tikiti", email: "hello@tikiti.fun" });
    expect(body.to).toEqual([{ email: "guest@example.com" }]);
    expect(body.subject).toBe("Your tickets for Jazz Night");
    expect(body.textContent).toContain("Payment reference: PSK&<1>");
    expect(body.textContent).toContain("Total paid: R352.50");
    expect(body.textContent).toContain("Platform fee: R22.50");
    expect(body.htmlContent).toContain("R352.50");
    expect(body.htmlContent).not.toContain("data:image");
    expect(body.attachment.map((file) => file.name)).toEqual([
      "ticket-1.png",
      "ticket-2.png",
      "ticket-3.png",
    ]);
    expect(body.attachment[0]?.content).toBe(Buffer.from("png:QR-LOW-1").toString("base64"));
    expect(body.htmlContent).not.toContain(body.attachment[0]?.content);
  });

  it("treats a 2xx with an unreadable body as sent", async () => {
    vi.stubEnv("BREVO_API_KEY", "xkeysib-test");
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error("invalid json");
      },
    });
    const result = await sendPurchaseConfirmationEmail(
      {
        to: "guest@example.com",
        reference: "REF-1",
        eventTitle: "Jazz Night",
        eventWhen: "Saturday, 20 June 2026 at 18:00",
        venue: "Cape Town",
        dashboardUrl: DASHBOARD,
        tickets: [mixedTickets[0]!],
      },
      {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        renderQr: async () => Buffer.from("png"),
      }
    );
    expect(result).toEqual({ ok: true, id: "sent" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns a failure when Brevo rejects the message", async () => {
    vi.stubEnv("BREVO_API_KEY", "xkeysib-test");
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "upstream",
    });
    const result = await sendPurchaseConfirmationEmail(
      {
        to: "guest@example.com",
        reference: "REF-1",
        eventTitle: "Jazz Night",
        eventWhen: "Saturday, 20 June 2026 at 18:00",
        venue: "Cape Town",
        dashboardUrl: DASHBOARD,
        tickets: [mixedTickets[0]!],
      },
      {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        renderQr: async () => Buffer.from("png"),
      }
    );
    expect(result).toEqual({
      ok: false,
      skipped: false,
      reason: "brevo_http_500",
      detail: "upstream",
    });
  });

  it("renders a PNG QR code", async () => {
    const png = await renderTicketQrPng("TICKET-abc");
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  });
});
