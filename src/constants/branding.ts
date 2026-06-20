export const BRAND = {
  name: "Tikiti",
  tagline: "Paperless ticketing for a greener tomorrow",
  ecoHeadline: "Good for events. Great for the planet.",
  ecoDescription:
    "Tikiti replaces printed tickets with secure digital QR codes — cutting paper waste, reducing fraud, and making every event a little lighter on the environment.",
} as const;

export const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL ?? "";
export const PLAY_STORE_URL = process.env.NEXT_PUBLIC_PLAY_STORE_URL ?? "";

export const ORGANIZER_APP = {
  name: "Tikiti Scanner",
  description:
    "Every Tikiti event organizer gets access to our mobile scanner app. Check in guests at the door with your phone — no printed lists, no hassle.",
  features: [
    "Included with every organizer account",
    "Scan QR tickets in seconds",
    "Works on iPhone and Android",
    "Real-time validation at the door",
  ],
} as const;
