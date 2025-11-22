// Update this with your actual API URL
const API_BASE_URL = 'https://tikiti.fun/api'; // Replace with your actual domain
// Optional: Add your mobile API key here for authentication
const MOBILE_API_KEY = ''; // Set this if you've configured API key authentication

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
  try {
    const response = await fetch(`${API_BASE_URL}/validate-ticket-mobile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        qr_code_data: qrCodeData,
        ...(MOBILE_API_KEY && { api_key: MOBILE_API_KEY }),
      }),
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
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      status: 'error',
      error: 'Network error. Please check your connection.',
    };
  }
};

