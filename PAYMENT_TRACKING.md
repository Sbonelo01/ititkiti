# Payment Tracking Guide

## How to Identify Which Event a Payment is For

When you receive a payment in Paystack, there are several ways to identify which event it's for:

### Method 1: Check the Reference Format

The Paystack reference follows this format:
```
EVT-{eventId}-{userId}-{timestamp}-{random}
```

**Example:** `EVT-abc123-def456-1704067200000-1234`

To extract the event ID:
1. Split the reference by `-`
2. The event ID is the **second part** (index 1)
3. In the example above: `abc123` is the event ID

### Method 2: Check Paystack Metadata

Each payment includes metadata with event information:
- `event_id`: The event's unique ID
- `event_title`: The event title
- Custom fields with event details

You can see this in your Paystack dashboard under the transaction details.

### Method 3: Use the Payment Lookup API

Query the database using the reference:

```bash
GET /api/payment-lookup?reference=EVT-xxx-xxx-xxx
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

You can also query the `tickets` table directly:

```sql
SELECT 
  t.*,
  e.title as event_title,
  e.date as event_date,
  e.location as event_location
FROM tickets t
JOIN events e ON t.event_id = e.id
WHERE t.paystack_reference = 'EVT-xxx-xxx-xxx';
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

