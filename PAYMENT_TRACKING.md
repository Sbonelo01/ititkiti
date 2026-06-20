# Payment Tracking Guide

## How to Identify Which Event a Payment is For

When you receive a payment in Paystack, there are several ways to identify which event it's for:

### Method 1: Check the Reference Format

The Paystack reference follows this format:
```
EVT_{eventId}_{userId}_{timestamp}_{random}
```

**Example:** `EVT_550e8400-e29b-41d4-a716-446655440000_6ba7b810-9dad-11d1-80b4-00c04fd430c8_1704067200000_1234`

Legacy references used hyphens (`EVT-{eventId}-...`); UUID event IDs are parsed correctly in both formats.

To extract the event ID programmatically, use `extractEventIdFromReference()` in `src/utils/paystackChargeMetadata.ts` or read `metadata.event_id` from Paystack (preferred).

### Method 2: Check Paystack Metadata

Each payment includes metadata with event information:
- `event_id`: The event's unique ID
- `event_title`: The event title
- Custom fields with event details

You can see this in your Paystack dashboard under the transaction details.

### Method 3: Use the Payment Lookup API

Requires a Bearer token. Allowed callers: purchaser (email match), event organizer, or staff/admin.

```bash
GET /api/payment-lookup?reference=EVT_xxx
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "reference": "EVT-abc123-def456-1704067200000-1234",
  "eventId": "abc123",
  "eventIdFromReference": "abc123",
  "event": {
    "id": "abc123",
    "title": "Summer Music Festival",
    "date": "2024-06-15T18:00:00Z",
    "location": "Convention Center",
    "organizer_id": "org-123"
  },
  "ticket": {
    "id": "ticket-456",
    "attendee_name": "John Doe",
    "email": "john@example.com",
    "created_at": "2024-01-01T12:00:00Z",
    "payment_status": "paid"
  },
  "totalTickets": 2
}
```

### Method 4: Query Database Directly

Idempotency and lookup use `payment_receipts.reference` (not `tickets.paystack_reference`):

```sql
SELECT pr.*, e.title AS event_title
FROM payment_receipts pr
JOIN events e ON e.id = pr.event_id
WHERE pr.reference = 'EVT_550e8400-e29b-41d4-a716-446655440000_...';
```

### Method 5: Check Paystack Webhook Data

If you set up Paystack webhooks, the webhook payload includes:
- `reference`: The payment reference
- `metadata`: Contains event_id and event_title
- `amount`: Payment amount
- `customer`: Customer email

## Quick Reference Extraction

**JavaScript/TypeScript:**
```typescript
function extractEventIdFromReference(reference: string): string | null {
  const parts = reference.split('-');
  if (parts.length >= 2 && parts[0] === 'EVT') {
    return parts[1];
  }
  return null;
}

// Usage
const reference = "EVT-abc123-def456-1704067200000-1234";
const eventId = extractEventIdFromReference(reference); // "abc123"
```

**Python:**
```python
def extract_event_id_from_reference(reference: str) -> str | None:
    parts = reference.split('-')
    if len(parts) >= 2 and parts[0] == 'EVT':
        return parts[1]
    return None
```

## Best Practices

1. **Always check metadata first** - It's the most reliable method
2. **Use the lookup API** - For programmatic access to payment details
3. **Store references** - Keep a record of references in your database (already done)
4. **Webhook integration** - Set up Paystack webhooks for real-time payment notifications

## Database Schema

The `tickets` table stores:
- `paystack_reference`: The Paystack payment reference
- `event_id`: Direct link to the event
- `payment_status`: Payment status (paid, pending, etc.)

You can always join `tickets` with `events` to get full event details for any payment.

