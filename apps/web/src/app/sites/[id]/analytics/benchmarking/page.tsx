'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api-client';
import { Role } from '@omniops/shared';

interface SiteBenchmark {
  siteId: string;
  name: string;
  orders: number;
  revenue: number;
  aov: number;
  foodCost: number;
}

export default function BenchmarkingPage() {
  const params = useParams();
  const siteId = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [sites, setSites] = useState<SiteBenchmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string>('');

  // Access control: only SUPER_ADMIN, BRAND_MANAGER and tenant-wide management roles
  const canAccess =
    user?.role === Role.SUPER_ADMIN ||
    user?.role === Role.BRAND_MANAGER ||
    user?.role === Role.FRANCHISE_OWNER ||
    user?.role === Role.OPERATIONS_MANAGER ||
    user?.role === Role.FINANCE_MANAGER;

  const fetchData = useCallback(async () => {
    if (!canAccess || !tenantId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set('tenantId', tenantId);

      const res = await api.get<{ success: boolean; data: { sites: SiteBenchmark[] } }>(
        `/analytics/benchmarking?${qs.toString()}`,
      );
      setSites(res.data.sites);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load benchmarking data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, canAccess, addToast]);

  // Set tenantId from user context
  useEffect(() => {
    if (user?.tenantId) {
      setTenantId(user.tenantId);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  if (!canAccess) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center">
          <span className="text-4xl">🔒</span>
          <p className="text-surface-500 dark:text-surface-400 mt-2">
            You need BRAND_MANAGER or SUPER_ADMIN access to view benchmarking.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-surface-500">Loading benchmarking data...</div>
      </div>
    );
  }

  if (!sites.length) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50">Cross-Site Benchmarking</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">
            Compare performance across all sites
          </p>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <span className="text-4xl">📊</span>
            <p className="text-surface-500 dark:text-surface-400 mt-2">No site data available for comparison</p>
          </div>
        </div>
      </div>
    );
  }

  // Find best and worst
  const maxRevenue = Math.max(...sites.map((s) => s.revenue), 1);
  const maxOrders = Math.max(...sites.map((s) => s.orders), 1);
  const bestAov = Math.max(...sites.map((s) => s.aov), 1);
  const bestFoodCost = Math.min(...sites.map((s) => s.foodCost));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50">Cross-Site Benchmarking</h1>
        <p className="text-surface-500 dark:text-surface-400 mt-1">
          Compare performance across {sites.length} site{sites.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Comparison Table */}
      <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Site</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase">Orders</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase">Revenue</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase">AOV</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase">Food Cost %</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-700/50">
              {sites.map((site) => {
                const isBestRevenue = site.revenue === maxRevenue;
                const isBestAov = site.aov === bestAov;
                const isBestFoodCost = site.foodCost === bestFoodCost;
                const score = (isBestRevenue ? 1 : 0) + (isBestAov ? 1 : 0) + (isBestFoodCost ? 1 : 0);

                return (
                  <tr
                    key={site.siteId}
                    className={`hover:bg-surface-50 dark:hover:bg-surface-750 cursor-pointer ${
                      site.siteId === siteId ? 'bg-brand-50 dark:bg-brand-900/20' : ''
                    }`}
                    onClick={() => router.push(`/sites/${site.siteId}/analytics`)}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-surface-900 dark:text-surface-50">
                      {site.name}
                      {site.siteId === siteId && (
                        <span className="ml-2 text-xs text-brand-600 dark:text-brand-400">(current)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-surface-900 dark:text-surface-50">
                      <div className="flex items-center justify-end gap-2">
                        <span>{site.orders}</span>
                        <div className="w-16 h-1.5 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${(site.orders / maxOrders) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-surface-900 dark:text-surface-50 font-medium">
                      <span className={isBestRevenue ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                        {formatCurrency(site.revenue)}
                        {isBestRevenue && ' 🏆'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-surface-900 dark:text-surface-50">
                      <span className={isBestAov ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                        {formatCurrency(site.aov)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span
                        className={
                          isBestFoodCost
                            ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                            : site.foodCost > 35
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-surface-900 dark:text-surface-50'
                        }
                      >
                        {site.foodCost}%
                        {isBestFoodCost && ' 🏆'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        {score >= 2 ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium">
                            Top Performer
                          </span>
                        ) : score === 1 ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">
                            Good
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-700 text-surface-500 font-medium">
                            —
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-5">
          <p className="text-xs text-surface-500 dark:text-surface-400 uppercase tracking-wide mb-1">Total Network Revenue</p>
          <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
            {formatCurrency(sites.reduce((sum, s) => sum + s.revenue, 0))}
          </p>
        </div>
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-5">
          <p className="text-xs text-surface-500 dark:text-surface-400 uppercase tracking-wide mb-1">Total Network Orders</p>
          <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
            {sites.reduce((sum, s) => sum + s.orders, 0)}
          </p>
        </div>
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-5">
          <p className="text-xs text-surface-500 dark:text-surface-400 uppercase tracking-wide mb-1">Network Avg AOV</p>
          <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
            {formatCurrency(
              sites.reduce((sum, s) => sum + s.aov, 0) / (sites.length || 1),
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
