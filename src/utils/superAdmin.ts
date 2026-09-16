/** Hard-coded allowlist. Not a secret — the API still verifies the session email server-side. */
export const SUPER_ADMIN_EMAIL = "sbonelomkhize15@gmail.com";

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return typeof email === "string" && email.trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}
