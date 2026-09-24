import { NextRequest } from "next/server";
import { applyRateLimit } from "@/utils/rateLimit";
import { handleValidateTicketPost } from "@/server/tickets/handleValidateTicketPost";

export async function POST(req: NextRequest) {
  const rateLimited = applyRateLimit(req, {
    keyPrefix: "validate-ticket",
    windowMs: 60_000,
    maxRequests: 90,
  });
  if (rateLimited) return rateLimited;

  return handleValidateTicketPost(req);
}
