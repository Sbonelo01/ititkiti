import localFont from "next/font/local";

/**
 * Self-hosted latin faces for the families previously loaded with next/font/google.
 * Google's CSS for these requests serves one variable woff2 per family.
 * next/font/local still validates the files and emits @font-face during `next build`,
 * without parsing a live Google stylesheet (that parser throws when a font URL
 * does not end in .woff/.woff2/.ttf/.otf/.eot).
 *
 * Plus Jakarta Sans: SIL Open Font License 1.1 (Tokotype).
 * Roboto: Apache License 2.0 (Google).
 */
export const roboto = localFont({
  src: [
    {
      path: "./roboto-latin.woff2",
      weight: "300 700",
      style: "normal",
    },
  ],
  variable: "--font-roboto",
  display: "swap",
});

export const plusJakarta = localFont({
  src: [
    {
      path: "./plus-jakarta-sans-latin.woff2",
      weight: "400 700",
      style: "normal",
    },
  ],
  variable: "--font-jakarta",
  display: "swap",
});
