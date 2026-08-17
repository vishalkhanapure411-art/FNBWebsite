'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  getAudit,
  respondToItem,
  completeAudit,
  updateAuditStatus,
  createCapa,
  resolveCapa,
  verifyCapa,
  type AuditDetail,
  type AuditItem,
  type AuditResponse,
  type CapaData,
} from '@/lib/api/quality';
import { getUsers } from '@/lib/api/users';

const inputCls =
  'w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm';

interface UserLite {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

export default function AuditFormPage() {
  const params = useParams();
  const router = useRouter();
  const auditId = params.auditId as string;
  const siteId = params.id as string;
  const { addToast } = useToast();

  const [audit, setAudit] = useState<AuditDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [responses, setResponses] = useState<Record<string, AuditResponse>>({});
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
  const [users, setUsers] = useState<UserLite[]>([]);

  // CAPA modal
  const [showCapa, setShowCapa] = useState(false);
  const [capaForm, setCapaForm] = useState({
    title: '',
    description: '',
    assignedToId: '',
    priority: 'HIGH',
    dueDate: '',
  });

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getAudit(auditId);
      const d = res.data;
      if (!d) {
        setAudit(null);
        return;
      }
      setAudit(d);
      const map: Record<string, AuditResponse> = {};
      for (const r of d.responses ?? []) map[r.itemId] = r;
      setResponses(map);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load audit', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [auditId, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getUsers({ limit: 200 })
      .then((r) => setUsers((r.data ?? []).map((u) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email }))))
      .catch(() => {});
  }, []);

  const items = useMemo(() => {
    if (!audit?.template?.sections) return [] as AuditItem[];
    return audit.template.sections
      .flatMap((s) => s.items)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [audit]);

  const answeredCount = useMemo(
    () => items.filter((item) => (responses[item.id]?.value ?? '').trim() !== '').length,
    [items, responses],
  );

  const liveScore = useMemo(() => {
    const scorable = items.filter((i) => ['PASS_FAIL', 'YES_NO', 'SCORE_1_5'].includes(i.itemType));
    if (!scorable.length) return null;
    let earned = 0;
    for (const item of scorable) {
      const v = (responses[item.id]?.value ?? '').trim().toLowerCase();
      if (!v) continue;
      if (item.itemType === 'SCORE_1_5') {
        const n = Number(v);
        if (n >= 1 && n <= 5) earned += n / 5;
      } else if (v === 'pass' || v === 'yes') {
        earned += 1;
      }
    }
    return Math.round((earned / scorable.length) * 1000) / 10;
  }, [items, responses]);

  const isCompleted = audit ? ['COMPLETED', 'REVIEWED', 'CLOSED'].includes(audit.status) : false;

  const pushResponse = async (itemId: string, value: string, extra?: { notes?: string; photoUrl?: string }) => {
    if (!audit || audit.status !== 'IN_PROGRESS') return;
    const current = responses[itemId];
    const notes = extra?.notes !== undefined ? extra.notes : (current?.notes ?? undefined);
    const photoUrl = extra?.photoUrl !== undefined ? extra.photoUrl : (current?.photoUrl ?? undefined);
    setResponses((p) => ({ ...p, [itemId]: { ...(p[itemId] ?? ({ id: '', auditId, itemId, value: '', createdAt: '' } as AuditResponse)), value, notes: notes ?? null, photoUrl: photoUrl ?? null } }));
    setIsSaving((p) => ({ ...p, [itemId]: true }));
    try {
      await respondToItem(auditId, { itemId, value, ...(notes ? { notes } : {}), ...(photoUrl ? { photoUrl } : {}) });
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save response', 'error');
    } finally {
      setIsSaving((p) => ({ ...p, [itemId]: false }));
    }
  };

  const handleComplete = async () => {
    if (!audit) return;
    if (!window.confirm('Complete this audit? The score will be calculated and the audit locked.')) return;
    setIsCompleting(true);
    try {
      await completeAudit(auditId);
      addToast('Audit completed', 'success');
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to complete audit', 'error');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleTransition = async (status: string) => {
    try {
      await updateAuditStatus(auditId, status);
      addToast(`Audit marked ${status.replace(/_/g, ' ')}`, 'success');
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Status update failed', 'error');
    }
  };

  const handleCreateCapa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capaForm.title.trim() || !capaForm.assignedToId) return;
    try {
      await createCapa(auditId, {
        title: capaForm.title.trim(),
        description: capaForm.description,
        assignedToId: capaForm.assignedToId,
        priority: capaForm.priority,
        dueDate: capaForm.dueDate || undefined,
      });
      addToast('CAPA created', 'success');
      setShowCapa(false);
      setCapaForm({ title: '', description: '', assignedToId: '', priority: 'HIGH', dueDate: '' });
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create CAPA', 'error');
    }
  };

  if (isLoading) {
    return <div className="text-surface-500 py-16 text-center">Loading audit…</div>;
  }
  if (!audit) {
    return <div className="text-surface-500 py-16 text-center">Audit not found.</div>;
  }

  const sections = audit.template?.sections ?? [];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{audit.title}</h1>
            <StatusBadge status={audit.status} />
          </div>
          <p className="text-sm text-surface-500 mt-1">
            {audit.template?.name} · {audit.site?.name} ·{' '}
            {audit.auditor ? `by ${audit.auditor.firstName} ${audit.auditor.lastName}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Score tracker */}
          <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-5 py-3 text-center">
            <p className="text-xs uppercase tracking-wider text-surface-500">Score</p>
            <p className="text-2xl font-bold text-brand-600">
              {audit.score !== null && audit.score !== undefined ? `${audit.score}%` : isCompleted ? '—' : `${liveScore ?? 0}%`}
            </p>
            <p className="text-[10px] text-surface-500">
              {answeredCount}/{items.length} answered
            </p>
          </div>
          {!isCompleted ? (
            <button
              onClick={handleComplete}
              disabled={isCompleting}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {isCompleting ? 'Completing…' : 'Complete Audit'}
            </button>
          ) : (
            <div className="flex gap-2">
              {audit.status === 'COMPLETED' && (
                <button onClick={() => handleTransition('REVIEWED')} className="rounded-lg bg-brand-600 px-4 py-2 text-white text-sm hover:bg-brand-700">
                  Mark Reviewed
                </button>
              )}
              {['COMPLETED', 'REVIEWED'].includes(audit.status) && (
                <button onClick={() => handleTransition('CLOSED')} className="rounded-lg border border-surface-300 dark:border-surface-600 px-4 py-2 text-sm hover:bg-surface-100 dark:hover:bg-surface-700">
                  Close Audit
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      {!sections.length ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-surface-500">Template has no sections.</div>
      ) : (
        <div className="space-y-5">
          {[...sections].sort((a, b) => a.sortOrder - b.sortOrder).map((section) => (
            <div key={section.id} className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 overflow-hidden">
              <div className="px-5 py-3 bg-surface-50 dark:bg-surface-700/40 border-b border-surface-100 dark:border-surface-700">
                <h2 className="font-semibold">{section.title}</h2>
                {section.description && <p className="text-xs text-surface-500 mt-0.5">{section.description}</p>}
              </div>
              <div>
                {[...section.items].sort((a, b) => a.sortOrder - b.sortOrder).map((item) => {
                  const resp = responses[item.id];
                  const value = resp?.value ?? '';
                  const saving = isSaving[item.id];
                  return (
                    <div key={item.id} className="px-5 py-4 border-b border-surface-100 dark:border-surface-700 last:border-b-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {item.question}
                            {item.required && <span className="text-red-500 ml-1">*</span>}
                          </p>
                          {item.description && <p className="text-xs text-surface-500 mt-0.5">{item.description}</p>}
                        </div>
                        {saving && <span className="text-[10px] text-surface-400 shrink-0">saving…</span>}
                      </div>
                      <div className="mt-3">
                        {/* PASS_FAIL */}
                        {item.itemType === 'PASS_FAIL' && (
                          <div className="flex gap-2">
                            {['pass', 'fail'].map((opt) => (
                              <button
                                key={opt}
                                onClick={() => pushResponse(item.id, opt)}
                                disabled={isCompleted}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium border disabled:opacity-50 ${
                                  value === opt
                                    ? opt === 'pass'
                                      ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-400'
                                      : 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-400'
                                    : 'border-surface-300 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-700'
                                }`}
                              >
                                {opt === 'pass' ? '✓ Pass' : '✗ Fail'}
                              </button>
                            ))}
                          </div>
                        )}
                        {/* SCORE_1_5 */}
                        {item.itemType === 'SCORE_1_5' && (
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button
                                key={n}
                                onClick={() => pushResponse(item.id, String(n))}
                                disabled={isCompleted}
                                className={`text-2xl disabled:opacity-50 ${Number(value) >= n ? 'text-amber-400' : 'text-surface-300 dark:text-surface-600'}`}
                                title={`${n} / 5`}
                              >
                                ★
                              </button>
                            ))}
                            {value && <span className="ml-2 text-sm text-surface-500">{value}/5</span>}
                          </div>
                        )}
                        {/* YES_NO */}
                        {item.itemType === 'YES_NO' && (
                          <div className="flex gap-2">
                            {['yes', 'no'].map((opt) => (
                              <button
                                key={opt}
                                onClick={() => pushResponse(item.id, opt)}
                                disabled={isCompleted}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium border disabled:opacity-50 ${
                                  value === opt
                                    ? opt === 'yes'
                                      ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-400'
                                      : 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-400'
                                    : 'border-surface-300 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-700'
                                }`}
                              >
                                {opt === 'yes' ? 'Yes' : 'No'}
                              </button>
                            ))}
                          </div>
                        )}
                        {/* TEMPERATURE */}
                        {item.itemType === 'TEMPERATURE' && (
                          <div className="flex items-center gap-2 max-w-xs">
                            <input
                              type="number"
                              step="0.1"
                              disabled={isCompleted}
                              className={inputCls}
                              placeholder="e.g. 4.0"
                              value={value}
                              onChange={(e) => {
                                setResponses((p) => ({ ...p, [item.id]: { ...(p[item.id] ?? { id: '', auditId, itemId: item.id, value: '', createdAt: '' }), value: e.target.value } }));
                              }}
                              onBlur={(e) => e.target.value && pushResponse(item.id, e.target.value)}
                            />
                            <span className="text-sm text-surface-500">°C</span>
                          </div>
                        )}
                        {/* PHOTO_REQUIRED */}
                        {item.itemType === 'PHOTO_REQUIRED' && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                className={inputCls}
                                placeholder="Photo URL (e.g. MinIO / storage link)"
                                value={resp?.photoUrl ?? ''}
                                disabled={isCompleted}
                                onChange={(e) => {
                                  const photoUrl = e.target.value;
                                  setResponses((p) => ({ ...p, [item.id]: { ...(p[item.id] ?? { id: '', auditId, itemId: item.id, value: '', createdAt: '' }), photoUrl, value: photoUrl ? 'photo' : '' } }));
                                }}
                                onBlur={(e) => e.target.value && pushResponse(item.id, 'photo', { photoUrl: e.target.value })}
                              />
                            </div>
                            {resp?.photoUrl && (
                              <a href={resp.photoUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">
                                📷 View attached photo
                              </a>
                            )}
                          </div>
                        )}
                        {/* Notes */}
                        <div className="mt-2">
                          <input
                            className={inputCls + ' max-w-md'}
                            placeholder="Notes (optional)"
                            defaultValue={resp?.notes ?? ''}
                            disabled={isCompleted}
                            key={`${item.id}-${resp?.notes ?? ''}`}
                            onBlur={(e) => e.target.value && pushResponse(item.id, value || (item.itemType === 'PHOTO_REQUIRED' ? 'photo' : ''), { notes: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CAPA section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Corrective Actions (CAPA)</h2>
          <button onClick={() => setShowCapa(true)} className="rounded-lg bg-brand-600 px-4 py-2 text-white text-sm font-medium hover:bg-brand-700">
            + Create CAPA
          </button>
        </div>
        {!audit.capas?.length ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-surface-500">
            <p className="text-3xl mb-2">🛠️</p>
            <p className="text-sm">No corrective actions for this audit</p>
          </div>
        ) : (
          <div className="space-y-3">
            {audit.capas.map((capa) => (
              <CapaRow key={capa.id} capa={capa} onChanged={load} addToast={addToast} />
            ))}
          </div>
        )}
      </div>

      {/* Create CAPA modal */}
      <Modal isOpen={showCapa} onClose={() => setShowCapa(false)} title="Create corrective action">
        <form onSubmit={handleCreateCapa} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input required className={inputCls} placeholder="e.g. Repair chiller #2" value={capaForm.title} onChange={(e) => setCapaForm({ ...capaForm, title: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea className={inputCls} placeholder="What needs to be fixed and why" value={capaForm.description} onChange={(e) => setCapaForm({ ...capaForm, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Assign to *</label>
              <select required className={inputCls} value={capaForm.assignedToId} onChange={(e) => setCapaForm({ ...capaForm, assignedToId: e.target.value })}>
                <option value="">Select…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select className={inputCls} value={capaForm.priority} onChange={(e) => setCapaForm({ ...capaForm, priority: e.target.value })}>
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Due date</label>
            <input type="date" className={inputCls} value={capaForm.dueDate} onChange={(e) => setCapaForm({ ...capaForm, dueDate: e.target.value })} />
          </div>
          <button type="submit" className="w-full rounded-lg bg-brand-600 py-2 text-white text-sm font-medium hover:bg-brand-700">
            Create CAPA
          </button>
        </form>
      </Modal>
    </div>
  );
}

function CapaRow({
  capa,
  onChanged,
  addToast,
}: {
  capa: CapaData;
  onChanged: () => void;
  addToast: (msg: string, type?: 'success' | 'error') => void;
}) {
  const [resolution, setResolution] = useState(capa.resolution ?? '');
  const [busy, setBusy] = useState(false);
  const priorityColor: Record<string, string> = {
    LOW: 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400',
    MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    HIGH: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  const handleResolve = async () => {
    if (!resolution.trim()) {
      addToast('Enter a resolution note first', 'error');
      return;
    }
    setBusy(true);
    try {
      await resolveCapa(capa.id, resolution.trim());
      addToast('CAPA resolved', 'success');
      onChanged();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Resolve failed', 'error');
    } finally {
      setBusy(false);
    }
  };
  const handleVerify = async () => {
    setBusy(true);
    try {
      await verifyCapa(capa.id);
      addToast('CAPA verified', 'success');
      onChanged();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Verify failed', 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{capa.title}</p>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${priorityColor[capa.priority] ?? priorityColor.LOW}`}>{capa.priority}</span>
            <StatusBadge status={capa.status} />
          </div>
          <p className="text-sm text-surface-500 mt-1">{capa.description}</p>
          <p className="text-xs text-surface-500 mt-1">
            Assigned to {capa.assignedTo ? `${capa.assignedTo.firstName} ${capa.assignedTo.lastName}` : '—'}
            {capa.dueDate && ` · Due ${new Date(capa.dueDate).toLocaleDateString()}`}
          </p>
        </div>
      </div>
      {capa.status === 'OPEN' || capa.status === 'IN_PROGRESS' ? (
        <div className="mt-3 flex gap-2">
          <input
            className={inputCls + ' flex-1'}
            placeholder="Resolution note…"
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
          />
          <button onClick={handleResolve} disabled={busy} className="rounded-lg bg-emerald-600 px-4 py-2 text-white text-sm disabled:opacity-50 shrink-0">
            Resolve
          </button>
        </div>
      ) : capa.status === 'RESOLVED' ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-sm text-surface-600 dark:text-surface-400 flex-1">💬 {capa.resolution || 'Resolved'}</p>
          <button onClick={handleVerify} disabled={busy} className="rounded-lg bg-brand-600 px-4 py-1.5 text-white text-sm disabled:opacity-50 shrink-0">
            Verify
          </button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-surface-500">✅ Verified {capa.resolvedAt ? `on ${new Date(capa.resolvedAt).toLocaleDateString()}` : ''}</p>
      )}
    </div>
  );
}
