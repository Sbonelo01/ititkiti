// Update this with your actual API URL
// Use the /api prefix so requests target the backend's API routes.
const API_BASE_URL = 'https://tikiti.fun/api'; // Replace with your actual domain
// If you use a mobile API key for backend endpoints, add it here and include in headers.
// const MOBILE_API_KEY = process.env.NEXT_PUBLIC_MOBILE_API_KEY || '';

export interface ValidationResponse {
  success: boolean;
  status: 'valid' | 'already_used' | 'not_found' | 'error' | 'unauthorized';
  error?: string;
  ticket?: {
    attendee_name: string;
    email: string;
    event_id: string;
    created_at: string;
  };
}

export const validateTicket = async (qrCodeData: string): Promise<ValidationResponse> => {
  // Add a timeout so fetch doesn't hang indefinitely on network issues.
  const controller = new AbortController();
  const timeoutMs = 10000; // 10 seconds
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}/validate-ticket-mobile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ qr_code_data: qrCodeData }),
      signal: controller.signal,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        status: data.status || 'error',
        error: data.error || 'Validation failed',
      };
    }

    return {
      success: data.success || false,
      status: data.status || 'error',
      ticket: data.ticket,
      error: data.error,
    };
  } catch (error: unknown) {
    // Normalize unknown error
    const err = error as { name?: string; message?: string };
    if (err?.name === 'AbortError') {
      console.error('API Error: request timed out');
      return {
        success: false,
        status: 'error',
        error: 'Request timed out. Please try again.',
      };
    }
    console.error('API Error:', err?.message ?? err);
    return {
      success: false,
      status: 'error',
      error: 'Network error. Please check your connection.',
    };
  } finally {
    clearTimeout(timeout);
  }
};

