'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getAudits, getTemplates, startAudit, type AuditData, type TemplateSummary } from '@/lib/api/quality';

export default function SiteAuditsPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.id as string;
  const { addToast } = useToast();

  const [audits, setAudits] = useState<AuditData[]>([]);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showStart, setShowStart] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [title, setTitle] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getAudits({ siteId, status: statusFilter || undefined, limit: 100 });
      setAudits(res.data ?? []);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load audits', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [siteId, statusFilter, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getTemplates().then((r) => setTemplates(r.data ?? [])).catch(() => {});
  }, []);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) {
      addToast('Select a template', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await startAudit({
        siteId,
        templateId: selectedTemplate,
        title: title.trim() || templates.find((t) => t.id === selectedTemplate)?.name || 'Quality Audit',
      });
      const audit = res.data;
      if (!audit) throw new Error('Audit could not be created');
      addToast('Audit started', 'success');
      setShowStart(false);
      setSelectedTemplate('');
      setTitle('');
      router.push(`/sites/${siteId}/quality/audits/${audit.id}`);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to start audit', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const scoreColor = (score?: number | null) => {
    if (score === null || score === undefined) return 'text-surface-500';
    if (score >= 90) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 75) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Quality Audits</h1>
          <p className="text-surface-500 mt-1">Conduct audits and track HACCP compliance</p>
        </div>
        <button
          onClick={() => setShowStart(true)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-white text-sm font-medium hover:bg-brand-700"
        >
          + Start Audit
        </button>
      </div>

      <div className="mb-4">
        <select
          className="rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {['IN_PROGRESS', 'COMPLETED', 'REVIEWED', 'CLOSED'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-8 space-y-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-surface-200 dark:bg-surface-700 rounded" />
          ))}
        </div>
      ) : !audits.length ? (
        <div className="rounded-xl border border-dashed p-16 text-center text-surface-500">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-medium">No audits yet</p>
          <p className="text-sm mt-1 mb-4">Start your first quality audit for this site</p>
          <button onClick={() => setShowStart(true)} className="rounded-lg bg-brand-600 px-4 py-2 text-white text-sm">
            + Start Audit
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-surface-500 border-b border-surface-200 dark:border-surface-700">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Template</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Auditor</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => router.push(`/sites/${siteId}/quality/audits/${a.id}`)}
                  className="border-b border-surface-100 dark:border-surface-700 last:border-b-0 hover:bg-surface-50 dark:hover:bg-surface-700/40 cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium">{a.title}</td>
                  <td className="px-4 py-3 text-surface-600 dark:text-surface-400">{a.template?.name ?? '—'}</td>
                  <td className={`px-4 py-3 font-semibold ${scoreColor(a.score)}`}>
                    {a.score !== null && a.score !== undefined ? `${a.score}%` : '—'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-3 text-surface-600 dark:text-surface-400">
                    {a.auditor ? `${a.auditor.firstName} ${a.auditor.lastName}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-surface-500">
                    {new Date(a.startedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showStart} onClose={() => setShowStart(false)} title="Start a new audit">
        <form onSubmit={handleStart} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Template *</label>
            <select
              required
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
            >
              <option value="">Select a template…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.category.replace(/_/g, ' ')})
                </option>
              ))}
            </select>
            {!templates.length && (
              <p className="text-xs text-amber-600 mt-1">No active templates — create one under Admin → Quality first.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Audit title</label>
            <input
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
              placeholder="Defaults to template name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !templates.length}
            className="w-full rounded-lg bg-brand-600 py-2 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Starting…' : 'Start audit'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
