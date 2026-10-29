/**
 * Enhanced fetch wrapper with automatic CSRF token inclusion
 */

export interface FetchOptions extends RequestInit {
  includeCSRF?: boolean;
}

export async function secureFetch(url: string, options: FetchOptions = {}): Promise<Response> {
  const { includeCSRF = false, ...fetchOptions } = options;

  // Automatically include CSRF token for state-changing methods
  if (includeCSRF && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(fetchOptions.method?.toUpperCase() || '')) {
    // Get CSRF token from cookie
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrf-token') {
        fetchOptions.headers = {
          ...fetchOptions.headers,
          'x-csrf-token': value,
        };
        break;
      }
    }
  }

  // Ensure credentials are included for cookies
  fetchOptions.credentials = fetchOptions.credentials || 'include';

  return fetch(url, fetchOptions);
}

// Helper methods for common HTTP operations
export const securePost = (url: string, data: any, options: FetchOptions = {}) => {
  return secureFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(data),
    includeCSRF: true,
    ...options,
  });
};

export const securePut = (url: string, data: any, options: FetchOptions = {}) => {
  return secureFetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(data),
    includeCSRF: true,
    ...options,
  });
};

export const secureDelete = (url: string, options: FetchOptions = {}) => {
  return secureFetch(url, {
    method: 'DELETE',
    includeCSRF: true,
    ...options,
  });
};
/**
 * JSON request to one of our API routes. Throws an Error carrying the server's message
 * when the response is not OK or reports `success: false`, so callers can rely on
 * try/catch instead of checking the response by hand.
 */
export async function apiRequest<T = unknown>(
  url: string,
  { method = 'GET', body }: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown } = {}
): Promise<T> {
  const response = await secureFetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json?.success === false) {
    const message = typeof json?.error === 'string' ? json.error : json?.error?.message;
    throw new Error(message || `Permintaan gagal (${response.status})`);
  }
  return json as T;
}
