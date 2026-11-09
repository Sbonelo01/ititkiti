import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import JsonLd, { serializeJsonLd } from "./JsonLd";
import { buildEventJsonLd } from "@/lib/seo/jsonLd";

const SCRIPT_END = /<\/script>/gi;

function renderJsonLd(data: Record<string, unknown> | Record<string, unknown>[]): string {
  return renderToStaticMarkup(createElement(JsonLd, { data }));
}

function scriptBodies(html: string): string[] {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    (match) => match[1]
  );
}

describe("serializeJsonLd", () => {
  it("escapes script terminators so they cannot close the JSON-LD script", () => {
    const attack = "</script><script>alert(1)</script>";
    const serialized = serializeJsonLd({ name: attack });

    expect(serialized.toLowerCase()).not.toContain("</script>");
    expect(serialized).toContain("\\u003c/script>");
    expect(JSON.parse(serialized)).toEqual({ name: attack });
  });

  it("escapes case-variant and split script closers", () => {
    const attack = "hello</ScRiPt\n><script>";
    const serialized = serializeJsonLd({ description: attack });

    expect(serialized.toLowerCase()).not.toContain("</script");
    expect(JSON.parse(serialized)).toEqual({ description: attack });
  });
});

describe("JsonLd script markup", () => {
  it("keeps a single script element when event fields contain a script closer", () => {
    const attack = '</script><script>alert(document.domain)</script>';
    const html = renderJsonLd(
      buildEventJsonLd({
        id: "evt-1",
        title: attack,
        description: `desc ${attack}`,
        date: "2026-10-01T18:00:00.000Z",
        location: `loc ${attack}`,
        price: 100,
        posterUrl: `https://cdn.example/poster.png?q=${attack}`,
        lowestPrice: 50,
      })
    );

    expect(html.match(SCRIPT_END)).toHaveLength(1);
    expect(html.toLowerCase()).not.toContain("</script><script>");

    const [body] = scriptBodies(html);
    expect(body).toBeDefined();
    const parsed = JSON.parse(body) as { name: string; description: string; location: { name: string } };
    expect(parsed.name).toBe(attack);
    expect(parsed.description).toContain(attack);
    expect(parsed.location.name).toContain(attack);
  });

  it("round-trips ordinary event JSON-LD", () => {
    const html = renderJsonLd(
      buildEventJsonLd({
        id: "evt-2",
        title: "Jazz Night",
        description: "Live set & dancing",
        date: "2026-10-01T18:00:00.000Z",
        location: "Durban",
        price: 80,
      })
    );

    expect(html.match(SCRIPT_END)).toHaveLength(1);
    const [body] = scriptBodies(html);
    expect(JSON.parse(body)).toMatchObject({
      "@type": "Event",
      name: "Jazz Night",
      description: "Live set & dancing",
    });
  });
});
