# Public schema RLS

Row-level security for Tikiti. **Applying this to production is a separate step** — merging the PR does not change the live database.

## Apply order

Run SQL files in `supabase/migrations/` lexicographically. For this change, after the PR #4 migrations:

1. `20260914_revoke_finalize_ticket_purchase_client_grants.sql` (already on prod if #4 was applied)
2. `20260914_sanitize_user_metadata_privileged_roles.sql` (already on prod if #4 was applied)
3. **`20260915_public_rls_policies.sql`** ← this change

Ways to apply (3):

- Supabase Dashboard → SQL editor → paste the file
- `supabase db push` against the linked project
- Dashboard migration runner

Do **not** apply via agent/`apply_migration` as part of this PR.

## Access model (matches current app call sites)

| Table | anon | authenticated organizer | authenticated attendee | staff/admin (`app_metadata.role`) | service_role |
| --- | --- | --- | --- | --- | --- |
| `events` | SELECT (catalog; no `published` column) | CRUD where `organizer_id = auth.uid()` | SELECT catalog | SELECT via catalog policy | bypass RLS |
| `ticket_types` | SELECT (event pages) | CRUD for types on own events | SELECT catalog | SELECT catalog | bypass RLS |
| `tickets` | none | SELECT for own events | SELECT where `email` matches JWT email | SELECT all | mint/update via RPC + `/api/validate-ticket` |
| `payment_receipts` | none | SELECT for own events | none | SELECT all | webhook / `finalize_ticket_purchase` |
| `organizer_invoices` | none | SELECT own (`organizer_id`) | none | SELECT all | `/api/invoices*` writes |
| `organizer_invoice_tickets` | none | SELECT rows on own invoices | none | SELECT all | invoice generate |
| `subscribers` | **deny-all** (`using (false)`; no grants) | same | same | same | only |
| `public.users` | none | SELECT own row | SELECT own row | SELECT own row | bypass RLS |

Staff checks use **`auth.jwt() → app_metadata → role`** (`staff` \| `admin`) via `private.is_staff_or_admin()`. They never read `user_metadata`. The `private` schema is not in the PostgREST API. Staff **writes** stay on server routes with the service-role client (`requireStaffAuth`).

There is no client INSERT/UPDATE/DELETE on `tickets` or `payment_receipts`. Organizer event DELETE with existing ticket sales will fail (child `ON DELETE CASCADE` still has to pass tickets RLS; that is intentional so sold tickets cannot be wiped from the dashboard). Events that only have `ticket_types` can still be deleted.

Invoice list/detail/status UI already uses `/api/invoices` (service role). SELECT policies exist so a later client query of own invoices is safe.

## RPCs

| Function | Client `EXECUTE` | Notes |
| --- | --- | --- |
| `finalize_ticket_purchase` | revoked (#4) | service_role only |
| `next_organizer_invoice_number` | **revoked here** | SECURITY DEFINER; called from `generateOrganizerInvoice` |
| `decrement_tickets` (both overloads) | **revoked here** | unused in app; was granted to anon/authenticated |
| `validate_and_mark` | already service_role | unchanged |
| `sanitize_user_metadata_role` | already revoked | trigger only |
| `private.is_staff_or_admin` / `private.is_event_organizer` | authenticated + service_role | SECURITY INVOKER helpers; not in the REST API |

## Verify after apply

Run in the SQL editor (service role / postgres). Expected outcomes are in comments.

```sql
-- 1. Every public table has RLS on.
select relname, relrowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r';
-- All relrowsecurity = true

-- 2. Policy inventory (no world-readable tickets; no tickets INSERT/UPDATE).
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 3. Tables that must have at least one policy (not deny-all):
--    events, tickets, ticket_types, payment_receipts,
--    organizer_invoices, organizer_invoice_tickets, users
-- subscribers must have the deny-all policy `subscribers_no_client_access`.

-- 4. Anon/authenticated must not have INSERT/UPDATE/DELETE on tickets or receipts.
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated', 'PUBLIC')
  and table_name in ('tickets', 'payment_receipts', 'subscribers', 'organizer_invoices')
order by table_name, grantee, privilege_type;
-- tickets/payment_receipts/organizer_invoices: SELECT to authenticated only
-- subscribers: no rows

-- 5. Invoice number RPC not executable by clients.
select routine_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in ('next_organizer_invoice_number', 'finalize_ticket_purchase', 'decrement_tickets')
order by routine_name, grantee;
-- no EXECUTE for anon / authenticated / PUBLIC
```

Manual product checks (anon key in the browser, then a real organizer session):

1. Home `/` and `/events` still list events; `/events/[id]` still shows ticket types.
2. Logged-out user cannot read `/rest/v1/tickets` or `/rest/v1/payment_receipts`.
3. Organizer dashboard still lists **own** events, sales counts, and can create/edit/delete an event with no sales.
4. Attendee dashboard still lists tickets whose `email` matches the account email.
5. Staff admin page (`/dashboard/admin`) still lists all events/tickets **only** if `app_metadata.role` is `staff` or `admin`.
6. Purchase webhook / `/api/purchase-tickets` still mint tickets (service role, RLS bypass).

## Advisors

After apply, Dashboard → Advisors should no longer report `rls_enabled_no_policy` on `ticket_types`, `payment_receipts`, `organizer_invoices`, `organizer_invoice_tickets`, or `subscribers`.
