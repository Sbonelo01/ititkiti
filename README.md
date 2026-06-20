# Tikiti

Event ticketing platform (Next.js + Supabase + Paystack).

## Setup

1. Copy `.env.example` to `.env.local` and fill in values.
2. Install dependencies: `npm install`
3. Apply Supabase migrations in `supabase/migrations/` (in order).
4. Run dev server: `npm run dev`

## Required environment variables

See `.env.example` for the full list. Critical vars:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_PAYSTACK_KEY`, `PAYSTACK_SECRET_KEY`, `PAYSTACK_WEBHOOK_SECRET`

## Payments

See [PAYMENT_TRACKING.md](./PAYMENT_TRACKING.md). Ticket issuance runs server-side via `finalize_ticket_purchase` (service role only).

## Mobile scanner

Staff QR scanning lives in the sibling [`../mobile-app`](../mobile-app) Expo project. It uses `/api/validate-ticket` with staff Bearer auth.

## Tests & CI

```bash
npm test
npm run lint
```

## Deployment note

API routes (`/api/purchase-tickets`, Paystack webhook, etc.) require a Node hosting target (e.g. Vercel). Static export (GitHub Pages) cannot run server routes.
