export type ScannerMemberStatus = "pending" | "active" | "removed";

export function scannerMemberStatus(member: {
  user_id: string | null;
  revoked_at: string | null;
}): ScannerMemberStatus {
  if (member.revoked_at) return "removed";
  if (member.user_id) return "active";
  return "pending";
}

export function scannerMemberStatusLabel(status: ScannerMemberStatus): string {
  switch (status) {
    case "pending":
      return "Pending invite";
    case "active":
      return "Active";
    case "removed":
      return "Removed";
    default: {
      const _never: never = status;
      return _never;
    }
  }
}
