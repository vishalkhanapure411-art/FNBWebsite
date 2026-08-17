'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { LineChart } from '@/components/charts/LineChart';
import { getDemandForecast, DemandForecast, ForecastHorizon } from '@/lib/api/forecasting';

const HORIZONS: ForecastHorizon[] = [7, 14, 30];

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-5">
      <p className="text-xs text-surface-500 dark:text-surface-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">{value}</p>
      {sub ? <p className="text-xs text-surface-500 mt-1">{sub}</p> : null}
    </div>
  );
}

export default function ForecastingPage() {
  const params = useParams();
  const siteId = params.id as string;
  const { addToast } = useToast();
  const [horizon, setHorizon] = useState<ForecastHorizon>(14);
  const [data, setData] = useState<DemandForecast | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getDemandForecast({ siteId, horizon });
      setData(res.data);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load demand forecast', 'error');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [siteId, horizon, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hasData = !!data && data.historical.length > 0;
  const historyPoints = (data?.historical ?? []).map((h) => ({ label: h.date, value: h.revenue }));
  const forecastPoints = (data?.forecast ?? []).map((f) => ({ label: f.date, value: f.revenue }));
  const lowHistory = !!data && (data.meta.historyDays < 14 || data.historical.length === 0);
  const warningNote =
    data?.meta.notes.find(
      (n) =>
        n.toLowerCase().includes('limited history') ||
        n.toLowerCase().includes('insufficient data') ||
        n.toLowerCase().includes('indicative'),
    ) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Demand Forecasting</h1>
          <p className="text-sm text-surface-500 mt-1">
            AI-assisted daily revenue &amp; order forecast from historical orders — statistical model, fully explainable.
          </p>
        </div>
        {/* Horizon selector */}
        <div className="flex items-center gap-1 rounded-lg border border-surface-200 dark:border-surface-700 p-1">
          {HORIZONS.map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors ${
                horizon === h
                  ? 'bg-brand-600 text-white'
                  : 'text-surface-500 hover:text-surface-800 dark:hover:text-surface-200'
              }`}
            >
              {h} days
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <p className="text-surface-500">Loading forecast…</p>
        </div>
      ) : !data ? (
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-8 text-center">
          <p className="text-surface-500">No forecast available for this site.</p>
        </div>
      ) : (
        <>
          {/* Honest method + caveats */}
          <div
            className={`rounded-xl border p-4 text-sm ${
              lowHistory
                ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200'
                : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-300'
            }`}
          >
            <p className="font-semibold text-surface-900 dark:text-surface-50 mb-1">
              Method: day-of-week seasonality + dampened linear trend (statistical)
            </p>
            <ul className="list-disc list-inside space-y-0.5 mt-1">
              {(data.meta.notes.length ? data.meta.notes : ['Method: day-of-week seasonality + dampened linear trend (deterministic statistical model).']).map(
                (note, i) => (
                  <li key={i}>{note}</li>
                ),
              )}
            </ul>
            {lowHistory && !warningNote && (
              <p className="mt-1 font-medium">⚠ Limited history — treat this forecast as indicative.</p>
            )}
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="History"
              value={`${data.meta.historyDays} days`}
              sub={`${data.historical.filter((h) => h.revenue > 0 || h.orders > 0).length} days with orders`}
            />
            <StatCard
              label="Forecast horizon"
              value={`${data.horizon} days`}
              sub="starting tomorrow (UTC)"
            />
            <StatCard
              label="Daily trend (dampened)"
              value={`${data.meta.trend > 0 ? '+' : ''}${formatCurrency(data.meta.trend)}/day`}
              sub="linear regression slope × 0.5"
            />
            <StatCard
              label="Model fit (in-sample MAPE)"
              value={data.meta.mape != null ? `${data.meta.mape}%` : '—'}
              sub="mean absolute % error on historical days"
            />
          </div>

          {/* Chart */}
          <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="font-semibold text-surface-900 dark:text-surface-50">Revenue — history &amp; forecast</h2>
              <div className="flex items-center gap-4 text-xs text-surface-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-brand-500" /> Historical (daily)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500" /> Forecast (dashed)
                </span>
              </div>
            </div>
            {hasData ? (
              <LineChart
                data={historyPoints}
                height={260}
                formatValue={(v) => formatCurrency(v)}
                overlay={[
                  {
                    points: forecastPoints,
                    startIndex: historyPoints.length,
                    color: '#3b82f6',
                    dashed: true,
                  },
                ]}
              />
            ) : (
              <div className="flex items-center justify-center" style={{ height: 260 }}>
                <p className="text-surface-400 text-sm">
                  No historical revenue yet — forecast is zero until orders come in.
                </p>
              </div>
            )}
          </div>

          {/* Forecast table */}
          <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-200 dark:border-surface-700">
              <h2 className="font-semibold text-surface-900 dark:text-surface-50">
                Forecast — next {data.forecast.length} days
              </h2>
              <p className="text-xs text-surface-500 mt-0.5">
                Revenue shown with confidence bounds (lower–upper). Orders are the same model applied to order counts.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-surface-500 border-b border-surface-200 dark:border-surface-700">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3 text-right">Revenue</th>
                    <th className="px-5 py-3 text-right">Range</th>
                    <th className="px-5 py-3 text-right">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {data.forecast.map((f) => (
                    <tr
                      key={f.date}
                      className="border-b border-surface-100 dark:border-surface-800 last:border-0"
                    >
                      <td className="px-5 py-3 font-medium text-surface-700 dark:text-surface-300 whitespace-nowrap">
                        {f.date}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-surface-900 dark:text-surface-50">
                        {formatCurrency(f.revenue)}
                      </td>
                      <td className="px-5 py-3 text-right text-surface-500">
                        {formatCurrency(f.lower)} – {formatCurrency(f.upper)}
                      </td>
                      <td className="px-5 py-3 text-right text-surface-600 dark:text-surface-400">
                        {f.orders}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
