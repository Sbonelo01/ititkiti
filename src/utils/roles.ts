/**
 * Role model:
 * - Privileged roles (admin/staff) live in app_metadata, which only the Auth Admin API can write.
 * - Product roles (organizer/attendee) live in client-writable user_metadata and are never treated as privileged.
 */

export type PrivilegedRole = "admin" | "staff";
export type ProductRole = "organizer" | "attendee";

export type RoleMetadataSource = {
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
};

function readRole(
  metadata: Record<string, unknown> | null | undefined
): string | undefined {
  const role = metadata?.role;
  if (typeof role !== "string") return undefined;
  const normalized = role.trim().toLowerCase();
  return normalized || undefined;
}

export function getPrivilegedRole(
  user: RoleMetadataSource | null | undefined
): PrivilegedRole | null {
  const role = readRole(user?.app_metadata);
  if (role === "admin" || role === "staff") {
    return role;
  }
  return null;
}

export function isStaffOrAdmin(
  user: RoleMetadataSource | null | undefined
): boolean {
  return getPrivilegedRole(user) !== null;
}

export function getProductRole(
  user: RoleMetadataSource | null | undefined
): ProductRole {
  return readRole(user?.user_metadata) === "organizer" ? "organizer" : "attendee";
}

export function sanitizeProductRole(role: unknown): ProductRole {
  if (typeof role !== "string") return "attendee";
  return role.trim().toLowerCase() === "organizer" ? "organizer" : "attendee";
}
