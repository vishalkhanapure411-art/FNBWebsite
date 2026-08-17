/**
 * OmniOps Staff App — authenticated API client.
 *
 * Talks to the authenticated endpoints of the OmniOps API:
 *   POST /api/auth/login                       → { accessToken, refreshToken, user }
 *   GET  /api/auth/me                          → profile (unwrapped)
 *   GET  /api/shifts?siteId=...                → { success, data: Shift[], meta }
 *   GET  /api/maintenance/tickets?siteId=...   → { success, data: Ticket[], meta }
 *   GET  /api/maintenance/tickets/:id          → { success, data: Ticket }
 *   PATCH /api/maintenance/tickets/:id/status  → { success, data: Ticket }   body { status }
 *
 * Base URL resolution matches the customer client (src/api.ts):
 *   process.env.EXPO_PUBLIC_API_URL — set at bundle time (Metro inlines it).
 *   Defaults to http://localhost:4000/api (works for iOS simulator / Expo Go
 *   on the same machine as the API). On a physical device set
 *   EXPO_PUBLIC_API_URL to the machine's LAN address, e.g.
 *   EXPO_PUBLIC_API_URL=http://192.168.1.50:4000/api
 */
import { API_BASE_URL, ApiRequestError } from '../api';

// ─── Auth ────────────────────────────────────────────────────────────────

export interface StaffUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: Record<string, boolean> | null;
  tenantId: string | null;
  siteId: string | null;
  status: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: StaffUser;
}

/** Roles allowed to read shifts (mirrors the API's RolesGuard). */
export const SHIFT_ROLES = ['SUPER_ADMIN', 'BRAND_MANAGER', 'SITE_LEAD'];
/** Roles allowed to read/update maintenance tickets (mirrors RolesGuard). */
export const TICKET_ROLES = ['SUPER_ADMIN', 'BRAND_MANAGER', 'SITE_LEAD', 'MAINTENANCE_TECH'];

export function canViewShifts(role: string): boolean {
  return SHIFT_ROLES.includes(role);
}

export function canViewTickets(role: string): boolean {
  return TICKET_ROLES.includes(role);
}

// ─── Shifts ──────────────────────────────────────────────────────────────

export interface Shift {
  id: string;
  siteId: string;
  name: string;
  startTime: string;
  endTime: string | null;
  openingCash?: string | number | null;
  closingCash?: string | number | null;
  notes?: string | null;
  status: string; // OPEN | CLOSING | CLOSED
  site?: { id: string; name: string } | null;
  openedBy?: { id: string; firstName: string; lastName: string } | null;
  closedBy?: { id: string; firstName: string; lastName: string } | null;
}

// ─── Maintenance tickets ─────────────────────────────────────────────────

export interface TicketComment {
  id: string;
  content: string;
  createdAt: string;
  user?: { id: string; firstName: string; lastName: string } | null;
}

export interface Ticket {
  id: string;
  tenantId?: string;
  siteId?: string;
  title: string;
  description: string | null;
  priority: string; // LOW | MEDIUM | HIGH | CRITICAL
  status: string; // OPEN | ASSIGNED | IN_PROGRESS | ON_HOLD | RESOLVED | CLOSED
  category: string | null;
  reportedById?: string;
  assignedToId?: string | null;
  slaDueAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  resolution?: string | null;
  createdAt: string;
  updatedAt?: string;
  asset?: { id: string; name: string; category?: string | null } | null;
  assignedTo?: { id: string; firstName: string; lastName: string } | null;
  reportedBy?: { id: string; firstName: string; lastName: string } | null;
  site?: { id: string; name: string } | null;
  comments?: TicketComment[];
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: { page: number; limit: number; total: number; totalPages?: number };
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, Accept: 'application/json' };
}

function unwrap<T>(body: ApiEnvelope<T>): T {
  if (body && typeof body === 'object' && 'success' in body && body.success === false) {
    throw new ApiRequestError('Request failed');
  }
  return (body as ApiEnvelope<T>).data;
}

// ─── Endpoints ───────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await parseError(res);
    // 401 = wrong credentials — give the user a crisp message.
    if (res.status === 401) {
      throw new ApiRequestError('Invalid credentials. Check your email and password.', 401);
    }
    throw err;
  }
  const body = (await res.json()) as LoginResponse;
  return body;
}

export async function fetchProfile(token: string): Promise<StaffUser> {
  const res = await fetch(`${API_BASE_URL}/auth/me`, { headers: authHeaders(token) });
  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as StaffUser;
  return body;
}

export async function fetchShifts(token: string, siteId: string | null): Promise<Shift[]> {
  const query = new URLSearchParams({ limit: '50' });
  if (siteId) query.set('siteId', siteId);
  const res = await fetch(`${API_BASE_URL}/shifts?${query.toString()}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as ApiEnvelope<Shift[]>;
  return unwrap(body);
}

export async function fetchTickets(token: string, siteId: string | null): Promise<Ticket[]> {
  const query = new URLSearchParams({ limit: '50' });
  if (siteId) query.set('siteId', siteId);
  const res = await fetch(`${API_BASE_URL}/maintenance/tickets?${query.toString()}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as ApiEnvelope<Ticket[]>;
  return unwrap(body);
}

export async function fetchTicket(token: string, id: string): Promise<Ticket> {
  const res = await fetch(`${API_BASE_URL}/maintenance/tickets/${encodeURIComponent(id)}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as ApiEnvelope<Ticket>;
  return unwrap(body);
}

/** PATCH /maintenance/tickets/:id/status — body { status } (e.g. "IN_PROGRESS"). */
export async function updateTicketStatus(
  token: string,
  id: string,
  status: string,
): Promise<Ticket> {
  const res = await fetch(`${API_BASE_URL}/maintenance/tickets/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as ApiEnvelope<Ticket>;
  return unwrap(body);
}

// ─── Shared error parsing ────────────────────────────────────────────────

/**
 * The API's global exception filter returns:
 *   { success: false, data: null, error: { code, message, timestamp, path } }
 * `message` may be a string OR an array (class-validator errors).
 */
async function parseError(res: Response): Promise<ApiRequestError> {
  let message = `Request failed (${res.status})`;
  try {
    const body = (await res.json()) as {
      error?: { message?: string | string[] };
    };
    const m = body?.error?.message;
    if (Array.isArray(m) && m.length > 0 && m[0]) message = m[0];
    else if (typeof m === 'string' && m) message = m;
  } catch {
    // Non-JSON error body — keep the generic message.
  }
  return new ApiRequestError(message, res.status);
}
