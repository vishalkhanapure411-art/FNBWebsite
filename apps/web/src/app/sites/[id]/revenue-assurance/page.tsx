'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { BarChart } from '@/components/charts/BarChart';
import {
  getRevenueAssuranceSummary,
  getRevenueAssuranceAnomalies,
  type RevenueAssuranceSummary,
  type AnomalyData,
  type AnomalyCategory,
  type AnomalySeverity,
  type CategoryBreakdown,
} from '@/lib/api/revenueAssurance';

type DateRange = '7d' | '30d' | '90d' | 'custom';

const CATEGORY_LABELS: Record<AnomalyCategory, string> = {
  MISSING_PAYMENT: 'Missing Payment',
  VOID_REFUND_SPIKE: 'Void / Refund Spike',
  DISCOUNT_OUTLIER: 'Discount Outlier',
  PAYMENT_MISMATCH: 'Payment Mismatch',
  NO_SALE: 'No-Sale / Zero Value',
};

const CATEGORY_COLORS: Record<AnomalyCategory, string> = {
  MISSING_PAYMENT: 'bg-rose-500',
  VOID_REFUND_SPIKE: 'bg-orange-500',
  DISCOUNT_OUTLIER: 'bg-amber-500',
  PAYMENT_MISMATCH: 'bg-purple-500',
  NO_SALE: 'bg-slate-400',
};

const SEVERITY_STYLES: Record<AnomalySeverity, string> = {
  HIGH: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  LOW: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

const RISK_COLOR = (score: number) =>
  score >= 70 ? 'text-rose-600' : score >= 40 ? 'text-amber-600' : 'text-emerald-600';

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-5">
      <div className="flex items-center gap-2 mb-1">
        <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <p className="text-xs text-surface-500 dark:text-surface-400 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">{value}</p>
    </div>
  );
}

