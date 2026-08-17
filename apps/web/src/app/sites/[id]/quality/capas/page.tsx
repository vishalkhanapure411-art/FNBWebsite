'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getCapas, resolveCapa, verifyCapa, type CapaData } from '@/lib/api/quality';

const inputCls =
  'w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm';

const priorityColor: Record<string, string> = {
  LOW: 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400',
  MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  HIGH: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function CapaDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.id as string;
  const { addToast } = useToast();

  const [capas, setCapas] = useState<CapaData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [resolveFor, setResolveFor] = useState<CapaData | null>(null);
  const [resolution, setResolution] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getCapas({
        siteId,
        status: statusFilter || undefined,
        limit: 100,
      });
      setCapas(res.data ?? []);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load CAPAs', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [siteId, statusFilter, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = capas.filter((c) => !priorityFilter || c.priority === priorityFilter);

  const handleResolve = async () => {
    if (!resolveFor || !resolution.trim()) return;
    setBusy(true);
    try {
      await resolveCapa(resolveFor.id, resolution.trim());
      addToast('CAPA resolved', 'success');
      setResolveFor(null);
      setResolution('');
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Resolve failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (capa: CapaData) => {
    setBusy(true);
    try {
      await verifyCapa(capa.id);
      addToast('CAPA verified', 'success');
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Verify failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Corrective Actions</h1>
          <p className="text-surface-500 mt-1">Track and close out CAPAs from quality audits</p>
        </div>
      </div>

      <div className="flex gap-3 mb-5">
        <select
          className={inputCls + ' w-auto'}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select
          className={inputCls + ' w-auto'}
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="">All priorities</option>
          {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl border border-surface-200 dark:border-surface-700 animate-pulse" />
          ))}
        </div>
      ) : !filtered.length ? (
        <div className="rounded-xl border border-dashed p-16 text-center text-surface-500">
          <p className="text-4xl mb-3">🛠️</p>
          <p className="font-medium">No corrective actions</p>
          <p className="text-sm mt-1">CAPAs created from audits will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((capa) => {
            const isOpen = capa.status === 'OPEN' || capa.status === 'IN_PROGRESS';
            return (
              <div key={capa.id} className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => router.push(`/sites/${siteId}/quality/audits/${capa.auditId}`)}
                        className="font-medium hover:text-brand-600 hover:underline text-left"
                      >
                        {capa.title}
                      </button>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${priorityColor[capa.priority] ?? priorityColor.LOW}`}>
                        {capa.priority}
                      </span>
                      <StatusBadge status={capa.status} />
                    </div>
                    <p className="text-sm text-surface-500 mt-1">{capa.description}</p>
                    <p className="text-xs text-surface-500 mt-1.5">
                      {capa.audit?.site?.name && <span>{capa.audit.site.name} · </span>}
                      Assigned to {capa.assignedTo ? `${capa.assignedTo.firstName} ${capa.assignedTo.lastName}` : '—'}
                      {capa.dueDate && <span> · Due {new Date(capa.dueDate).toLocaleDateString()}</span>}
                    </p>
                    {capa.resolution && (
                      <p className="text-xs mt-1.5 bg-surface-50 dark:bg-surface-700/40 rounded-lg px-3 py-2">
                        💬 {capa.resolution}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {isOpen && (
                      <button
                        onClick={() => { setResolveFor(capa); setResolution(capa.resolution ?? ''); }}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-white text-xs font-medium hover:bg-emerald-700"
                      >
                        Resolve
                      </button>
                    )}
                    {capa.status === 'RESOLVED' && (
                      <button
                        onClick={() => handleVerify(capa)}
                        disabled={busy}
                        className="rounded-lg bg-brand-600 px-3 py-1.5 text-white text-xs font-medium hover:bg-brand-700 disabled:opacity-50"
                      >
                        Verify
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolve modal */}
      {resolveFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setResolveFor(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-surface-800 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1">Resolve CAPA</h3>
            <p className="text-sm text-surface-500 mb-4">{resolveFor.title}</p>
            <textarea
              className={inputCls + ' min-h-[100px]'}
              placeholder="Describe how this was resolved…"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setResolveFor(null)} className="rounded-lg border border-surface-300 dark:border-surface-600 px-4 py-2 text-sm">
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={busy || !resolution.trim()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-white text-sm disabled:opacity-50"
              >
                {busy ? 'Resolving…' : 'Mark Resolved'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
