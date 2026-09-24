import { NextRequest } from "next/server";
import { applyRateLimit } from "@/utils/rateLimit";
import { handleValidateTicketPost } from "@/server/tickets/handleValidateTicketPost";

/**
 * Mobile-compatible alias for /api/validate-ticket.
 * Requires Bearer token with event-scoped scan permission.
 */
export async function POST(req: NextRequest) {
  const rateLimited = applyRateLimit(req, {
    keyPrefix: "validate-ticket-mobile",
    windowMs: 60_000,
    maxRequests: 120,
  });
  if (rateLimited) return rateLimited;

  return handleValidateTicketPost(req);
}
