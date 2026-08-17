/**
 * API Client for OmniOps frontend.
 *
 * Authentication token is stored in localStorage.
 * Trade-off: localStorage is accessible to JavaScript (unlike httpOnly cookies),
 * which means it's vulnerable to XSS. However, httpOnly cookies require CSRF
 * protection and make the token unavailable to the client-side code.
 * For this MVP, we use localStorage with the following mitigations:
 * - Short token lifetimes (24h default)
 * - Refresh token rotation
 *
 * TODO: Consider moving to httpOnly cookie + CSRF token for production.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

let accessToken: string | null = null;

if (typeof window !== 'undefined') {
  accessToken = localStorage.getItem('omniops_access_token');
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    localStorage.setItem('omniops_access_token', token);
  } else {
    localStorage.removeItem('omniops_access_token');
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setRefreshToken(token: string | null) {
  if (token) {
    localStorage.setItem('omniops_refresh_token', token);
  } else {
    localStorage.removeItem('omniops_refresh_token');
  }
}

export function getRefreshToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('omniops_refresh_token');
  }
  return null;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiRequestError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      setAccessToken(null);
      setRefreshToken(null);
      return null;
    }

    const data = await response.json();
    setAccessToken(data.accessToken);
    return data.accessToken;
  } catch {
    setAccessToken(null);
    setRefreshToken(null);
    return null;
  }
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Handle 401 — attempt token refresh
  if (response.status === 401 && accessToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
      });
    } else {
      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new ApiRequestError('Session expired', 'UNAUTHORIZED', 401);
    }
  }

  if (!response.ok) {
    let errorData: { error?: ApiError; message?: string } = {};
    try {
      errorData = await response.json();
    } catch {
      // ignore parse errors
    }
    throw new ApiRequestError(
      errorData.error?.message ?? errorData.message ?? response.statusText,
      errorData.error?.code ?? `HTTP_${response.status}`,
      response.status,
      errorData.error?.details,
    );
  }

  return response.json();
}

// Convenience methods
export const api = {
  get: <T = unknown>(path: string) => apiRequest<T>(path, { method: 'GET' }),

  post: <T = unknown>(path: string, body?: unknown) =>
    apiRequest<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T = unknown>(path: string, body?: unknown) =>
    apiRequest<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = unknown>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};