export default function RevenueAssurancePage() {
  const params = useParams();
  const siteId = params.id as string;
  const { addToast } = useToast();

  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [severity, setSeverity] = useState<AnomalySeverity | ''>('');
  const [category, setCategory] = useState<AnomalyCategory | ''>('');
  const [page, setPage] = useState(1);

  const [summary, setSummary] = useState<RevenueAssuranceSummary | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyData[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const getDateRange = useCallback((): { from?: string; to?: string } => {
    const now = new Date();
    const to = now.toISOString();
    switch (dateRange) {
      case '7d': {
        const from = new Date();
        from.setDate(from.getDate() - 7);
        return { from: from.toISOString(), to };
      }
      case '30d': {
        const from = new Date();
        from.setDate(from.getDate() - 30);
        return { from: from.toISOString(), to };
      }
      case '90d': {
        const from = new Date();
        from.setDate(from.getDate() - 90);
        return { from: from.toISOString(), to };
      }
      case 'custom':
        return {
          from: customStart ? new Date(customStart).toISOString() : undefined,
          to: customEnd ? new Date(customEnd).toISOString() : undefined,
        };
      default:
        return {};
    }
  }, [dateRange, customStart, customEnd]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const { from, to } = getDateRange();
    const base = { siteId, from, to };
    try {
      const [summaryRes, anomaliesRes] = await Promise.all([
        getRevenueAssuranceSummary({ ...base, category: category || undefined, severity: severity || undefined }),
        getRevenueAssuranceAnomalies({
          ...base,
          category: category || undefined,
          severity: severity || undefined,
          page,
          limit: 20,
        }),
      ]);
      setSummary(summaryRes.data);
      setAnomalies(anomaliesRes.data ?? []);
      setTotal(anomaliesRes.meta?.total ?? 0);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load revenue assurance data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [siteId, getDateRange, category, severity, page, addToast]);

  useEffect(() => {
    setPage(1);
  }, [dateRange, category, severity]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const formatDate = (iso: string) => new Date(iso).toLocaleString();

  const totalPages = Math.max(1, Math.ceil(total / 20));
  const riskScore = summary?.riskScore ?? 0;

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50">Revenue Assurance</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">
            Detected revenue-leak anomalies computed from order & payment data
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            {(['7d', '30d', '90d', 'custom'] as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  dateRange === range
                    ? 'bg-brand-600 text-white'
                    : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 border border-surface-300 dark:border-surface-600'
                }`}
              >
                {range === 'custom' ? 'Custom' : `Last ${range}`}
              </button>
            ))}
          </div>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as AnomalySeverity | '')}
            className="rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-1.5 text-sm"
          >
            <option value="">All Severities</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as AnomalyCategory | '')}
            className="rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-1.5 text-sm"
          >
            <option value="">All Categories</option>
            {(Object.keys(CATEGORY_LABELS) as AnomalyCategory[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {dateRange === 'custom' && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800">
          <label className="text-sm text-surface-600 dark:text-surface-400">From:</label>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-1.5 text-sm"
          />
          <label className="text-sm text-surface-600 dark:text-surface-400">To:</label>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-1.5 text-sm"
          />
          <button
            onClick={fetchData}
            className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Apply
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="text-surface-500">Loading revenue assurance...</div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Revenue" value={formatCurrency(summary?.totalRevenue ?? 0)} color="bg-brand-500" />
            <StatCard label="Anomalies" value={summary?.anomalyCount ?? 0} color="bg-rose-500" />
            <StatCard label="Anomaly Value" value={formatCurrency(summary?.anomalyValue ?? 0)} color="bg-orange-500" />
            <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-5">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-2.5 w-2.5 rounded-full bg-red-600" />
                <p className="text-xs text-surface-500 dark:text-surface-400 uppercase tracking-wide">Risk Score</p>
              </div>
              <p className={`text-2xl font-bold ${RISK_COLOR(riskScore)}`}>{riskScore}/100</p>
            </div>
          </div>

          {/* By-category chart */}
          <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-4">
              Anomalies by Category
            </h2>
            {summary && summary.byCategory.length > 0 ? (
              <BarChart
                data={summary.byCategory.map((c: CategoryBreakdown) => ({
                  label: CATEGORY_LABELS[c.category] ?? c.category,
                  value: c.count,
                  color: CATEGORY_COLORS[c.category] ?? 'bg-gray-400',
                }))}
                height={200}
                formatValue={(v) => `${v} anomaly${v === 1 ? '' : 'ies'}`}
              />
            ) : (
              <p className="text-surface-400 text-sm">No anomalies detected in this period</p>
            )}
          </div>

          {/* Anomaly table */}
          <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 overflow-hidden">
            <div className="px-6 pt-5 pb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">Flagged Anomalies</h2>
              <span className="text-sm text-surface-500 dark:text-surface-400">{total} total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700 text-left text-xs uppercase tracking-wide text-surface-500 dark:text-surface-400">
                    <th className="px-6 py-3">Severity</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Reference</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3">Detected</th>
                  </tr>
                </thead>
                <tbody>
                  {anomalies.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-surface-400">
                        No anomalies match the current filters
                      </td>
                    </tr>
                  )}
                  {anomalies.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-surface-100 dark:border-surface-800 last:border-0 hover:bg-surface-50 dark:hover:bg-surface-700/40"
                    >
                      <td className="px-6 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${SEVERITY_STYLES[a.severity]}`}
                        >
                          {a.severity}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${CATEGORY_COLORS[a.category] ?? 'bg-gray-400'}`} />
                          {CATEGORY_LABELS[a.category] ?? a.category}
                        </span>
                      </td>
                      <td className="px-6 py-3 font-medium text-surface-700 dark:text-surface-300">
                        <a
                          href={`/sites/${siteId}/orders?orderNumber=${a.orderNumber}`}
                          className="hover:text-brand-600"
                        >
                          #{a.orderNumber}
                        </a>
                      </td>
                      <td className="px-6 py-3 text-surface-600 dark:text-surface-400 max-w-md">{a.description}</td>
                      <td className="px-6 py-3 text-right font-semibold text-surface-900 dark:text-surface-50">
                        {formatCurrency(a.amount)}
                      </td>
                      <td className="px-6 py-3 text-surface-500 dark:text-surface-400 whitespace-nowrap">
                        {formatDate(a.detectedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {total > 20 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-surface-200 dark:border-surface-700">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm rounded-lg border border-surface-300 dark:border-surface-600 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-sm text-surface-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-sm rounded-lg border border-surface-300 dark:border-surface-600 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
