/**
 * Role model:
 * - Privileged roles (admin/staff) live in app_metadata, which only the Auth Admin API can write.
 * - Product roles (organizer/attendee) live in client-writable user_metadata and are never treated as privileged.
 */

export type PrivilegedRole = "admin" | "staff";
export type ProductRole = "organizer" | "attendee";
/** Super-admin assignable roles. Privileged values write app_metadata; organizer/clear write user_metadata. */
export type AssignableRole = "clear" | "organizer" | "staff" | "admin";

export const ASSIGNABLE_ROLES = [
  "clear",
  "organizer",
  "staff",
  "admin",
] as const satisfies readonly AssignableRole[];

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

/** Privileged app_metadata.role wins over product user_metadata.role. */
export function assignableRoleOf(
  user: RoleMetadataSource | null | undefined
): AssignableRole {
  const privileged = getPrivilegedRole(user);
  if (privileged) return privileged;
  return getProductRole(user) === "organizer" ? "organizer" : "clear";
}

export function roleUpdatePayload(role: AssignableRole): {
  app_metadata: { role: PrivilegedRole | null };
  user_metadata: { role: ProductRole };
} {
  switch (role) {
    case "clear":
      return {
        app_metadata: { role: null },
        user_metadata: { role: "attendee" },
      };
    case "organizer":
      return {
        app_metadata: { role: null },
        user_metadata: { role: "organizer" },
      };
    case "staff":
      return {
        app_metadata: { role: "staff" },
        user_metadata: { role: "attendee" },
      };
    case "admin":
      return {
        app_metadata: { role: "admin" },
        user_metadata: { role: "attendee" },
      };
    default: {
      const _never: never = role;
      throw new Error(`Unhandled role: ${String(_never)}`);
    }
  }
}
