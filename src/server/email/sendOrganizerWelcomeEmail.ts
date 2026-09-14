import { BRAND, ORGANIZER_APP, APP_STORE_URL, PLAY_STORE_URL } from "@/constants/branding";
import { ORGANIZER_COPY } from "@/constants/organizerCopy";
import { getEventShareUrl, getSiteOrigin } from "@/utils/eventShare";

export function isTransactionalEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function buildOrganizerWelcomeEmail(input: {
  eventTitle: string;
  eventId: string;
  organizerName?: string;
}): { subject: string; html: string; text: string } {
  const hello = input.organizerName?.trim() ? `Hi ${input.organizerName.trim()},` : "Hi,";
  const eventUrl = getEventShareUrl(input.eventId);
  const dashboardUrl = `${getSiteOrigin()}/dashboard`;
  const invoicesUrl = `${getSiteOrigin()}/dashboard/invoices`;
  const appStore = APP_STORE_URL || "Coming soon on the App Store";
  const playStore = PLAY_STORE_URL || "Coming soon on Google Play";

  const subject = ORGANIZER_COPY.email.subject(input.eventTitle);
  const text = [
    hello,
    "",
    `${input.eventTitle} is live on ${BRAND.name}.`,
    ORGANIZER_COPY.onboarding.subhead(input.eventTitle),
    "",
    `Public page: ${eventUrl}`,
    `Dashboard: ${dashboardUrl}`,
    "",
    ORGANIZER_COPY.onboarding.scannerTitle,
    ORGANIZER_COPY.onboarding.scannerBody,
    `iOS: ${appStore}`,
    `Android: ${playStore}`,
    "",
    ORGANIZER_COPY.onboarding.invoiceTitle,
    ORGANIZER_COPY.onboarding.invoiceBody,
    `Invoices: ${invoicesUrl}`,
    "",
    ...ORGANIZER_COPY.onboarding.confidenceItems,
    "",
    `— ${BRAND.name}`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;line-height:1.5;color:#111;background:#f7faf7;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #e5e7eb;">
    <p style="font-size:13px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:.04em;margin:0 0 8px;">${BRAND.name}</p>
    <h1 style="font-size:22px;margin:0 0 12px;">${ORGANIZER_COPY.onboarding.headline}</h1>
    <p>${hello}</p>
    <p>${ORGANIZER_COPY.onboarding.subhead(input.eventTitle)}</p>
    <p><a href="${eventUrl}" style="color:#15803d;font-weight:600;">Open your public event page</a> · <a href="${dashboardUrl}" style="color:#15803d;font-weight:600;">Dashboard</a></p>
    <h2 style="font-size:16px;margin:24px 0 8px;">${ORGANIZER_COPY.onboarding.scannerTitle}</h2>
    <p>${ORGANIZER_COPY.onboarding.scannerBody}</p>
    <p style="font-size:14px;">${ORGANIZER_APP.name}: ${appStore} · ${playStore}</p>
    <h2 style="font-size:16px;margin:24px 0 8px;">${ORGANIZER_COPY.onboarding.invoiceTitle}</h2>
    <p>${ORGANIZER_COPY.onboarding.invoiceBody}</p>
    <p><a href="${invoicesUrl}" style="color:#15803d;font-weight:600;">Invoice dashboard</a></p>
    <ul>${ORGANIZER_COPY.onboarding.confidenceItems.map((item) => `<li>${item}</li>`).join("")}</ul>
    <p style="font-size:13px;color:#6b7280;margin-top:28px;">IZIBONELO TECH PTY LTD · tikiti.fun</p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}

export type SendOrganizerWelcomeEmailInput = {
  to: string;
  eventTitle: string;
  eventId: string;
  organizerName?: string;
};

export type SendOrganizerWelcomeEmailResult =
  | { ok: true; id: string }
  | { ok: false; skipped: true; reason: "not_configured" | "no_recipient" }
  | { ok: false; skipped: false; reason: string };

type FetchLike = typeof fetch;

export async function sendOrganizerWelcomeEmail(
  input: SendOrganizerWelcomeEmailInput,
  deps: { fetchImpl?: FetchLike } = {}
): Promise<SendOrganizerWelcomeEmailResult> {
  const to = input.to.trim();
  if (!to) {
    return { ok: false, skipped: true, reason: "no_recipient" };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, skipped: true, reason: "not_configured" };
  }

  const from = process.env.RESEND_FROM_EMAIL?.trim() || "Tikiti <hello@tikiti.fun>";
  const payload = buildOrganizerWelcomeEmail(input);
  const fetchImpl = deps.fetchImpl ?? fetch;

  try {
    const res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    if (!res.ok) {
      return { ok: false, skipped: false, reason: `resend_http_${res.status}` };
    }

    const body = (await res.json()) as { id?: string };
    return { ok: true, id: body.id || "sent" };
  } catch {
    return { ok: false, skipped: false, reason: "network_error" };
  }
}
