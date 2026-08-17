'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import {
  getOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  type OrderData,
  type OrdersQueryParams,
} from '@/lib/api/orders';

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PREPARING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  READY: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  SERVED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  DRAFT: 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400',
};

const TYPE_COLORS: Record<string, string> = {
  DINE_IN: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  TAKEAWAY: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  DELIVERY: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
};

const STATUS_FLOW: Record<string, string[]> = {
  CONFIRMED: ['PREPARING'],
  PREPARING: ['READY'],
  READY: ['SERVED'],
  SERVED: ['COMPLETED'],
};

export default function OrdersPage() {
  const params = useParams();
  const siteId = params.id as string;
  const { addToast } = useToast();

  const [orders, setOrders] = useState<OrderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  // Detail slide-over
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: OrdersQueryParams = { siteId, page, limit: 50 };

      if (activeTab === 'active') {
        // We'll fetch CONFIRMED+PREPARING+READY together (no single filter in backend)
        // Filter client-side for now
      } else if (activeTab === 'completed') {
        params.status = 'COMPLETED';
      } else if (activeTab === 'cancelled') {
        params.status = 'CANCELLED';
      }

      if (searchQuery) params.search = searchQuery;

      const res = await getOrders(params);
      let data = Array.isArray(res.data) ? res.data : [];

      // Client-side filter for "active" tab
      if (activeTab === 'active') {
        data = data.filter((o) => ['CONFIRMED', 'PREPARING', 'READY'].includes(o.status));
      }

      setOrders(data);
      setTotalOrders((res as any).meta?.total ?? data.length);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load orders', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [siteId, activeTab, searchQuery, page, addToast]);

  useEffect(() => {
    fetchOrders();
    // Poll every 15 seconds for active orders
    const interval = activeTab === 'active' ? setInterval(fetchOrders, 15000) : undefined;
    return () => { if (interval) clearInterval(interval); };
  }, [fetchOrders, activeTab]);

  const openOrderDetail = async (orderId: string) => {
    setIsLoadingDetail(true);
    setShowDetail(true);
    try {
      const res = await getOrder(orderId);
      setSelectedOrder(res.data);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load order', 'error');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      addToast(`Order status updated to ${newStatus}`, 'success');
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
      fetchOrders();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update status', 'error');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      await cancelOrder(orderId);
      addToast('Order cancelled', 'success');
      setShowDetail(false);
      fetchOrders();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to cancel order', 'error');
    }
  };

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50">Orders</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">
            {totalOrders} order{totalOrders !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search order #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500 w-48"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-surface-200 dark:border-surface-700">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1); }}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.key
                ? 'bg-white dark:bg-surface-800 text-brand-600 border-b-2 border-brand-600 -mb-px'
                : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-12 text-center">
          <div className="text-surface-500">Loading orders...</div>
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-1">No orders found</h3>
          <p className="text-surface-500 dark:text-surface-400">
            {activeTab === 'active' ? 'No active orders. Start taking orders on the POS.' : 'No orders in this category.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900">
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase">Order #</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase">Items</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-surface-500 uppercase">Total</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-surface-500 uppercase">Time</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => openOrderDetail(order.id)}
                  className="border-b border-surface-100 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-900/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono font-semibold text-surface-900 dark:text-surface-50">
                      {order.orderNumberDisplay ?? `#${order.orderNumber}`}
                    </span>
                    {order.table && (
                      <span className="text-xs text-surface-400 ml-2">T:{order.table.number}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.orderType} variant="type" />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] ?? ''}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-surface-500">{order.itemCount ?? 0}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-surface-900 dark:text-surface-50 text-right">
                    ${Number(order.grandTotal).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-xs text-surface-400 text-right">
                    {new Date(order.createdAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Detail Slide-over */}
      <Modal
        isOpen={showDetail}
        onClose={() => { setShowDetail(false); setSelectedOrder(null); }}
        title={selectedOrder ? `Order ${selectedOrder.orderNumberDisplay ?? `#${selectedOrder.orderNumber}`}` : 'Order Detail'}
        size="lg"
      >
        {isLoadingDetail ? (
          <div className="text-center py-8 text-surface-500">Loading...</div>
        ) : selectedOrder ? (
          <div className="space-y-6">
            {/* Order Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-surface-500">Status</span>
                <div className="mt-1">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selectedOrder.status] ?? ''}`}>
                    {selectedOrder.status}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-surface-500">Type</span>
                <p className="text-surface-900 dark:text-surface-50 mt-1">{selectedOrder.orderType?.replace('_', ' ')}</p>
              </div>
              {selectedOrder.table && (
                <div>
                  <span className="text-surface-500">Table</span>
                  <p className="text-surface-900 dark:text-surface-50 mt-1">{selectedOrder.table.number}</p>
                </div>
              )}
              <div>
                <span className="text-surface-500">Guests</span>
                <p className="text-surface-900 dark:text-surface-50 mt-1">{selectedOrder.guestCount}</p>
              </div>
              <div>
                <span className="text-surface-500">Created</span>
                <p className="text-surface-900 dark:text-surface-50 mt-1">
                  {new Date(selectedOrder.createdAt).toLocaleString()}
                </p>
              </div>
              {selectedOrder.user && (
                <div>
                  <span className="text-surface-500">Staff</span>
                  <p className="text-surface-900 dark:text-surface-50 mt-1">
                    {selectedOrder.user.firstName} {selectedOrder.user.lastName}
                  </p>
                </div>
              )}
            </div>

            {/* Items */}
            <div>
              <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-2">Items</h3>
              <div className="space-y-2">
                {selectedOrder.items?.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start justify-between p-2 rounded-lg ${
                      item.status === 'CANCELLED'
                        ? 'bg-red-50 dark:bg-red-900/10 line-through'
                        : 'bg-surface-50 dark:bg-surface-900'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium text-surface-900 dark:text-surface-50">
                        {item.quantity}× {item.name}
                      </div>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="text-xs text-surface-400 mt-0.5">
                          {item.modifiers.map((m) => m.modifierName).join(', ')}
                        </div>
                      )}
                      {item.notes && (
                        <div className="text-xs text-amber-600 mt-0.5 italic">Note: {item.notes}</div>
                      )}
                      <div className="text-xs text-surface-400 mt-0.5">Station: {item.station}</div>
                    </div>
                    <div className="text-sm font-semibold text-surface-900 dark:text-surface-50">
                      ${Number(item.totalPrice).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Discounts */}
            {selectedOrder.discounts && selectedOrder.discounts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-2">Discounts</h3>
                {selectedOrder.discounts.map((d) => (
                  <div key={d.id} className="text-sm text-red-500">
                    {d.type === 'PERCENTAGE' ? `${d.value}%` : `$${Number(d.value).toFixed(2)}`}
                    {d.reason && <span className="text-surface-400 ml-2">— {d.reason}</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Totals */}
            <div className="border-t border-surface-200 dark:border-surface-700 pt-4 space-y-1 text-sm">
              <div className="flex justify-between text-surface-500">
                <span>Subtotal</span>
                <span>${Number(selectedOrder.subTotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-surface-500">
                <span>Tax</span>
                <span>${Number(selectedOrder.taxTotal).toFixed(2)}</span>
              </div>
              {Number(selectedOrder.discountTotal) > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Discount</span>
                  <span>-${Number(selectedOrder.discountTotal).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg text-surface-900 dark:text-surface-50 pt-1">
                <span>Total</span>
                <span>${Number(selectedOrder.grandTotal).toFixed(2)}</span>
              </div>
            </div>

            {/* Status Actions */}
            {selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED' && (
              <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
                <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3">Actions</h3>
                <div className="flex flex-wrap gap-2">
                  {(STATUS_FLOW[selectedOrder.status] ?? []).map((nextStatus) => (
                    <button
                      key={nextStatus}
                      onClick={() => handleStatusChange(selectedOrder.id, nextStatus)}
                      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
                    >
                      Mark {nextStatus}
                    </button>
                  ))}
                  <button
                    onClick={() => handleCancelOrder(selectedOrder.id)}
                    className="rounded-lg border border-red-300 dark:border-red-700 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Cancel Order
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
