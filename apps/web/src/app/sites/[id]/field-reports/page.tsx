'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  getFieldReports,
  createFieldReport,
  updateFieldReportStatus,
  addFieldReportComment,
  type FieldReportData,
  type FieldReportCategory,
  type FieldReportSeverity,
  type FieldReportStatus,
} from '@/lib/api/fieldReports';

const CATEGORIES: FieldReportCategory[] = ['SAFETY', 'QUALITY', 'MAINTENANCE', 'COMPLIANCE', 'OTHER'];
const SEVERITIES: FieldReportSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUSES: Array<FieldReportStatus | ''> = ['', 'NEW', 'REVIEWED', 'ACTIONED', 'DISMISSED'];

const severityClasses: Record<FieldReportSeverity, string> = {
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  LOW: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};
const categoryClasses: Record<FieldReportCategory, string> = {
  SAFETY: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  QUALITY: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  MAINTENANCE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  COMPLIANCE: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  OTHER: 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-300',
};
const statusClasses: Record<FieldReportStatus, string> = {
  NEW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  REVIEWED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  ACTIONED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  DISMISSED: 'bg-surface-100 text-surface-500 dark:bg-surface-700 dark:text-surface-400',
};

const inputClass =
  'w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500';

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

function formatDate(iso: string) {
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

function reporterName(r: FieldReportData) {
  const p = r.reportedBy;
  if (!p) return 'Unknown';
  return `${p.firstName} ${p.lastName}`.trim() || p.email || 'Unknown';
}

export default function FieldReportsPage() {
  const params = useParams();
  const siteId = params.id as string;
  const { addToast } = useToast();

  const [reports, setReports] = useState<FieldReportData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<FieldReportStatus | ''>('');

  // Form state
  const [category, setCategory] = useState<FieldReportCategory>('SAFETY');
  const [severity, setSeverity] = useState<FieldReportSeverity>('MEDIUM');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Comments / expand state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [transitioningId, setTransitioningId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getFieldReports({
        siteId,
        status: statusFilter || undefined,
        limit: 100,
      });
      setReports(res.data ?? []);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load field reports', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [siteId, statusFilter, addToast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleCreate = async () => {
    if (!title.trim()) {
      addToast('Title is required', 'error');
      return;
    }
    if (!description.trim()) {
      addToast('Description is required', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await createFieldReport({
        siteId,
        category,
        severity,
        title: title.trim(),
        description: description.trim(),
      });
      addToast('Field report submitted', 'success');
      setTitle('');
      setDescription('');
      setSeverity('MEDIUM');
      fetchReports();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to submit report', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransition = async (id: string, status: FieldReportStatus) => {
    setTransitioningId(id);
    try {
      await updateFieldReportStatus(id, status);
      addToast(`Report ${status === 'DISMISSED' ? 'dismissed' : `moved to ${status}`}`, 'success');
      fetchReports();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Status update failed', 'error');
    } finally {
      setTransitioningId(null);
    }
  };

  const handleAddComment = async (id: string) => {
    const body = commentText.trim();
    if (!body) return;
    setCommentingId(id);
    try {
      await addFieldReportComment(id, body);
      setCommentText('');
      addToast('Comment added', 'success');
      fetchReports();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to add comment', 'error');
    } finally {
      setCommentingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-xl font-semibold text-surface-900 dark:text-surface-100 mb-1">
        📋 Field Reports
      </h1>
      <p className="text-sm text-surface-500 dark:text-surface-400 mb-6">
        Submit observations and issues from the field. Management reviews and actions each report.
      </p>

      {/* ── Submit form ── */}
      <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-4 sm:p-5 mb-8 shadow-sm">
        <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-4">
          Submit a field report
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1.5">
              Category
            </label>
            <select value={category} onChange={(e) => setCategory(e.target.value as FieldReportCategory)} className={inputClass}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0) + c.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1.5">
              Severity
            </label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value as FieldReportSeverity)} className={inputClass}>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1.5">
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Slippery floor near the fryer"
            className={inputClass}
          />
        </div>
        <div className="mt-4">
          <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did you observe? Location, details, anything management should know."
            rows={3}
            className={`${inputClass} resize-y`}
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={isSubmitting}
          className="mt-4 w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Submitting…' : 'Submit report'}
        </button>
      </div>

      {/* ── List ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
          Reports for this site
        </h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as FieldReportStatus | '')}
          className="sm:w-44 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All statuses</option>
          {STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-surface-500">Loading reports…</div>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-300 dark:border-surface-600 py-12 text-center text-surface-500">
          No field reports{statusFilter ? ` with status ${statusFilter}` : ''} yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 shadow-sm overflow-hidden"
            >
              <div className="p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge label={r.severity} className={severityClasses[r.severity]} />
                  <Badge label={r.category} className={categoryClasses[r.category]} />
                  <Badge label={r.status} className={statusClasses[r.status]} />
                  <span className="ml-auto text-xs text-surface-400">{formatDate(r.createdAt)}</span>
                </div>
                <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                  {r.title}
                </h3>
                <p className="mt-1 text-sm text-surface-600 dark:text-surface-300 whitespace-pre-wrap">
                  {r.description}
                </p>
                <div className="mt-2 text-xs text-surface-400">
                  Reported by {reporterName(r)}
                </div>

                {/* Management actions */}
                {(r.status === 'NEW' || r.status === 'REVIEWED') && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.status === 'NEW' && (
                      <button
                        onClick={() => handleTransition(r.id, 'REVIEWED')}
                        disabled={transitioningId === r.id}
                        className="inline-flex items-center rounded-lg bg-amber-100 dark:bg-amber-900/40 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60 disabled:opacity-50"
                      >
                        ✓ Mark reviewed
                      </button>
                    )}
                    {r.status === 'REVIEWED' && (
                      <button
                        onClick={() => handleTransition(r.id, 'ACTIONED')}
                        disabled={transitioningId === r.id}
                        className="inline-flex items-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 disabled:opacity-50"
                      >
                        ✓ Mark actioned
                      </button>
                    )}
                    <button
                      onClick={() => handleTransition(r.id, 'DISMISSED')}
                      disabled={transitioningId === r.id}
                      className="inline-flex items-center rounded-lg bg-surface-100 dark:bg-surface-700 px-3 py-1.5 text-xs font-semibold text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-600 disabled:opacity-50"
                    >
                      ✕ Dismiss
                    </button>
                  </div>
                )}

                {/* Comments toggle */}
                <button
                  onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                  className="mt-3 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
                >
                  {expandedId === r.id
                    ? 'Hide comments'
                    : `Comments (${r.comments?.length ?? 0})`}
                </button>

                {expandedId === r.id && (
                  <div className="mt-3 border-t border-surface-100 dark:border-surface-700 pt-3">
                    <ul className="space-y-2">
                      {(r.comments ?? []).map((c) => (
                        <li
                          key={c.id}
                          className="rounded-lg bg-surface-50 dark:bg-surface-700/40 px-3 py-2 text-sm"
                        >
                          <span className="text-xs font-medium text-surface-500 dark:text-surface-400">
                            {c.author
                              ? `${c.author.firstName} ${c.author.lastName}`
                              : 'Staff'}{' '}
                            · {formatDate(c.createdAt)}
                          </span>
                          <p className="text-surface-700 dark:text-surface-200">{c.body}</p>
                        </li>
                      ))}
                      {!r.comments?.length && (
                        <li className="text-xs text-surface-400">No comments yet.</li>
                      )}
                    </ul>
                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                      <input
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add a comment…"
                        className={`${inputClass} flex-1`}
                      />
                      <button
                        onClick={() => handleAddComment(r.id)}
                        disabled={commentingId === r.id || !commentText.trim()}
                        className="inline-flex items-center justify-center rounded-lg bg-surface-900 dark:bg-surface-600 px-4 py-2 text-xs font-semibold text-white hover:bg-surface-700 disabled:opacity-50"
                      >
                        {commentingId === r.id ? 'Posting…' : 'Post'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
