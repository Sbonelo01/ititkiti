import { validateTicket } from '../src/services/api';

// Mock supabase to be null so validateTicket falls back to the REST API
jest.mock('../src/services/supabase', () => ({
  __esModule: true,
  default: null,
}));

describe('validateTicket fallback', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('falls back to REST API and returns not_found when API returns 404', async () => {
    // Mock fetch to return a not found response
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ status: 'not_found', success: false }),
    } as any);

    const result = await validateTicket('NON_EXISTENT_QR');

    expect(result).toHaveProperty('success', false);
    expect(result).toHaveProperty('status', 'not_found');
  });

  it('falls back to REST API and returns valid when API returns success', async () => {
    const ticket = {
      attendee_name: 'Alice',
      email: 'alice@example.com',
      event_id: 'event-123',
      created_at: new Date().toISOString(),
    };

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, status: 'valid', ticket }),
    } as any);

    const result = await validateTicket('VALID_QR');

    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('status', 'valid');
    expect(result).toHaveProperty('ticket');
    expect(result.ticket).toMatchObject({ attendee_name: 'Alice' });
  });
});
