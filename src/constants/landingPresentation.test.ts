import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BRAND_GREEN } from "@/constants/branding";
import {
  GET_TICKETS_LABEL,
  ORGANIZER_SIGNUP_PATH,
  POWERED_BY_LINE,
} from "@/constants/landing";
import {
  initialAuthScreenMode,
  initialSignupRole,
  isSellAuthRedirect,
} from "@/utils/authRedirect";

function source(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("v2 landing presentation", () => {
  it("uses the logo green as the brand fill and the site text green on the menu", () => {
    expect(BRAND_GREEN).toBe("#22C55E");
    const css = source("src/app/globals.css");
    expect(css).toContain("--brand-green: #22C55E");
    expect(css).toContain("color: var(--color-green-700)");
    const nav = source("src/components/Navbar.tsx");
    expect(nav).toContain("site-menu-button");
    expect(nav).toContain("text-green-700");
    expect(nav).not.toMatch(/text-blue|#007AFF|#2563EB/);
  });

  it("locks the footer credit, guest CTA, and upcoming-before-pricing order", () => {
    expect(POWERED_BY_LINE).toBe("Powered by IZIBONELO TECH PTY LTD");
    expect(GET_TICKETS_LABEL).toBe("Get tickets");
    const footer = source("src/components/Footer.tsx");
    const home = source("src/components/HomePageClient.tsx");
    expect(footer).toContain("POWERED_BY_LINE");
    expect(footer).not.toMatch(/Funzile|Durban-based|Durban Based/i);
    expect(home).not.toMatch(/Funzile|Durban-based|Durban Based|Get tickets on tikiti\.fun/i);
    expect(home.indexOf('id="upcoming"')).toBeGreaterThan(-1);
    expect(home.indexOf('id="upcoming"')).toBeLessThan(home.indexOf("<PricingSection"));
    expect(home).toContain("GET_TICKETS_LABEL");
  });

  it("keeps sell continuation on the organizer signup redirect", () => {
    const redirect = new URL(ORGANIZER_SIGNUP_PATH, "https://tikiti.fun").searchParams.get(
      "redirect"
    );
    expect(isSellAuthRedirect(redirect)).toBe(true);
    expect(initialAuthScreenMode(redirect)).toBe("signup");
    expect(initialSignupRole(redirect)).toBe("organizer");
    expect(source("src/app/sell/page.tsx")).toContain("OrganizerContinueLink");
    expect(source("src/app/login/page.tsx")).not.toMatch(/10K\+|50K\+|Sarah Johnson|Bank-level/);
  });
});
