'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import {
  getShifts,
  openShift,
  closeShift,
  getShift,
  type ShiftData,
} from '@/lib/api/shifts';
import { ShiftStatus } from '@omniops/shared';

export default function ShiftsPage() {
  const params = useParams();
  const siteId = params.id as string;
  const { addToast } = useToast();

  const [shifts, setShifts] = useState<ShiftData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState<ShiftData | null>(null);
  const [openingCash, setOpeningCash] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchShifts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getShifts({ siteId, status: statusFilter || undefined });
      setShifts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load shifts', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [siteId, statusFilter, addToast]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const handleOpenShift = async () => {
    setIsSubmitting(true);
    try {
      await openShift(siteId, parseFloat(openingCash) || 0);
      addToast('Shift opened successfully', 'success');
      setShowOpenModal(false);
      setOpeningCash('');
      fetchShifts();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to open shift', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseShift = async (shiftId: string) => {
    setIsSubmitting(true);
    try {
      await closeShift(shiftId, parseFloat(closingCash) || undefined);
      addToast('Shift closed successfully', 'success');
      setShowDetailModal(false);
      setClosingCash('');
      setSelectedShift(null);
      fetchShifts();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to close shift', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDetail = async (shift: ShiftData) => {
    try {
      const res = await getShift(shift.id);
      setSelectedShift(res.data as ShiftData);
      setShowDetailModal(true);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load shift detail', 'error');
    }
  };

  const formatCurrency = (val?: number) =>
    val !== undefined && val !== null
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
      : '—';

  const columns: Column<ShiftData>[] = [
    {
      key: 'name',
      header: 'Shift',
      render: (item) => (
        <span className="font-medium text-surface-900 dark:text-surface-50">{item.name}</span>
      ),
    },
    {
      key: 'startTime',
      header: 'Opened',
      render: (item) => new Date(item.startTime).toLocaleString(),
    },
    {
      key: 'openedBy',
      header: 'Opened By',
      render: (item) =>
        item.openedBy ? `${item.openedBy.firstName} ${item.openedBy.lastName}` : '—',
    },
    {
      key: 'closedBy',
      header: 'Closed By',
      render: (item) =>
        item.closedBy ? `${item.closedBy.firstName} ${item.closedBy.lastName}` : '—',
    },
    {
      key: 'openingCash',
      header: 'Opening Cash',
      render: (item) => formatCurrency(item.openingCash),
    },
    {
      key: 'closingCash',
      header: 'Closing Cash',
      render: (item) => formatCurrency(item.closingCash),
    },
    {
      key: 'cashVariance',
      header: 'Variance',
      render: (item) => {
        const variance = item.cashVariance;
        if (variance === undefined || variance === null) return '—';
        const className =
          variance < 0
            ? 'text-red-600'
            : variance > 0
              ? 'text-emerald-600'
              : 'text-surface-500';
        return <span className={className}>{formatCurrency(variance)}</span>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <StatusBadge status={item.status} variant="status" />,
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50">Shifts</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">Shift history and management</p>
        </div>
        <button
          onClick={() => setShowOpenModal(true)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
        >
          Open New Shift
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
          <option value="CLOSING">Closing</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={shifts}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        onRowClick={handleViewDetail}
        emptyState={
          <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-12 text-center">
            <div className="text-4xl mb-3">🕐</div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-1">No shifts found</h3>
            <p className="text-surface-500 dark:text-surface-400">Open a new shift to get started.</p>
          </div>
        }
      />

      {/* Open Shift Modal */}
      <Modal isOpen={showOpenModal} onClose={() => setShowOpenModal(false)} title="Open New Shift">
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
              onClick={() => setShowOpenModal(false)}
              className="rounded-lg border border-surface-300 dark:border-surface-600 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Opening...' : 'Open Shift'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Shift Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedShift(null);
          setClosingCash('');
        }}
        title={selectedShift?.name ?? 'Shift Detail'}
        size="lg"
      >
        {selectedShift && (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-surface-500 uppercase">Status</p>
                <StatusBadge status={selectedShift.status} variant="status" />
              </div>
              <div>
                <p className="text-xs text-surface-500 uppercase">Site</p>
                <p className="text-sm font-medium text-surface-900 dark:text-surface-50">
                  {selectedShift.site?.name ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-surface-500 uppercase">Opened By</p>
                <p className="text-sm text-surface-900 dark:text-surface-50">
                  {selectedShift.openedBy
                    ? `${selectedShift.openedBy.firstName} ${selectedShift.openedBy.lastName}`
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-surface-500 uppercase">Started At</p>
                <p className="text-sm text-surface-900 dark:text-surface-50">
                  {new Date(selectedShift.startTime).toLocaleString()}
                </p>
              </div>
              {selectedShift.endTime && (
                <div>
                  <p className="text-xs text-surface-500 uppercase">Ended At</p>
                  <p className="text-sm text-surface-900 dark:text-surface-50">
                    {new Date(selectedShift.endTime).toLocaleString()}
                  </p>
                </div>
              )}
              {selectedShift.closedBy && (
                <div>
                  <p className="text-xs text-surface-500 uppercase">Closed By</p>
                  <p className="text-sm text-surface-900 dark:text-surface-50">
                    {selectedShift.closedBy.firstName} {selectedShift.closedBy.lastName}
                  </p>
                </div>
              )}
            </div>

            {/* Cash Summary */}
            {selectedShift.cashSummary && (
              <div className="rounded-lg bg-surface-50 dark:bg-surface-700/30 p-4">
                <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50 mb-3">Cash Summary</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-surface-500">Opening Cash</p>
                    <p className="text-sm font-medium">{formatCurrency(selectedShift.cashSummary.openingCash)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500">Closing Cash</p>
                    <p className="text-sm font-medium">{formatCurrency(selectedShift.cashSummary.closingCash)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500">Cash Sales</p>
                    <p className="text-sm font-medium">{formatCurrency(selectedShift.cashSummary.cashSales)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500">Card Sales</p>
                    <p className="text-sm font-medium">{formatCurrency(selectedShift.cashSummary.cardSales)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500">Expected Cash</p>
                    <p className="text-sm font-medium">{formatCurrency(selectedShift.cashSummary.expectedCash)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500">Variance</p>
                    <p
                      className={`text-sm font-medium ${
                        (selectedShift.cashSummary.cashVariance ?? 0) < 0
                          ? 'text-red-600'
                          : (selectedShift.cashSummary.cashVariance ?? 0) > 0
                            ? 'text-emerald-600'
                            : ''
                      }`}
                    >
                      {formatCurrency(selectedShift.cashSummary.cashVariance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500">Total Orders</p>
                    <p className="text-sm font-medium">{selectedShift.cashSummary.totalOrders}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Staff List */}
            {selectedShift.staffList && selectedShift.staffList.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50 mb-2">Staff on Shift</h3>
                <div className="space-y-1">
                  {selectedShift.staffList.map((entry) => (
                    <div
                      key={entry.user.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-50 dark:bg-surface-700/30"
                    >
                      <span className="text-sm text-surface-900 dark:text-surface-50">
                        {entry.user.firstName} {entry.user.lastName}
                      </span>
                      <StatusBadge status={entry.user.role} variant="status" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Close Shift */}
            {selectedShift.status === ShiftStatus.OPEN && (
              <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
                <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50 mb-3">Close Shift</h3>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-surface-500 mb-1">Closing Cash</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={closingCash}
                      onChange={(e) => setClosingCash(e.target.value)}
                      className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="0.00"
                    />
                  </div>
                  <button
                    onClick={() => handleCloseShift(selectedShift.id)}
                    disabled={isSubmitting}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {isSubmitting ? 'Closing...' : 'Close Shift'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
