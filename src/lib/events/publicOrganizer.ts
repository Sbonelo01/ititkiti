/**
 * Public organiser card for the event page.
 *
 * Signup stores name, surname, company_name, cellphone, and company_logo in
 * Auth user_metadata. Account email is the Auth user email. None of those
 * contact fields are treated as public. The only name shown without an opt-in
 * row is the company/event name, then the personal name the organiser typed.
 * Names are never derived from an email address.
 *
 * bio, website, logo, public email, and public phone come only from
 * organizer_public_profiles columns that exist to be published.
 */

export const PUBLIC_ORGANIZER_PROFILE_COLUMNS =
  "display_name, bio, website_url, logo_url, public_email, public_phone";

const MAX_DISPLAY_NAME = 200;
const MAX_BIO = 2000;
const MAX_URL = 2000;
const MAX_EMAIL = 200;
const MAX_PHONE = 40;

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;
const CONTROL_CHARS_EXCEPT_NEWLINES = /[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/;
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_SHAPE = /^\+?[0-9][0-9\s().-]{6,}$/;

export type PublicOrganizerCard = {
  displayName: string;
  bio?: string;
  websiteUrl?: string;
  logoUrl?: string;
  publicEmail?: string;
  publicPhone?: string;
};

function singleLine(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned.length > max || CONTROL_CHARS.test(cleaned)) return null;
  return cleaned;
}

function multiLine(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  if (CONTROL_CHARS_EXCEPT_NEWLINES.test(value)) return null;
  const cleaned = value.replace(/\r\n/g, "\n").trim();
  if (!cleaned || cleaned.length > max || CONTROL_CHARS_EXCEPT_NEWLINES.test(cleaned)) return null;
  return cleaned;
}

export function safePublicHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_URL) return null;
  if (CONTROL_CHARS.test(trimmed) || trimmed.includes("\\")) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  return url.href;
}

export function safePublicEmail(value: unknown): string | null {
  const email = singleLine(value, MAX_EMAIL);
  if (!email || !EMAIL_SHAPE.test(email)) return null;
  return email;
}

export function safePublicPhone(value: unknown): string | null {
  const phone = singleLine(value, MAX_PHONE);
  if (!phone || !PHONE_SHAPE.test(phone)) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return phone;
}

export function telHref(phone: string): string | null {
  const safe = safePublicPhone(phone);
  if (!safe) return null;
  const digits = safe.replace(/\D/g, "");
  return `tel:${safe.startsWith("+") ? "+" : ""}${digits}`;
}

function seal(card: PublicOrganizerCard): PublicOrganizerCard {
  const sealed: PublicOrganizerCard = { displayName: card.displayName };
  if (card.bio) sealed.bio = card.bio;
  if (card.websiteUrl) sealed.websiteUrl = card.websiteUrl;
  if (card.logoUrl) sealed.logoUrl = card.logoUrl;
  if (card.publicEmail) sealed.publicEmail = card.publicEmail;
  if (card.publicPhone) sealed.publicPhone = card.publicPhone;
  return sealed;
}

export function displayNameFromAuthMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const record = metadata as Record<string, unknown>;
  const company = singleLine(record.company_name, MAX_DISPLAY_NAME);
  if (company) return company;
  const name = singleLine(record.name, MAX_DISPLAY_NAME);
  const surname = singleLine(record.surname, MAX_DISPLAY_NAME);
  const personal = [name, surname].filter((part): part is string => Boolean(part)).join(" ");
  return singleLine(personal, MAX_DISPLAY_NAME);
}

/** Name the organiser typed at signup. Omits email, phone, logo, and ids. */
export function publicOrganizerCardFromAuthMetadata(metadata: unknown): PublicOrganizerCard | null {
  const displayName = displayNameFromAuthMetadata(metadata);
  if (!displayName) return null;
  return seal({ displayName });
}

/** Explicit public profile row. Unknown and private keys are dropped. */
export function publicOrganizerCardFromProfileRow(row: unknown): PublicOrganizerCard | null {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const displayName = singleLine(record.display_name, MAX_DISPLAY_NAME);
  if (!displayName) return null;

  const card: PublicOrganizerCard = { displayName };
  const bio = multiLine(record.bio, MAX_BIO);
  if (bio) card.bio = bio;
  const websiteUrl = safePublicHttpUrl(record.website_url);
  if (websiteUrl) card.websiteUrl = websiteUrl;
  const logoUrl = safePublicHttpUrl(record.logo_url);
  if (logoUrl) card.logoUrl = logoUrl;
  const publicEmail = safePublicEmail(record.public_email);
  if (publicEmail) card.publicEmail = publicEmail;
  const publicPhone = safePublicPhone(record.public_phone);
  if (publicPhone) card.publicPhone = publicPhone;
  return seal(card);
}

/** Re-check a card before it is rendered. */
export function publicOrganizerCardFromParts(card: PublicOrganizerCard): PublicOrganizerCard | null {
  return publicOrganizerCardFromProfileRow({
    display_name: card.displayName,
    bio: card.bio,
    website_url: card.websiteUrl,
    logo_url: card.logoUrl,
    public_email: card.publicEmail,
    public_phone: card.publicPhone,
  });
}
