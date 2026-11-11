import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import OrganizedBySection from "./OrganizedBySection";
import type { PublicOrganizerCard } from "@/lib/events/publicOrganizer";

function render(organizer: PublicOrganizerCard): string {
  return renderToStaticMarkup(createElement(OrganizedBySection, { organizer }));
}

describe("OrganizedBySection", () => {
  it("renders the published name and hides absent contact details", () => {
    const html = render({ displayName: "Analytical Engines" });

    expect(html).toContain("Organised by");
    expect(html).toContain("Analytical Engines");
    expect(html).toContain("break-words");
    expect(html).not.toContain("mailto:");
    expect(html).not.toContain("tel:");
    expect(html).not.toContain("href=");
  });

  it("wraps a long published name and escapes hostile text", () => {
    const longName = `Night market ${"A".repeat(160)}`;
    const longHtml = render({ displayName: longName });
    const hostileHtml = render({
      displayName: "Club <img src=x onerror=alert(1)>",
      bio: "Line one\n<script>alert(1)</script>",
    });

    expect(longName.length).toBeLessThanOrEqual(200);
    expect(longHtml).toContain(longName);
    expect(longHtml).toContain("break-words");
    expect(hostileHtml).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(hostileHtml).toContain("whitespace-pre-wrap");
    expect(hostileHtml).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(hostileHtml).not.toContain("<script>");
    expect(hostileHtml.match(/<img\b/g)).toBeNull();
  });

  it("renders only safe public links", () => {
    const html = render({
      displayName: "Analytical Engines",
      websiteUrl: "https://events.example/nights",
      logoUrl: "https://cdn.example/logo.png",
      publicEmail: "press@example.com",
      publicPhone: "+27 61 069 2364",
    });

    expect(html).toContain('href="https://events.example/nights"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('src="https://cdn.example/logo.png"');
    expect(html).toContain('href="mailto:press%40example.com"');
    expect(html).toContain("press@example.com");
    expect(html).toContain('href="tel:+27610692364"');
    expect(html).toContain("+27 61 069 2364");
    expect(html).toContain("break-all");
  });

  it("drops unsafe links and does not render private fields passed beside the card", () => {
    const html = render({
      displayName: "Analytical Engines",
      websiteUrl: "javascript:alert(1)",
      logoUrl: "data:text/html,hi",
      publicEmail: "not-an-email",
      publicPhone: "call me",
      email: "ada.private@example.com",
      cellphone: "0820000000",
      organizer_id: "550e8400-e29b-41d4-a716-446655440000",
      bank_account: "62200000000",
    } as PublicOrganizerCard);

    expect(html).toContain("Analytical Engines");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("data:");
    expect(html).not.toContain("mailto:");
    expect(html).not.toContain("tel:");
    expect(html).not.toContain("ada.private@example.com");
    expect(html).not.toContain("0820000000");
    expect(html).not.toContain("550e8400-e29b-41d4-a716-446655440000");
    expect(html).not.toContain("62200000000");
    expect(html).not.toContain("<img");
  });

  it("renders nothing when there is no usable name", () => {
    expect(render({ displayName: "   " })).toBe("");
  });
});
