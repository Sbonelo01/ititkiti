# Tikiti organizer onboarding

This guide is for anyone **creating and running an event** on [tikiti.fun](https://www.tikiti.fun). Tikiti is paperless ticketing: buyers get QR tickets on their phones; you check them in at the door with **Tikiti Scanner** — no printed tickets required.

---

## 1. What you get as an organizer

| Benefit | Details |
|--------|---------|
| **Listing** | Free to create events and ticket types |
| **Your ticket price** | You keep **100% of ticket face value** — Tikiti’s fee is paid by the buyer at checkout |
| **Delivery** | Instant digital QR tickets after Paystack payment |
| **Door check-in** | Free **web scanner** at [scan.tikiti.fun](https://scan.tikiti.fun) (phone or tablet browser; no app store download) |
| **Payouts** | Request settlement via a **settlement invoice** after your event has **started** |

**Support:** info@tikiti.fun · +27 61 069 2364

**More detail:** [FAQ](https://www.tikiti.fun/faq) (fees, invoices, scanner)

---

## 2. Create your Tikiti account

1. Sign up or log in at [tikiti.fun](https://www.tikiti.fun).
2. Go to **Dashboard → Create event** (or **Sell tickets free** on the homepage).

If this is your first time selling, Tikiti will ask you to **become an organizer** with:

- Your name (and optional surname)
- Phone number
- Company or event name (used on invoices and your profile)

That sets your account to the **organizer** role so you can list events and receive payouts.

---

## 3. Create your event

From **Dashboard → Create event**, fill in:

1. **Basics** — title and description buyers will see.
2. **When & where** — date, time, and venue/location.
3. **Tickets** — one or more types (e.g. General, VIP), each with:
   - Name and optional description
   - **Price** (ZAR)
   - **Quantity** available
4. **Poster** (optional) — image for the event page.

Submit the form. When the event is created, an **onboarding checklist** may appear on the event: share link → scanner → settlement (after the event starts).

---

## 4. Share your event and sell tickets

1. Open your event from the **Dashboard** or the public **Events** list.
2. Copy the **event link** and share it (social, WhatsApp, email, posters with QR if you use the dashboard QR tools).
3. Buyers pay with **Paystack** (card). They see ticket price **plus** Tikiti’s platform fee at checkout — not deducted from your price.

### Buyer platform fees (paid by the buyer, not you)

| Ticket price | Platform fee per ticket |
|--------------|-------------------------|
| Under R50 | R5 |
| R50 – R200 | R10 |
| Above R200 | 5% of ticket price |

Card processing is included in checkout; organizers still receive **full face value** on settlement.

---

## 5. What your attendees experience

1. Open your event link → choose ticket type → pay.
2. After payment, tickets appear in their **Tikiti dashboard** as **QR codes**.
3. At the venue they show the QR on their phone; your team scans it once for entry.

Tickets are **single-use** for check-in: a successful scan marks the ticket as used (duplicate scans are rejected).

---

## 6. Check-in at the door (Tikiti Scanner)

**URL:** [https://scan.tikiti.fun](https://scan.tikiti.fun)

### Who can use the scanner

After signing in with a Tikiti account, access is granted if you are:

- The **event organizer** (your account owns the event), or
- **Door team** invited for that event (see below), or
- Tikiti **platform admin/staff** (internal)

Everyone else is denied at login.

### Organizer steps

1. Before doors open, open [scan.tikiti.fun](https://scan.tikiti.fun) on a phone or tablet (Chrome/Safari work well; allow **camera** permission when prompted).
2. Sign in with the **same Tikiti account** you use on tikiti.fun.
3. Select your event (organizers see events they own).
4. Scan attendee QR codes. Confirm green/success vs already-used or invalid.

**Tip:** Run a **test scan** with a colleague’s ticket before the crowd arrives.

### Add door team (volunteers / security / second entrance)

Door team does **not** need to be an organizer.

1. On tikiti.fun, open **Edit event** for that event.
2. Find **Door team (scanner access)**.
3. Enter each person’s **email** and add them.

They must:

1. Have (or create) a Tikiti account with **that exact email**.
2. Sign in at [scan.tikiti.fun](https://scan.tikiti.fun).

They can scan **only that event**, not your other events. There is no automatic invite email yet — tell them they’re added and send them the scanner link.

To remove access, delete them from the door team list on the edit event page.

---

## 7. Monitor sales on the dashboard

From **Dashboard** you can:

- See events and sales summaries
- Open individual events for details, edit, share link, and door team
- Download or share **QR codes** for marketing where the UI offers it

If sales are quiet, revisit your share link and ticket pricing; the dashboard updates as Paystack payments complete.

---

## 8. Settlement invoice and payout

You request payout **after the event has started** (event date/time in the past), not before doors open.

1. Ensure your **organizer profile** fields are complete (name, contact, company — these appear on the invoice). Update them via your account/profile metadata if the invoice UI prompts you.
2. From the event or invoices area in the dashboard, **Generate settlement invoice** when the UI shows **Ready**.
3. Review amounts: **gross face value** of paid tickets, **you receive** = 100% of that face value (buyer fees are separate and already collected at checkout).
4. **Submit** the invoice when correct. After submit, it is read-only.
5. Tikiti processes settlements **in batches per invoice** — timing details are in the [FAQ](https://www.tikiti.fun/faq#invoices).

If you sell more tickets after submitting, you may generate a **separate invoice** for new paid sales (see in-app hints).

**Note:** Bank details for EFT may be collected outside the invoice form today; follow any instructions Tikiti sends after submit.

---

## 9. Recommended timeline

| When | Action |
|------|--------|
| **2+ weeks before** | Create event, set ticket types and quantities, complete organizer profile |
| **As soon as live** | Share event link; monitor dashboard |
| **Before event** | Add door team emails; test [scan.tikiti.fun](https://scan.tikiti.fun) with a real ticket |
| **Event day** | Scanner on charged devices with good connectivity; scan at each entrance |
| **After event starts** | Generate and submit settlement invoice |
| **Questions** | info@tikiti.fun |

---

## 10. Quick troubleshooting

| Issue | What to try |
|-------|-------------|
| Can’t create event | Log in; complete **organizer** signup (name, phone, company) |
| Buyer paid but no ticket | They should refresh dashboard; if still missing, contact support with payment reference |
| Scanner “Access denied” | Account must be organizer, door team for that event, or staff; door team email must match Tikiti login |
| Scanner network error | Scanner app must reach `tikiti.fun/api`; check internet; organizers use production Tikiti API |
| Can’t generate invoice yet | Invoice unlocks **after event start**; need paid ticket sales |
| Wrong door team event | Door team is **per event** — add them on each event they should scan |

---

## 11. Links

- **Main site:** [https://www.tikiti.fun](https://www.tikiti.fun)
- **Scanner:** [https://scan.tikiti.fun](https://scan.tikiti.fun)
- **FAQ:** [https://www.tikiti.fun/faq](https://www.tikiti.fun/faq)
- **Help:** [https://www.tikiti.fun/help](https://www.tikiti.fun/help)

---

*Last updated for web scanner at scan.tikiti.fun and event-scoped door team. Product UI may add steps; this document reflects the intended organizer workflow on Tikiti.*
