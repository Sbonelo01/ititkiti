import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applyRateLimit } from "@/utils/rateLimit";
import { requireOrganizerAuth } from "@/server/auth/sessionAuth";
import { createOrganizerEvent } from "@/server/events/createOrganizerEvent";

const ticketTypeSchema = z.object({
  name: z.string().trim().min(1).max(200),
  price: z.number().finite().min(0),
  quantity: z.number().int().positive(),
  description: z.string().trim().max(2000).nullable().optional(),
});

const bodySchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1).max(20000),
  date: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Invalid date",
  }),
  location: z.string().trim().min(1).max(1000),
  poster_url: z.string().trim().url().max(2000),
  ticket_types: z.array(ticketTypeSchema).min(1).max(100),
});

export async function POST(req: NextRequest) {
  const rateLimited = applyRateLimit(req, {
    keyPrefix: "events-create",
    windowMs: 60_000,
    maxRequests: 8,
  });
  if (rateLimited) return rateLimited;

  const auth = await requireOrganizerAuth(req.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const result = await createOrganizerEvent(auth.user, {
      title: parsed.data.title,
      description: parsed.data.description,
      date: parsed.data.date,
      location: parsed.data.location,
      posterUrl: parsed.data.poster_url,
      ticketTypes: parsed.data.ticket_types.map((ticket) => ({
        name: ticket.name,
        price: ticket.price,
        quantity: ticket.quantity,
        description: ticket.description ?? null,
      })),
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(
      {
        event: result.event,
        welcomeEmail: result.welcomeEmail,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
