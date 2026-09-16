import { ORGANIZER_COPY, interpolateOrganizerCopy, organizerFirstName } from "@/constants/organizerCopy";
import { getEventShareUrl } from "@/utils/eventShare";

export function isTransactionalEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function withBold(text: string, phrase: string): string {
  return escapeHtml(text).replaceAll(escapeHtml(phrase), `<strong>${escapeHtml(phrase)}</strong>`);
}

export function buildOrganizerWelcomeEmail(input: {
  eventTitle: string;
  eventId: string;
  organizerName?: string;
}): { subject: string; html: string; text: string } {
  const copy = ORGANIZER_COPY.email;
  const firstName = organizerFirstName(input.organizerName);
  const hello = firstName
    ? interpolateOrganizerCopy(copy.greeting, { organizer_first_name: firstName })
    : "Hi,";
  const intro = interpolateOrganizerCopy(copy.intro, { event_name: input.eventTitle });
  const eventUrl = getEventShareUrl(input.eventId);

  const subject = copy.subject;
  const text = [
    hello,
    "",
    intro,
    "",
    copy.attendees,
    "",
    copy.nextStepsTitle,
    `1. ${copy.nextStepShare}`,
    eventUrl,
    `2. ${copy.nextStepScanner}`,
    `3. ${copy.nextStepInvoice}`,
    "",
    copy.reminder,
    "",
    copy.contact,
    "",
    copy.signoff,
    copy.signoffName,
    copy.site,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;line-height:1.5;color:#111;background:#F0FDF4;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #dcfce7;">
    <p style="display:inline-block;background:#16A34A;color:#fff;border-radius:999px;padding:4px 12px;font-size:14px;font-weight:600;letter-spacing:-0.02em;">tikiti.</p>
    <p>${escapeHtml(hello)}</p>
    <p>${withBold(intro, input.eventTitle)}</p>
    <p>${withBold(copy.attendees, "Tikiti Scanner")}</p>
    <p><strong>${escapeHtml(copy.nextStepsTitle)}</strong></p>
    <ol style="padding-left:20px;">
      <li>${escapeHtml(copy.nextStepShare)}<br /><a href="${escapeHtml(eventUrl)}" style="color:#15803d;font-weight:600;">${escapeHtml(eventUrl)}</a></li>
      <li>${escapeHtml(copy.nextStepScanner)}</li>
      <li>${withBold(copy.nextStepInvoice, "settlement invoice")}</li>
    </ol>
    <p>${withBold(copy.reminder, "100% of ticket face value")}</p>
    <p>${escapeHtml(copy.contact)}</p>
    <p>${escapeHtml(copy.signoff)}<br />${escapeHtml(copy.signoffName)}<br /><a href="${escapeHtml(copy.site)}" style="color:#15803d;">${escapeHtml(copy.site)}</a></p>
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
