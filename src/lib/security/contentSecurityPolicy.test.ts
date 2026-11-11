import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  CONTENT_SECURITY_POLICY_HEADER,
  PAYSTACK_INLINE_SCRIPT_ORIGIN,
} from "./contentSecurityPolicy";

describe("content security policy", () => {
  it("allows the Paystack script origin that react-paystack actually loads", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), "node_modules/react-paystack/libs/paystack-script.ts"),
      "utf8"
    );
    expect(source).toContain(`const src = '${PAYSTACK_INLINE_SCRIPT_ORIGIN}/v1/inline.js'`);
    const policy = buildContentSecurityPolicy();
    const scriptSrc = policy.split("; ").find((part) => part.startsWith("script-src "));
    expect(scriptSrc).toBe(`script-src 'self' ${PAYSTACK_INLINE_SCRIPT_ORIGIN}`);
    expect(policy).not.toContain("unsafe-inline");
    expect(policy).not.toContain("unsafe-eval");
  });

  it("is report-only so it does not claim enforcement Next and Paystack would violate", () => {
    expect(CONTENT_SECURITY_POLICY_HEADER).toBe("Content-Security-Policy-Report-Only");
  });
});
