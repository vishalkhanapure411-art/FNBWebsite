'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/components/ui/Toast';
import { getSites, type SiteWithTenant } from '@/lib/api/sites';
import {
  getIncidents,
  type IncidentTicket,
} from '@/lib/api/incidents';
import { IncidentCreateModal } from '@/components/incidents/IncidentCreateModal';
import {
  INCIDENT_DEPT_BY_ROLE,
  INCIDENT_READ_ALL_ROLES,
  INCIDENT_DEPARTMENT_LABELS,
} from '@/lib/incidents';
import {
  IncidentDepartment,
  IncidentSeverity,
  IncidentStatus,
} from '@omniops/shared';

const inputClass =
  'w-auto rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500';

const DEPARTMENTS: IncidentDepartment[] = [
  IncidentDepartment.QA,
  IncidentDepartment.RA,
  IncidentDepartment.MAINTENANCE,
  IncidentDepartment.CONTROLS,
];
const SEVERITIES: IncidentSeverity[] = [
  IncidentSeverity.LOW,
  IncidentSeverity.MEDIUM,
  IncidentSeverity.HIGH,
  IncidentSeverity.CRITICAL,
];
const STATUSES: IncidentStatus[] = [
  IncidentStatus.OPEN,
  IncidentStatus.ASSIGNED,
  IncidentStatus.IN_PROGRESS,
  IncidentStatus.RESOLVED,
  IncidentStatus.CLOSED,
];

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

export function IncidentConsole({ presetSiteId }: { presetSiteId?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();

  const readAll = !!user && INCIDENT_READ_ALL_ROLES.includes(user.role as never);
  const canCreate = !!user && !!INCIDENT_DEPT_BY_ROLE[user.role as never];
  const isCentral = !user?.siteId;

  const [tickets, setTickets] = useState<IncidentTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'' | IncidentStatus>('');
  const [severity, setSeverity] = useState<'' | IncidentSeverity>('');
  const [department, setDepartment] = useState<'' | IncidentDepartment>('');
  const [siteId, setSiteId] = useState('');
  const [sites, setSites] = useState<SiteWithTenant[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getIncidents({
        siteId: presetSiteId ?? (isCentral && siteId ? siteId : undefined),
        department: readAll && department ? department : undefined,
        status: status || undefined,
        severity: severity || undefined,
        page,
        limit: 25,
      });
      setTickets(r.data);
      setTotal(r.meta.total);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load incidents', 'error');
    } finally {
      setLoading(false);
    }
  }, [presetSiteId, isCentral, siteId, readAll, department, status, severity, page, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (isCentral && !presetSiteId) {
      getSites({ limit: 200 })
        .then((r) => setSites(Array.isArray(r?.data) ? r.data : []))
        .catch(() => setSites([]));
    }
  }, [isCentral, presetSiteId]);

  const totalPages = Math.max(1, Math.ceil(total / 25));

  return (
    <div>
      <div className="flex flex-wrap justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50">Incidents</h1>
          <p className="text-surface-500 mt-1">
            Unified ticketing for Quality, Revenue Assurance, Maintenance & Controls
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-white hover:bg-brand-700"
          >
            + New Incident
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          className={inputClass}
          value={status}
          onChange={(e) => { setPage(1); setStatus(e.target.value as '' | IncidentStatus); }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          className={inputClass}
          value={severity}
          onChange={(e) => { setPage(1); setSeverity(e.target.value as '' | IncidentSeverity); }}
        >
          <option value="">All severities</option>
          {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {readAll && (
          <select
            className={inputClass}
            value={department}
            onChange={(e) => { setPage(1); setDepartment(e.target.value as '' | IncidentDepartment); }}
          >
            <option value="">All departments</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{INCIDENT_DEPARTMENT_LABELS[d]}</option>)}
          </select>
        )}
        {isCentral && !presetSiteId && (
          <select
            className={inputClass}
            value={siteId}
            onChange={(e) => { setPage(1); setSiteId(e.target.value); }}
          >
            <option value="">All sites</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <p className="text-surface-500 py-10 text-center">Loading incidents…</p>
      ) : !tickets.length ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-surface-500">
          No incident tickets found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-surface-200 dark:border-surface-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-50 dark:bg-surface-800/60 text-surface-500 dark:text-surface-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3">SLA Due</th>
                <th className="px-4 py-3">Assigned / Created by</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              {tickets.map((t) => {
                const overdue = t.dueAt && t.status !== 'CLOSED' && t.status !== 'RESOLVED' && new Date(t.dueAt) < new Date();
                return (
                  <tr
                    key={t.id}
                    onClick={() => router.push(
                      presetSiteId ? `/sites/${presetSiteId}/incidents/${t.id}` : `/admin/incidents/${t.id}`,
                    )}
                    className="cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/50"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-brand-600">{t.ticketNumber}</td>
                    <td className="px-4 py-3">
                      <Badge label={INCIDENT_DEPARTMENT_LABELS[t.department]} className="bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300" />
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate font-medium text-surface-900 dark:text-surface-100">{t.title}</td>
                    <td className="px-4 py-3 text-xs text-surface-500 max-w-[10rem]">
                      {t.categoryLevel3?.name ?? t.categoryLevel2?.name ?? t.categoryLevel1?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3"><Badge label={t.severity} className={severityClasses[t.severity]} /></td>
                    <td className="px-4 py-3"><Badge label={t.status} className={statusClasses[t.status]} /></td>
                    <td className="px-4 py-3 text-surface-600 dark:text-surface-300">{t.site?.name ?? '—'}</td>
                    <td className={`px-4 py-3 text-xs ${overdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-surface-500'}`}>
                      {fmt(t.dueAt)}{overdue ? ' OVERDUE' : ''}
                    </td>
                    <td className="px-4 py-3 text-xs text-surface-500">
                      {personName(t, 'assignedTo')}
                      <span className="block text-surface-400">by {personName(t, 'createdBy')}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-surface-500">{fmt(t.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && total > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm text-surface-500">
          <span>{total} ticket{total === 1 ? '' : 's'} · page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-surface-300 dark:border-surface-600 px-3 py-1.5 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-surface-300 dark:border-surface-600 px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <IncidentCreateModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setPage(1);
          load();
        }}
        presetSiteId={presetSiteId}
      />
    </div>
  );
}
