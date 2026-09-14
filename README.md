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

See [PAYMENT_TRACKING.md](./PAYMENT_TRACKING.md). Ticket issuance runs server-side via `finalize_ticket_purchase` (service role only). Apply `supabase/migrations/20260914_revoke_finalize_ticket_purchase_client_grants.sql` so `anon` / `authenticated` cannot execute that RPC.

## Staff / admin roles

Privileged roles (`admin`, `staff`) must be stored in Auth **`app_metadata.role`**. The client can write `user_metadata`, so it is only used for product roles (`organizer` / `attendee`).

Grant staff with the service role (Dashboard → Authentication → user → App metadata, or Admin API):

```ts
await getSupabaseAdmin().auth.admin.updateUserById(userId, {
  app_metadata: { role: "staff" }, // or "admin"
});
```

Then apply `supabase/migrations/20260914_sanitize_user_metadata_privileged_roles.sql` so signup/`updateUser` cannot persist `admin`/`staff` in `user_metadata`. Existing staff who only had `user_metadata.role` need the `app_metadata` grant above or they will lose staff access.

## Row-level security

Public tables have RLS enabled. Apply `supabase/migrations/20260915_public_rls_policies.sql` so catalog tables are readable, tickets/payments/invoices are not world-readable, and organizers can only change their own events. That migration also revokes `next_organizer_invoice_number` from `anon` / `authenticated` (same pattern as `finalize_ticket_purchase`).

Merging the PR does **not** change production. Policy intent, apply order, and verification queries: [supabase/RLS.md](./supabase/RLS.md).

## Mobile scanner

Staff QR scanning lives in the sibling [`../mobile-app`](../mobile-app) Expo project. It uses `/api/validate-ticket` with staff Bearer auth.

## Tests & CI

```bash
npm test
npm run lint
```

## Deployment note

API routes (`/api/purchase-tickets`, Paystack webhook, etc.) require a Node hosting target (e.g. Vercel). Static export (GitHub Pages) cannot run server routes.
