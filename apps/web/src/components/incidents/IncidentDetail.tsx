'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/components/ui/Toast';
import {
  getIncident,
  updateIncidentStatus,
  addIncidentComment,
  type IncidentTicket,
} from '@/lib/api/incidents';
import {
  INCIDENT_DEPT_BY_ROLE,
  INCIDENT_DEPARTMENT_LABELS,
  INCIDENT_NEXT_STATUS,
} from '@/lib/incidents';
import type {
  IncidentSeverity,
  IncidentStatus,
} from '@omniops/shared';

const severityClasses: Record<IncidentSeverity, string> = {
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  LOW: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

const statusClasses: Record<IncidentStatus, string> = {
  OPEN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  ASSIGNED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  RESOLVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  CLOSED: 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400',
};

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function fmt(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function personName(t: IncidentTicket, who: 'createdBy' | 'assignedTo') {
  const p = t[who];
  if (!p) return who === 'assignedTo' ? 'Unassigned' : 'Unknown';
  return `${p.firstName} ${p.lastName}`.trim() || p.email || 'Unknown';
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">{label}</dt>
      <dd className="mt-1 text-sm text-surface-900 dark:text-surface-100">{children}</dd>
    </div>
  );
}

export function IncidentDetail({ ticketId, siteId }: { ticketId: string; siteId?: string }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [t, setT] = useState<IncidentTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const canWrite = !!user && !!INCIDENT_DEPT_BY_ROLE[user.role as never];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getIncident(ticketId);
      setT(r.data);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load ticket', 'error');
    } finally {
      setLoading(false);
    }
  }, [ticketId, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="text-surface-500 py-10 text-center">Loading ticket…</p>;
  if (!t) return <p className="text-surface-500 py-10 text-center">Ticket not found or not visible.</p>;

  const overdue =
    t.dueAt &&
    t.status !== 'CLOSED' &&
    t.status !== 'RESOLVED' &&
    new Date(t.dueAt) < new Date();

  const backHref = siteId ? `/sites/${siteId}/incidents` : '/admin/incidents';
  const nextSteps = INCIDENT_NEXT_STATUS[t.status] ?? [];

  const transition = async (s: IncidentStatus) => {
    setBusy(true);
    try {
      await updateIncidentStatus(ticketId, s);
      addToast(`Status → ${s}`, 'success');
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Transition failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setBusy(true);
    try {
      await addIncidentComment(ticketId, comment.trim());
      setComment('');
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Comment failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const categoryPath = [t.categoryLevel1?.name, t.categoryLevel2?.name, t.categoryLevel3?.name]
    .filter(Boolean)
    .join(' › ') || '—';

  return (
    <div>
      <Link href={backHref} className="text-sm text-brand-600 hover:underline">← Back to incidents</Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">{t.ticketNumber}</h1>
        <Badge label={INCIDENT_DEPARTMENT_LABELS[t.department]} className="bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300" />
        <Badge label={t.severity} className={severityClasses[t.severity]} />
        <Badge label={t.status} className={statusClasses[t.status]} />
        {overdue && <Badge label="OVERDUE" className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" />}
      </div>
      <h2 className="mt-2 text-lg font-semibold text-surface-900 dark:text-surface-100">{t.title}</h2>

      {/* Status workflow */}
      {canWrite && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400 mb-1.5">Status transition</p>
          <div className="flex flex-wrap gap-2">
            {nextSteps.length ? (
              nextSteps.map((s) => (
                <button
                  key={s}
                  disabled={busy}
                  onClick={() => transition(s as IncidentStatus)}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  → {s}
                </button>
              ))
            ) : (
              <span className="text-sm text-surface-500">No further transitions (closed).</span>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-200 mb-1">Description</h3>
            <p className="text-sm text-surface-700 dark:text-surface-300 whitespace-pre-wrap">{t.description || 'No description.'}</p>
          </div>
          <dl className="rounded-xl border border-surface-200 dark:border-surface-700 p-4 grid grid-cols-2 gap-4">
            <Field label="Site">{t.site?.name ?? '—'}</Field>
            <Field label="Category">{categoryPath}</Field>
            <Field label="SLA Due">{fmt(t.dueAt)}</Field>
            <Field label="Created">{fmt(t.createdAt)}</Field>
            <Field label="Assigned To">{personName(t, 'assignedTo')}</Field>
            <Field label="Created By">{personName(t, 'createdBy')}</Field>
            <Field label="Resolved">{fmt(t.resolvedAt)}</Field>
            <Field label="Closed">{fmt(t.closedAt)}</Field>
            <Field label="Updated">{fmt(t.updatedAt)}</Field>
          </dl>
        </div>

        {/* Comments */}
        <div>
          <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-200 mb-2">
            Activity · {(t.comments ?? []).length}
          </h3>
          <div className="space-y-3 max-h-[24rem] overflow-y-auto pr-1">
            {(t.comments ?? []).map((c) => (
              <div key={c.id} className="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                <div className="flex justify-between text-xs text-surface-500">
                  <span className="font-medium text-surface-700 dark:text-surface-200">
                    {c.author ? `${c.author.firstName} ${c.author.lastName}` : 'Unknown'}
                  </span>
                  <span>{fmt(c.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm text-surface-700 dark:text-surface-300">{c.text}</p>
              </div>
            ))}
            {!(t.comments ?? []).length && (
              <p className="text-sm text-surface-500">No activity yet.</p>
            )}
          </div>
          {canWrite && (
            <form onSubmit={submitComment} className="mt-3 flex gap-2">
              <input
                className="flex-1 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Add a comment…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <button
                type="submit"
                disabled={busy || !comment.trim()}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
              >
                Post
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
