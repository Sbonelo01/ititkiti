/**
 * Report-only policy. It is not an enforced control.
 *
 * Evidence used to build it:
 * - react-paystack loads https://js.paystack.co/v1/inline.js at runtime.
 * - Event posters are organizer-supplied https URLs, so img-src cannot be limited
 *   to this origin without breaking listings.
 * - Next.js still injects inline bootstrap scripts. Enforcing script-src 'self'
 *   without a per-request nonce breaks hydration. This header is therefore
 *   Content-Security-Policy-Report-Only until that nonce rollout exists.
 */
export const CONTENT_SECURITY_POLICY_HEADER = "Content-Security-Policy-Report-Only";

export const PAYSTACK_INLINE_SCRIPT_ORIGIN = "https://js.paystack.co";

export function buildContentSecurityPolicy(): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    `script-src 'self' ${PAYSTACK_INLINE_SCRIPT_ORIGIN}`,
    "style-src 'self'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.paystack.co https://js.paystack.co",
    "frame-src https://checkout.paystack.com https://js.paystack.co https://standard.paystack.co",
    "form-action 'self' https://checkout.paystack.com https://standard.paystack.co",
  ].join("; ");
}
