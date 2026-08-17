'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api-client';
import { BarChart, HorizontalBarChart } from '@/components/charts/BarChart';

interface SalesSummary {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  totalDiscounts: number;
  netRevenue: number;
  ordersByPeriod: Array<{ period: string; orders: number; revenue: number }>;
  ordersByChannel: Array<{ channel: string; orders: number; revenue: number }>;
  ordersByType: Array<{ type: string; orders: number; revenue: number }>;
}

interface RealtimeData {
  todayOrders: number;
  todayRevenue: number;
  activeOrders: number;
  averageOrderValue: number;
  hourlyBreakdown: Array<{ hour: number; orders: number; revenue: number }>;
  lastUpdated: string;
}

interface CostsData {
  foodCostPercent: number;
  foodCostTotal: number;
  revenueTotal: number;
  laborCostPercent: number;
  laborCostTotal: number;
}

type DateRange = 'today' | 'week' | 'month' | 'custom';

const CHANNEL_COLORS: Record<string, string> = {
  POS: 'bg-brand-500',
  QR: 'bg-emerald-500',
  KIOSK: 'bg-blue-500',
  MOBILE_APP: 'bg-purple-500',
  CALL_CENTER: 'bg-amber-500',
  AGGREGATOR: 'bg-rose-500',
};

const TYPE_COLORS: Record<string, string> = {
  DINE_IN: 'bg-blue-500',
  TAKEAWAY: 'bg-amber-500',
  DELIVERY: 'bg-emerald-500',
  CURBSIDE: 'bg-purple-500',
  DRIVE_THRU: 'bg-rose-500',
  AGGREGATOR: 'bg-cyan-500',
  CATERING: 'bg-indigo-500',
  PRE_ORDER: 'bg-pink-500',
};

export default function AnalyticsPage() {
  const params = useParams();
  const siteId = params.id as string;
  const { user } = useAuth();
  const { addToast } = useToast();

  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [realtime, setRealtime] = useState<RealtimeData | null>(null);
  const [costs, setCosts] = useState<CostsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getDateRange = useCallback((): { startDate?: string; endDate?: string } => {
    const now = new Date();
    const end = now.toISOString().split('T')[0];

    switch (dateRange) {
      case 'today': {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        return { startDate: start.toISOString(), endDate: end };
      }
      case 'week': {
        const start = new Date();
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        return { startDate: start.toISOString(), endDate: end };
      }
      case 'month': {
        const start = new Date();
        start.setMonth(start.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        return { startDate: start.toISOString(), endDate: end };
      }
      case 'custom':
        return {
          startDate: customStart ? new Date(customStart).toISOString() : undefined,
          endDate: customEnd ? new Date(customEnd).toISOString() : undefined,
        };
      default:
        return {};
    }
  }, [dateRange, customStart, customEnd]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const { startDate, endDate } = getDateRange();

    try {
      const qs = new URLSearchParams();
      qs.set('siteId', siteId);
      if (startDate) qs.set('startDate', startDate);
      if (endDate) qs.set('endDate', endDate);
      qs.set('groupBy', 'day');

      const [summaryRes, realtimeRes, costsRes] = await Promise.all([
        api.get<{ success: boolean; data: SalesSummary }>(`/analytics/sales/summary?${qs.toString()}`),
        api.get<{ success: boolean; data: RealtimeData }>(`/analytics/sales/realtime?siteId=${siteId}`),
        api.get<{ success: boolean; data: CostsData }>(`/analytics/costs?${qs.toString()}`),
      ]);

      setSummary(summaryRes.data);
      setRealtime(realtimeRes.data);
      setCosts(costsRes.data);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load analytics', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [siteId, getDateRange, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 || 12;
    return `${h}${ampm}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="text-surface-500">Loading analytics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Date Range */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50">Sales Analytics</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">
            {realtime && `Updated ${new Date(realtime.lastUpdated).toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(['today', 'week', 'month', 'custom'] as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                dateRange === range
                  ? 'bg-brand-600 text-white'
                  : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 border border-surface-300 dark:border-surface-600'
              }`}
            >
              {range === 'today' ? 'Today' : range === 'week' ? 'This Week' : range === 'month' ? 'This Month' : 'Custom'}
            </button>
          ))}
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

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Orders" value={summary?.totalOrders ?? 0} color="bg-blue-500" />
        <StatCard label="Total Revenue" value={summary ? formatCurrency(summary.totalRevenue) : '$0'} color="bg-brand-500" />
        <StatCard label="Avg Order Value" value={summary ? formatCurrency(summary.averageOrderValue) : '$0'} color="bg-purple-500" />
        <StatCard label="Food Cost %" value={costs ? `${costs.foodCostPercent}%` : '0%'} color="bg-emerald-500" />
      </div>

      {/* Today's Real-time Stats */}
      {realtime && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Today's Orders" value={realtime.todayOrders} color="bg-cyan-500" />
          <StatCard label="Today's Revenue" value={formatCurrency(realtime.todayRevenue)} color="bg-teal-500" />
          <StatCard label="Active Orders" value={realtime.activeOrders} color="bg-orange-500" />
          <StatCard label="Today's AOV" value={formatCurrency(realtime.averageOrderValue)} color="bg-pink-500" />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-4">Revenue Trend</h2>
          {summary?.ordersByPeriod && summary.ordersByPeriod.length > 0 ? (
            <BarChart
              data={summary.ordersByPeriod.map((p) => ({
                label: p.period.slice(5),
                value: p.revenue,
                color: 'bg-brand-500',
              }))}
              height={200}
              formatValue={formatCurrency}
            />
          ) : (
            <EmptyState message="No sales data yet" />
          )}
        </div>

        {/* Channel Breakdown */}
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-4">Channel Breakdown</h2>
          {summary?.ordersByChannel && summary.ordersByChannel.length > 0 ? (
            <HorizontalBarChart
              data={summary.ordersByChannel.map((c) => ({
                label: c.channel.replace(/_/g, ' '),
                value: c.orders,
                color: CHANNEL_COLORS[c.channel] ?? 'bg-gray-400',
              }))}
              formatValue={(v) => `${v} orders`}
            />
          ) : (
            <EmptyState message="No channel data yet" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Type Breakdown */}
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-4">Order Type Breakdown</h2>
          {summary?.ordersByType && summary.ordersByType.length > 0 ? (
            <HorizontalBarChart
              data={summary.ordersByType.map((t) => ({
                label: t.type.replace(/_/g, ' '),
                value: t.orders,
                color: TYPE_COLORS[t.type] ?? 'bg-gray-400',
              }))}
              formatValue={(v) => `${v} orders`}
            />
          ) : (
            <EmptyState message="No order type data yet" />
          )}
        </div>

        {/* Hourly Heatmap */}
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-4">Hourly Breakdown</h2>
          {realtime?.hourlyBreakdown && realtime.hourlyBreakdown.length > 0 ? (
            <BarChart
              data={realtime.hourlyBreakdown.map((h) => ({
                label: formatHour(h.hour),
                value: h.orders,
                color: 'bg-brand-500',
              }))}
              height={180}
              formatValue={(v) => `${v} orders`}
            />
          ) : (
            <EmptyState message="No hourly data yet" />
          )}
        </div>
      </div>
    </div>
  );
}

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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <span className="text-4xl">📊</span>
        <p className="text-surface-500 dark:text-surface-400 mt-2">{message}</p>
      </div>
    </div>
  );
}
