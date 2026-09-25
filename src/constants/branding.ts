export const BRAND = {
  name: "Tikiti",
  tagline: "Paperless ticketing for a greener tomorrow",
  ecoHeadline: "Good for events. Great for the planet.",
  ecoDescription:
    "Tikiti replaces printed tickets with secure digital QR codes — cutting paper waste, reducing fraud, and making every event a little lighter on the environment.",
} as const;

export const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL ?? "";
export const PLAY_STORE_URL = process.env.NEXT_PUBLIC_PLAY_STORE_URL ?? "";

/** Web scanner (Expo web) — no app store download required */
export const SCANNER_APP_URL =
  process.env.NEXT_PUBLIC_SCANNER_APP_URL ?? "https://scan.tikiti.fun";

export const ORGANIZER_APP = {
  name: "Tikiti Scanner",
  description:
    "Every Tikiti event organizer gets free access to our web scanner. Check in guests at the door from any phone or tablet — no install, no printed lists.",
  features: [
    "Included with every organizer account",
    "Scan QR tickets in seconds",
    "Works in the browser on phone or tablet",
    "Real-time validation at the door",
  ],
} as const;
