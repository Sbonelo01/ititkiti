import { getPrivilegedRole, type RoleMetadataSource } from "@/utils/roles";

/**
 * The intended super-admin account. Email alone is not authorization.
 * The API also requires app_metadata.role = admin, which only the Auth
 * admin API can write. Set that metadata on this account before relying
 * on the super-admin screens.
 */
export const SUPER_ADMIN_EMAIL = "sbonelomkhize15@gmail.com";

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return typeof email === "string" && email.trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}

export function isSuperAdminUser(
  user: (RoleMetadataSource & { email?: string | null }) | null | undefined
): boolean {
  if (!user) return false;
  return getPrivilegedRole(user) === "admin" && isSuperAdminEmail(user.email);
}
