/**
 * Staff app — display helpers: date/time formatting, role labels,
 * status/priority labels & colors, and the ticket status transition table
 * (mirrors VALID_TICKET_TRANSITIONS in the API's maintenance service).
 */

// ─── Dates ───────────────────────────────────────────────────────────────

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Roles ───────────────────────────────────────────────────────────────

export function formatRole(role: string): string {
  const map: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    BRAND_MANAGER: 'Brand Manager',
    SITE_LEAD: 'Site Lead',
    KITCHEN_STAFF: 'Kitchen Staff',
    FOH: 'Front of House',
    MAINTENANCE_TECH: 'Maintenance Tech',
    QUALITY_AUDITOR: 'Quality Auditor',
    HR_ADMIN: 'HR Admin',
    MARKETING_ADMIN: 'Marketing Admin',
    CUSTOMER: 'Customer',
  };
  return map[role] ?? role.replace(/_/g, ' ');
}

// ─── Shift status ────────────────────────────────────────────────────────

export const SHIFT_STATUS_LABEL: Record<string, string> = {
  OPEN: 'Open',
  CLOSING: 'Closing',
  CLOSED: 'Closed',
};

// ─── Ticket status / priority ────────────────────────────────────────────

export const TICKET_STATUS_LABEL: Record<string, string> = {
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In progress',
  ON_HOLD: 'On hold',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export const TICKET_PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

/**
 * Valid status transitions, mirrored from the API
 * (apps/api/src/modules/maintenance/maintenance.service.ts).
 */
export const TICKET_TRANSITIONS: Record<string, string[]> = {
  OPEN: ['ASSIGNED', 'CLOSED'],
  ASSIGNED: ['IN_PROGRESS', 'OPEN', 'CLOSED'],
  IN_PROGRESS: ['ON_HOLD', 'RESOLVED'],
  ON_HOLD: ['IN_PROGRESS', 'CLOSED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
};

/** Human-friendly label for each transition action button. */
export const TRANSITION_LABEL: Record<string, string> = {
  ASSIGNED: 'Accept',
  IN_PROGRESS: 'Start work',
  ON_HOLD: 'Put on hold',
  RESOLVED: 'Resolve',
  CLOSED: 'Close ticket',
  OPEN: 'Reopen',
};

export function getTransitionActions(status: string): string[] {
  return TICKET_TRANSITIONS[status] ?? [];
}
