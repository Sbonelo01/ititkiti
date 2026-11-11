import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const FONT_DIR = path.resolve(process.cwd(), "src/fonts");

const FACES = [
  {
    file: "plus-jakarta-sans-latin.woff2",
    variable: "--font-jakarta",
    weight: "400 700",
  },
  {
    file: "roboto-latin.woff2",
    variable: "--font-roboto",
    weight: "300 700",
  },
] as const;

describe("self-hosted app fonts", () => {
  it("commits real woff2 files for the layout CSS variables", () => {
    const source = readFileSync(path.join(FONT_DIR, "appFonts.ts"), "utf8");
    const css = readFileSync(path.resolve(process.cwd(), "src/app/globals.css"), "utf8");
    expect(source).toContain('from "next/font/local"');
    const layout = readFileSync(path.resolve(process.cwd(), "src/app/layout.tsx"), "utf8");
    expect(layout).not.toContain("next/font/google");
    expect(css).toContain("var(--font-jakarta)");
    expect(css).toContain("var(--font-roboto)");

    for (const face of FACES) {
      const bytes = readFileSync(path.join(FONT_DIR, face.file));
      expect(bytes.subarray(0, 4).toString("ascii")).toBe("wOF2");
      expect(bytes.length).toBeGreaterThan(1000);
      expect(source).toContain(face.file);
      expect(source).toContain(face.variable);
      expect(source).toContain(face.weight);
    }
  });
});
