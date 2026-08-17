'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import { BarChart } from '@/components/charts/BarChart';
import { LineChart } from '@/components/charts/LineChart';
import {
  getExecOverview,
  getSiteComparison,
  type ExecOverview,
  type SiteComparison,
  type SiteComparisonRow,
} from '@/lib/api/execAnalytics';

type DateRange = '7d' | '30d' | '90d' | 'custom';

const money = (v: number) =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom' },
];

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-5">
      <div className="flex items-center gap-2 mb-1">
        <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <p className="text-xs text-surface-500 dark:text-surface-400 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">{value}</p>
      {sub && <p className="text-xs text-surface-400 mt-1">{sub}</p>}
    </div>
  );
}

function RankBadge({ row }: { row: SiteComparisonRow }) {
  const badges: { text: string; className: string; title: string }[] = [];
  if (row.revenueRank === 1 && row.revenue > 0) {
    badges.push({ text: 'Top revenue', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', title: 'Highest revenue' });
  }
  if (row.anomalyRank === 1 && row.anomalyValue > 0) {
    badges.push({ text: 'Most anomalies', className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400', title: 'Highest anomaly value' });
  }
  if (badges.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {badges.map((b) => (
        <span key={b.text} title={b.title} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${b.className}`}>
          {b.text}
        </span>
      ))}
    </div>
  );
}

export default function ExecAnalyticsPage() {
  const { addToast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [overview, setOverview] = useState<ExecOverview | null>(null);
  const [comparison, setComparison] = useState<SiteComparison | null>(null);
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
    try {
      const [overviewRes, comparisonRes] = await Promise.all([
        getExecOverview({ from, to }),
        getSiteComparison({ from, to }),
      ]);
      setOverview(overviewRes.data);
      setComparison(comparisonRes.data);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load executive analytics', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [getDateRange, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const trendData = (overview?.trend ?? []).map((t) => ({
    label: t.date.length > 10 ? t.date.slice(2) : t.date.slice(5),
    value: t.revenue,
  }));
  const siteRevenueData = (comparison?.sites ?? []).map((s) => ({
    label: s.siteName.length > 12 ? s.siteName.slice(0, 11) + '…' : s.siteName,
    value: s.revenue,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Executive Analytics</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400">
            Cross-site, tenant-wide view: revenue, anomalies, and customer sentiment.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDateRange(opt.value)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  dateRange === opt.value
                    ? 'bg-brand-600 text-white'
                    : 'bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2 text-xs text-surface-700 dark:text-surface-200"
              />
              <span className="text-xs text-surface-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2 text-xs text-surface-700 dark:text-surface-200"
              />
            </div>
          )}
        </div>
      </div>

      {isLoading && !overview ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-surface-500">Loading executive analytics…</p>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard label="Total Revenue" value={money(overview?.totalRevenue ?? 0)} color="bg-brand-500" />
            <StatCard label="Orders" value={overview?.totalOrders ?? 0} color="bg-blue-500" />
            <StatCard label="Avg Check" value={money(overview?.avgCheck ?? 0)} color="bg-purple-500" />
            <StatCard label="Active Sites" value={overview?.activeSites ?? 0} color="bg-cyan-500" />
            <StatCard
              label="Anomalies Flagged"
              value={overview?.anomalyCount ?? 0}
              sub={overview?.anomalyValue ? `≈ ${money(overview.anomalyValue)} at risk` : 'No anomalies'}
              color="bg-rose-500"
            />
            <StatCard
              label="Avg NPS"
              value={overview?.avgNps != null ? overview.avgNps : '—'}
              sub={overview?.avgNps != null ? 'Across sites with responses' : 'No survey responses yet'}
              color="bg-emerald-500"
            />
          </div>

          {/* Revenue trend */}
          <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-5">
            <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-200 mb-1">
              Daily Revenue Trend
            </h2>
            <p className="text-xs text-surface-400 mb-4">
              {overview?.granularity === 'week' ? 'Weekly buckets (range exceeds 92 days)' : 'Daily buckets'} · {overview?.from?.slice(0, 10)} → {overview?.to?.slice(0, 10)}
            </p>
            <LineChart data={trendData} formatValue={(v) => money(v)} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by site */}
            <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-5">
              <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-200 mb-4">
                Revenue by Site
              </h2>
              <BarChart data={siteRevenueData} height={200} formatValue={(v) => money(v)} />
            </div>

            {/* Site comparison table */}
            <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-5">
              <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-200 mb-4">
                Site Comparison
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-surface-400 border-b border-surface-200 dark:border-surface-700">
                      <th className="py-2 pr-3">Site</th>
                      <th className="py-2 pr-3">Revenue</th>
                      <th className="py-2 pr-3">Orders</th>
                      <th className="py-2 pr-3">Avg Check</th>
                      <th className="py-2 pr-3">Anomalies</th>
                      <th className="py-2 pr-3">NPS</th>
                      <th className="py-2 pr-3">Rev Rank</th>
                      <th className="py-2">Flags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(comparison?.sites ?? []).map((row) => (
                      <tr key={row.siteId} className="border-b border-surface-100 dark:border-surface-800 last:border-0">
                        <td className="py-2.5 pr-3 font-medium text-surface-800 dark:text-surface-100">
                          {row.siteName}
                        </td>
                        <td className="py-2.5 pr-3 text-surface-700 dark:text-surface-300">{money(row.revenue)}</td>
                        <td className="py-2.5 pr-3 text-surface-700 dark:text-surface-300">{row.orders}</td>
                        <td className="py-2.5 pr-3 text-surface-700 dark:text-surface-300">{money(row.avgCheck)}</td>
                        <td className="py-2.5 pr-3">
                          <span className={`text-xs font-medium ${row.anomalyCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {row.anomalyCount > 0 ? `${row.anomalyCount} (${money(row.anomalyValue)})` : 'None'}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-surface-700 dark:text-surface-300">
                          {row.npsScore != null ? row.npsScore : '—'}
                        </td>
                        <td className="py-2.5 pr-3 text-surface-700 dark:text-surface-300">{row.revenueRank}</td>
                        <td className="py-2.5"><RankBadge row={row} /></td>
                      </tr>
                    ))}
                    {(comparison?.sites ?? []).length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-surface-400 text-sm">
                          No sites found for this tenant.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
