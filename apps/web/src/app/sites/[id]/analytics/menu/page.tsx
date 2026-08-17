'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api-client';
import { HorizontalBarChart } from '@/components/charts/BarChart';

interface MenuItemPerf {
  menuItemId: string;
  name: string;
  category: string;
  station: string;
  quantity: number;
  revenue: number;
  cost: number;
  margin: number;
  marginPercent: number;
}

interface MenuPerformance {
  topSellers: MenuItemPerf[];
  worstSellers: MenuItemPerf[];
  byCategory: Array<{ category: string; quantity: number; revenue: number; margin: number }>;
  byStation: Array<{ station: string; quantity: number; avgPrepTime: number }>;
}

const STATION_LABELS: Record<string, string> = {
  GRILL: 'Grill',
  FRY: 'Fry',
  COLD: 'Cold',
  DRINKS: 'Drinks',
  DESSERT: 'Dessert',
  EXPO: 'Expo',
};

const STATION_COLORS: Record<string, string> = {
  GRILL: 'bg-red-500',
  FRY: 'bg-amber-500',
  COLD: 'bg-cyan-500',
  DRINKS: 'bg-blue-500',
  DESSERT: 'bg-pink-500',
  EXPO: 'bg-purple-500',
};

export default function MenuAnalyticsPage() {
  const params = useParams();
  const siteId = params.id as string;
  const { addToast } = useToast();

  const [data, setData] = useState<MenuPerformance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'revenue' | 'quantity' | 'margin'>('revenue');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set('siteId', siteId);
      qs.set('limit', '20');
      qs.set('sortBy', sortBy);

      const res = await api.get<{ success: boolean; data: MenuPerformance }>(
        `/analytics/menu/performance?${qs.toString()}`,
      );
      setData(res.data);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load menu analytics', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [siteId, sortBy, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-surface-500">Loading menu analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50">Menu Analytics</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">
            Item performance, margins, and category insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-surface-500 dark:text-surface-400">Sort by:</span>
          {(['revenue', 'quantity', 'margin'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                sortBy === s
                  ? 'bg-brand-600 text-white'
                  : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 border border-surface-300 dark:border-surface-600'
              }`}
            >
              {s === 'revenue' ? 'Revenue' : s === 'quantity' ? 'Quantity' : 'Margin'}
            </button>
          ))}
        </div>
      </div>

      {/* Top Sellers Table */}
      <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">Top Selling Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase w-10">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Item</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Category</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase">Qty Sold</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase">Revenue</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase">Margin</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-700/50">
              {!data?.topSellers?.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-surface-500">
                    No sales data yet
                  </td>
                </tr>
              ) : (
                data.topSellers.map((item, idx) => (
                  <tr key={item.menuItemId} className="hover:bg-surface-50 dark:hover:bg-surface-750">
                    <td className="px-4 py-3 text-sm font-medium text-surface-500">{idx + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-surface-900 dark:text-surface-50">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-surface-600 dark:text-surface-400">{item.category}</td>
                    <td className="px-4 py-3 text-sm text-right text-surface-900 dark:text-surface-50">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-right text-surface-900 dark:text-surface-50 font-medium">
                      {formatCurrency(item.revenue)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(item.margin)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={`font-medium ${item.marginPercent >= 50 ? 'text-emerald-600' : item.marginPercent >= 25 ? 'text-amber-600' : 'text-red-600'}`}>
                        {item.marginPercent}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Worst Sellers Table */}
      <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">Worst Sellers (Bottom 10)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Item</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Category</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase">Qty Sold</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase">Revenue</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-700/50">
              {!data?.worstSellers?.length ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-surface-500">
                    No data available
                  </td>
                </tr>
              ) : (
                data.worstSellers.map((item) => (
                  <tr key={item.menuItemId} className="hover:bg-surface-50 dark:hover:bg-surface-750">
                    <td className="px-4 py-3 text-sm font-medium text-surface-900 dark:text-surface-50">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-surface-600 dark:text-surface-400">{item.category}</td>
                    <td className="px-4 py-3 text-sm text-right text-surface-900 dark:text-surface-50">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-right text-surface-900 dark:text-surface-50">
                      {formatCurrency(item.revenue)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={`font-medium ${item.marginPercent >= 50 ? 'text-emerald-600' : item.marginPercent >= 25 ? 'text-amber-600' : 'text-red-600'}`}>
                        {item.marginPercent}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-4">By Category</h2>
          {data?.byCategory && data.byCategory.length > 0 ? (
            <div className="space-y-1">
              {data.byCategory.map((cat) => (
                <div key={cat.category}>
                  <button
                    onClick={() =>
                      setExpandedCategory(expandedCategory === cat.category ? null : cat.category)
                    }
                    className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-750 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-surface-900 dark:text-surface-50">{cat.category}</span>
                      <span className="text-xs text-surface-500">{cat.quantity} sold</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-surface-600 dark:text-surface-400">{formatCurrency(cat.revenue)}</span>
                      <span className="text-sm text-emerald-600 dark:text-emerald-400">{formatCurrency(cat.margin)}</span>
                      <span className="text-surface-400 text-xs">{expandedCategory === cat.category ? '▲' : '▼'}</span>
                    </div>
                  </button>
                  {expandedCategory === cat.category && (
                    <div className="ml-8 mt-1 mb-2 p-3 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
                      <p className="text-xs text-surface-500 dark:text-surface-400">
                        Revenue: {formatCurrency(cat.revenue)} · Margin: {formatCurrency(cat.margin)} ·
                        Items sold: {cat.quantity}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <p className="text-surface-500">No category data yet</p>
            </div>
          )}
        </div>

        {/* By Station */}
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-4">By Station</h2>
          {data?.byStation && data.byStation.length > 0 ? (
            <HorizontalBarChart
              data={data.byStation.map((s) => ({
                label: STATION_LABELS[s.station] ?? s.station,
                value: s.quantity,
                color: STATION_COLORS[s.station] ?? 'bg-gray-400',
              }))}
              formatValue={(v) => `${v} items`}
            />
          ) : (
            <div className="flex items-center justify-center py-8">
              <p className="text-surface-500">No station data yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
