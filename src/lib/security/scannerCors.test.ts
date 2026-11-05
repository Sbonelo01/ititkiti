import { describe, expect, it } from "vitest";
import { parseScannerCorsAllowlist, resolveScannerCorsOrigin } from "./scannerCors";

describe("scanner CORS", () => {
  it("fails closed when no allowlist is configured", () => {
    expect(parseScannerCorsAllowlist(undefined)).toEqual([]);
    expect(parseScannerCorsAllowlist("  ")).toEqual([]);
    expect(resolveScannerCorsOrigin("https://evil.example", [])).toBeNull();
    expect(resolveScannerCorsOrigin(null, [])).toBeNull();
  });

  it("reflects only an allowlisted origin", () => {
    const allowlist = parseScannerCorsAllowlist(
      " https://scan.tikiti.fun , https://preview.example "
    );
    expect(resolveScannerCorsOrigin("https://scan.tikiti.fun", allowlist)).toBe(
      "https://scan.tikiti.fun"
    );
    expect(resolveScannerCorsOrigin("https://evil.example", allowlist)).toBeNull();
    expect(resolveScannerCorsOrigin(null, allowlist)).toBeNull();
  });
});
