'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/components/ui/Toast';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api-client';
import { openShift, type ShiftData } from '@/lib/api/shifts';
import { TableStatus } from '@omniops/shared';

interface DashboardData {
  siteName: string;
  siteStatus: string;
  today: {
    openOrders: number;
    completedOrders: number;
    totalRevenue: number;
    avgOrderValue: number;
  };
  activeShift: {
    id: string;
    openedBy: { id: string; firstName: string; lastName: string };
    startedAt: string;
    openingCash?: number;
    staffCount: number;
  } | null;
  tableSummary: Record<string, number>;
  recentOrders: Array<{
    id: string;
    orderNumber: number;
    orderType: string;
    status: string;
    grandTotal: number;
    createdAt: string;
    table?: { number: string } | null;
  }>;
}

const TABLE_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-emerald-500',
  OCCUPIED: 'bg-red-500',
  RESERVED: 'bg-yellow-500',
  DIRTY: 'bg-gray-400',
  OUT_OF_SERVICE: 'bg-gray-600',
};

const TABLE_LABELS: Record<string, string> = {
  AVAILABLE: 'Available',
  OCCUPIED: 'Occupied',
  RESERVED: 'Reserved',
  DIRTY: 'Dirty',
  OUT_OF_SERVICE: 'Out of Service',
};

export default function SiteDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.id as string;
  const { user } = useAuth();
  const { addToast } = useToast();

  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showOpenShift, setShowOpenShift] = useState(false);
  const [openingCash, setOpeningCash] = useState('');
  const [isOpeningShift, setIsOpeningShift] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: DashboardData }>(`/sites/${siteId}/dashboard`);
      setData(res.data);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load dashboard', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [siteId, addToast]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleOpenShift = async () => {
    setIsOpeningShift(true);
    try {
      await openShift(siteId, parseFloat(openingCash) || 0);
      addToast('Shift opened successfully', 'success');
      setShowOpenShift(false);
      setOpeningCash('');
      fetchDashboard();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to open shift', 'error');
    } finally {
      setIsOpeningShift(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-surface-500">Loading dashboard...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-surface-500">No data available</div>
      </div>
    );
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50">{data.siteName}</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">
            Live Site Dashboard · <StatusBadge status={data.siteStatus} variant="status" />
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/sites/${siteId}/shifts`)}
            className="rounded-lg border border-surface-300 dark:border-surface-600 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            View Shifts
          </button>
          <button
            onClick={() => router.push(`/sites/${siteId}/tables`)}
            className="rounded-lg border border-surface-300 dark:border-surface-600 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            View Tables
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Open Orders"
          value={data.today.openOrders}
          color="bg-blue-500"
        />
        <StatCard
          label="Completed"
          value={data.today.completedOrders}
          color="bg-emerald-500"
        />
        <StatCard
          label="Today's Revenue"
          value={formatCurrency(data.today.totalRevenue)}
          color="bg-brand-500"
        />
        <StatCard
          label="Avg Order Value"
          value={formatCurrency(data.today.avgOrderValue)}
          color="bg-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Active Shift Card */}
        <div className="lg:col-span-1 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-4">
            Active Shift
          </h2>
          {data.activeShift ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Open</span>
              </div>
              <p className="text-sm text-surface-600 dark:text-surface-400">
                Opened by{' '}
                <span className="font-medium text-surface-900 dark:text-surface-50">
                  {data.activeShift.openedBy.firstName} {data.activeShift.openedBy.lastName}
                </span>
              </p>
              <p className="text-sm text-surface-500 dark:text-surface-400">
                Started at {new Date(data.activeShift.startedAt).toLocaleTimeString()}
              </p>
              <p className="text-sm text-surface-500 dark:text-surface-400">
                Cash in drawer: {formatCurrency(data.activeShift.openingCash ?? 0)}
              </p>
              <p className="text-sm text-surface-500 dark:text-surface-400">
                Staff on duty: {data.activeShift.staffCount}
              </p>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-surface-500 dark:text-surface-400 mb-3">No active shift</p>
              <button
                onClick={() => setShowOpenShift(true)}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
              >
                Open Shift
              </button>
            </div>
          )}
        </div>

        {/* Table Status Overview */}
        <div className="lg:col-span-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-4">
            Table Status
          </h2>
          <div className="grid grid-cols-5 gap-3">
            {Object.entries(TABLE_LABELS).map(([status, label]) => (
              <div
                key={status}
                className="text-center p-3 rounded-lg bg-surface-50 dark:bg-surface-700/50"
              >
                <div className={`h-3 w-3 rounded-full ${TABLE_COLORS[status] ?? 'bg-gray-400'} mx-auto mb-1`} />
                <div className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                  {data.tableSummary[status] ?? 0}
                </div>
                <div className="text-xs text-surface-500 dark:text-surface-400">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">Recent Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Order #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Table</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase">Total</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-700/50">
              {data.recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-surface-500">
                    No recent orders
                  </td>
                </tr>
              ) : (
                data.recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-surface-50 dark:hover:bg-surface-750">
                    <td className="px-4 py-3 text-sm font-medium text-surface-900 dark:text-surface-50">
                      #{order.orderNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-600 dark:text-surface-400">
                      {order.orderType.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-600 dark:text-surface-400">
                      {order.table?.number ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} variant="status" />
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-surface-900 dark:text-surface-50 font-medium">
                      {formatCurrency(Number(order.grandTotal))}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-surface-500">
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Open Shift Modal */}
      <Modal isOpen={showOpenShift} onClose={() => setShowOpenShift(false)} title="Open Shift">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleOpenShift();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Opening Cash
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="0.00"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-200 dark:border-surface-700">
            <button
              type="button"
              onClick={() => setShowOpenShift(false)}
              className="rounded-lg border border-surface-300 dark:border-surface-600 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isOpeningShift}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {isOpeningShift ? 'Opening...' : 'Open Shift'}
            </button>
          </div>
        </form>
      </Modal>
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
