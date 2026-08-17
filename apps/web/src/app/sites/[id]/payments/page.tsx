'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { getPayments, getPayment, type PaymentData } from '@/lib/api/payments';

const paymentStatusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  AUTHORIZED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CAPTURED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  REFUNDED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  PARTIALLY_REFUNDED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  VOIDED: 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400',
};

const paymentMethodIcons: Record<string, string> = {
  CARD: '💳',
  CASH: '💵',
  UPI: '📱',
  DIGITAL_WALLET: '🪪',
};

export default function PaymentsPage() {
  const params = useParams();
  const siteId = params.id as string;
  const { addToast } = useToast();

  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getPayments({
        siteId,
        method: methodFilter || undefined,
        status: statusFilter || undefined,
        limit: 50,
      });
      setPayments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load payments', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [siteId, methodFilter, statusFilter, addToast]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleViewDetail = async (paymentId: string) => {
    try {
      const res = await getPayment(paymentId);
      setSelectedPayment(res.data);
      setShowDetailModal(true);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load payment detail', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Payments</h1>
          <p className="text-sm text-surface-500 mt-1">Payment history and transaction records</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-surface-500">Method:</span>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-2 py-1 text-xs"
          >
            <option value="">All</option>
            <option value="CARD">Card</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="DIGITAL_WALLET">Digital Wallet</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-surface-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-2 py-1 text-xs"
          >
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="AUTHORIZED">Authorized</option>
            <option value="CAPTURED">Captured</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
            <option value="PARTIALLY_REFUNDED">Partially Refunded</option>
            <option value="VOIDED">Voided</option>
          </select>
        </div>
        <button
          onClick={fetchPayments}
          className="ml-auto text-xs text-brand-600 hover:text-brand-700 font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-surface-500">Loading payments...</div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-surface-400">
            <div className="text-4xl mb-2">💳</div>
            <p>No payments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900">
                  <th className="text-left px-4 py-3 font-semibold text-surface-600 dark:text-surface-400">Order #</th>
                  <th className="text-left px-4 py-3 font-semibold text-surface-600 dark:text-surface-400">Amount</th>
                  <th className="text-left px-4 py-3 font-semibold text-surface-600 dark:text-surface-400">Method</th>
                  <th className="text-left px-4 py-3 font-semibold text-surface-600 dark:text-surface-400">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-surface-600 dark:text-surface-400">Date</th>
                  <th className="text-right px-4 py-3 font-semibold text-surface-600 dark:text-surface-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-900/50 cursor-pointer"
                    onClick={() => handleViewDetail(payment.id)}
                  >
                    <td className="px-4 py-3 text-surface-900 dark:text-surface-50 font-mono text-xs">
                      #{payment.order?.orderNumber ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-surface-900 dark:text-surface-50">
                      ${Number(payment.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-surface-700 dark:text-surface-300">
                        <span>{paymentMethodIcons[payment.method] ?? '💰'}</span>
                        <span>{payment.method.replace(/_/g, ' ')}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${paymentStatusColors[payment.status] ?? 'bg-surface-100 text-surface-600'}`}
                      >
                        {payment.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-surface-500 text-xs">
                      {new Date(payment.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetail(payment.id);
                        }}
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Payment Receipt"
        size="md"
      >
        {selectedPayment && (
          <div className="space-y-4">
            {/* Receipt Header */}
            <div className="text-center pb-3 border-b border-dashed border-surface-200 dark:border-surface-700">
              <div className="text-lg font-bold text-surface-900 dark:text-surface-50">
                {selectedPayment.order?.site?.name ?? 'OmniOps'}
              </div>
              <div className="text-sm text-surface-500">
                Order #{selectedPayment.order?.orderNumber ?? '—'}
              </div>
            </div>

            {/* Payment Details */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-surface-500">Amount</span>
                <span className="font-bold text-surface-900 dark:text-surface-50">
                  ${Number(selectedPayment.amount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Method</span>
                <span className="text-surface-900 dark:text-surface-50">
                  {paymentMethodIcons[selectedPayment.method]} {selectedPayment.method.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Status</span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${paymentStatusColors[selectedPayment.status] ?? 'bg-surface-100 text-surface-600'}`}
                >
                  {selectedPayment.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Date</span>
                <span className="text-surface-900 dark:text-surface-50">
                  {new Date(selectedPayment.createdAt).toLocaleString()}
                </span>
              </div>
              {selectedPayment.gatewayTransactionId && (
                <div className="flex justify-between">
                  <span className="text-surface-500">Transaction ID</span>
                  <span className="text-surface-900 dark:text-surface-50 font-mono text-xs">
                    {selectedPayment.gatewayTransactionId}
                  </span>
                </div>
              )}
              {selectedPayment.refundReason && (
                <div className="flex justify-between">
                  <span className="text-surface-500">Refund Reason</span>
                  <span className="text-surface-900 dark:text-surface-50">
                    {selectedPayment.refundReason}
                  </span>
                </div>
              )}
            </div>

            {/* Receipt Footer */}
            <div className="text-center pt-3 border-t border-dashed border-surface-200 dark:border-surface-700">
              <p className="text-xs text-surface-400">Thank you for your payment</p>
              <p className="text-xs text-surface-400 mt-1">Processed by OmniOps Payments</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
