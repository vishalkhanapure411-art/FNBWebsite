'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { getCdsOrderView, type CdsOrderView } from '@/lib/api/cds';

// API origin derived from NEXT_PUBLIC_API_URL (e.g. '/api' -> '' same-origin, or a full URL).
// NEXT_PUBLIC_API_URL points at the API *prefix*; CDS uses it as origin + '/cds' socket namespace,
// so strip a trailing '/api' to get the origin.
const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/api$/, '');

const PROMO_SLIDES = [
  {
    title: 'Try Our Meal Deal',
    subtitle: 'Add fries + drink for just $4.99',
    emoji: '🍔',
    bgColor: 'from-brand-600 to-brand-800',
  },
  {
    title: 'Happy Hour',
    subtitle: '2-for-1 drinks 4-7pm daily',
    emoji: '🍹',
    bgColor: 'from-amber-500 to-orange-700',
  },
  {
    title: 'Loyalty Rewards',
    subtitle: 'Earn points with every order',
    emoji: '⭐',
    bgColor: 'from-emerald-500 to-teal-700',
  },
];

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function CdsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const siteId = params.id as string;
  const orderId = searchParams.get('orderId');

  // Order state
  const [order, setOrder] = useState<CdsOrderView | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Connection state
  const [connected, setConnected] = useState(false);

  // Idle / promo state
  const [showPromo, setShowPromo] = useState(!orderId);
  const [promoIndex, setPromoIndex] = useState(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Current time for display
  const [currentTime, setCurrentTime] = useState(new Date());

  // Socket ref
  const socketRef = useRef<Socket | null>(null);

  // Fetch order data
  const fetchOrder = useCallback(async (oid: string) => {
    setIsLoading(true);
    setNotFound(false);
    try {
      const data = await getCdsOrderView(oid);
      setOrder(data);
      setShowPromo(false);
      resetIdleTimer();

      // If order is completed/cancelled, go back to promo
      if (data.status === 'COMPLETED' || data.status === 'CANCELLED') {
        setTimeout(() => {
          setShowPromo(true);
          setOrder(null);
        }, 5000);
      }
    } catch (err: any) {
      if (err?.status === 404) {
        setNotFound(true);
      }
      setShowPromo(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reset idle timer — go to promo after 60s
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      setShowPromo(true);
    }, 60000);
  }, []);

  // Connect to CDS WebSocket
  const connectSocket = useCallback((oid: string) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(`${API_ORIGIN}/cds`, {
      query: { orderId: oid },
      // polling-only: Next.js rewrites proxy HTTP but not WebSocket upgrades,
      // so the WebSocket transport cannot traverse port 3000.
      transports: ['polling'],
    });

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join', { orderId: oid });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', () => {
      setConnected(false);
    });

    socket.on('order:updated', (payload: { orderId: string; status?: string }) => {
      if (payload.orderId === oid) {
        fetchOrder(oid);
      }
    });

    socket.on('item:status', (payload: { orderId: string }) => {
      if (payload.orderId === oid) {
        fetchOrder(oid);
      }
    });

    socketRef.current = socket;
  }, [fetchOrder]);

  // Initial load
  useEffect(() => {
    if (orderId) {
      fetchOrder(orderId);
      connectSocket(orderId);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [orderId, fetchOrder, connectSocket]);

  // Promo carousel rotation
  useEffect(() => {
    if (!showPromo) return;
    const interval = setInterval(() => {
      setPromoIndex((prev) => (prev + 1) % PROMO_SLIDES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [showPromo]);

  // Clock update
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-reconnect
  useEffect(() => {
    if (connected || !orderId) return;
    const timer = setTimeout(() => connectSocket(orderId), 3000);
    return () => clearTimeout(timer);
  }, [connected, orderId, connectSocket]);

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'PENDING':
      case 'PREPARING':
        return '⏳';
      case 'READY':
        return '✅';
      case 'SERVED':
        return '🍽️';
      default:
        return '📋';
    }
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'PENDING':
      case 'PREPARING':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'READY':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'SERVED':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-surface-100 text-surface-600 border-surface-200';
    }
  };

  const getPaymentIcon = (method: string): string => {
    const m = method.toUpperCase();
    if (m.includes('CARD')) return '💳';
    if (m.includes('CASH')) return '💵';
    if (m.includes('UPI')) return '📱';
    if (m.includes('WALLET')) return '📲';
    return '💰';
  };

  // ─── Idle / Promo View ───────────────────────────
  if (showPromo) {
    const slide = PROMO_SLIDES[promoIndex % PROMO_SLIDES.length]!;
    return (
      <div className="fixed inset-0 flex flex-col bg-surface-950">
        {/* Connection indicator */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`}
          />
          <span className="text-xs text-surface-400">
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>

        {/* Promo carousel */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div
            key={promoIndex}
            className="flex flex-col items-center text-center transition-opacity duration-700"
            style={{ opacity: 1 }}
          >
            <div
              className={`w-32 h-32 rounded-full bg-gradient-to-br ${slide.bgColor} flex items-center justify-center text-5xl mb-8 shadow-2xl`}
            >
              {slide.emoji}
            </div>
            <h1 className="text-4xl font-bold text-white mb-3">{slide.title}</h1>
            <p className="text-xl text-surface-300">{slide.subtitle}</p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-8 py-4 bg-surface-900 border-t border-surface-700">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm">
              O
            </div>
            <span className="text-surface-300 text-sm">Welcome to OmniOps</span>
          </div>
          <div className="text-surface-400 text-2xl font-mono">{formatTime(currentTime)}</div>
        </div>

        {/* Slide indicators */}
        <div className="flex justify-center gap-2 pb-4">
          {PROMO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setPromoIndex(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === promoIndex % PROMO_SLIDES.length
                  ? 'bg-brand-500 w-6'
                  : 'bg-surface-600 hover:bg-surface-500'
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  // ─── Loading ──────────────────────────────────────
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-surface-950">
        <div className="text-surface-400 text-xl">Loading order...</div>
      </div>
    );
  }

  // ─── Not Found ────────────────────────────────────
  if (notFound || !order) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-surface-950">
        <div className="text-6xl mb-4">🔍</div>
        <p className="text-xl text-surface-300 mb-2">Order not found</p>
        <p className="text-sm text-surface-500">The order may have been completed or does not exist.</p>
      </div>
    );
  }

  // ─── Active Order View ────────────────────────────
  const activeItems = order.items.filter(
    (item) => item.status !== 'CANCELLED',
  );

  return (
    <div className="fixed inset-0 flex flex-col bg-surface-950 text-surface-50">
      {/* Connection indicator */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
        <span
          className={`inline-block w-2.5 h-2.5 rounded-full ${
            connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
          }`}
        />
        <span className="text-xs text-surface-400">
          {connected ? 'Live' : 'Offline'}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 bg-surface-900 border-b border-surface-700">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {order.orderNumber}
          </h1>
          <p className="text-sm text-surface-400">
            {order.orderType.replace('_', ' ')}
            {order.table && ` • Table ${order.table}`}
            {order.guestCount > 0 && ` • ${order.guestCount} guests`}
          </p>
        </div>
        <div className="text-right">
          <div className="text-surface-400 text-2xl font-mono">{formatTime(currentTime)}</div>
          <div className="text-xs text-surface-500">{order.siteName}</div>
        </div>
      </div>

      {/* Main Content: 60/40 split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Itemized Order (60%) */}
        <div className="w-[60%] overflow-y-auto p-6 border-r border-surface-700">
          {activeItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-surface-500">
              <p className="text-lg">No active items</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between p-4 rounded-xl bg-surface-800 border border-surface-700"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-semibold text-white">{item.name}</span>
                      <span className="text-sm text-surface-400">×{item.qty}</span>
                    </div>
                    <div className="text-sm text-surface-300">
                      {item.qty} × ${item.unitPrice.toFixed(2)} = ${item.total.toFixed(2)}
                    </div>
                    {item.modifiers.length > 0 && (
                      <div className="text-xs text-surface-400 mt-1">
                        {item.modifiers.join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">
                        ${item.total.toFixed(2)}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(item.status)}`}
                    >
                      {getStatusIcon(item.status)} {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Summary (40%) */}
        <div className="w-[40%] flex flex-col p-6">
          {/* Order Summary Card */}
          <div className="bg-surface-800 rounded-2xl p-6 border border-surface-700 mb-6">
            <h2 className="text-lg font-semibold text-surface-300 mb-4">Order Summary</h2>

            <div className="space-y-2 text-base">
              <div className="flex justify-between text-surface-400">
                <span>Subtotal</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-surface-400">
                <span>Tax</span>
                <span>${order.tax.toFixed(2)}</span>
              </div>

              {order.discounts.map((d, i) => (
                <div key={i} className="flex justify-between text-red-400">
                  <span>
                    Discount ({d.type === 'PERCENTAGE' ? `${d.value}%` : 'Fixed'})
                  </span>
                  <span>-${d.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-surface-700">
              <div className="flex justify-between items-baseline">
                <span className="text-lg text-surface-300">Total</span>
                <span className="text-4xl font-bold text-white">
                  ${order.grandTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Payments */}
          {order.payments.length > 0 && (
            <div className="bg-surface-800 rounded-2xl p-6 border border-surface-700 mb-6">
              <h2 className="text-lg font-semibold text-surface-300 mb-3">Payments</h2>
              <div className="space-y-2">
                {order.payments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-surface-300">
                      <span>{getPaymentIcon(p.method)}</span>
                      <span className="capitalize">{p.method.replace(/_/g, ' ').toLowerCase()}</span>
                    </div>
                    <span className="text-white font-semibold">${p.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upsell placeholder */}
          <div className="bg-gradient-to-br from-brand-700 to-brand-900 rounded-2xl p-6 border border-brand-600/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🎯</span>
              <h3 className="text-sm font-semibold text-brand-200">Meal Deal</h3>
            </div>
            <p className="text-xs text-brand-300 mb-3">
              Add fries + drink for $4.99
            </p>
            <button
              onClick={() => resetIdleTimer()}
              className="w-full py-2 rounded-lg bg-white/10 text-brand-200 text-sm font-medium hover:bg-white/20 transition-colors"
            >
              Add to Order
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="flex items-center justify-between px-8 py-4 bg-surface-900 border-t border-surface-700">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm">
            O
          </div>
          <span className="text-surface-300 text-base">
            Thank you for your order | {order.siteName}
          </span>
        </div>
        <div className="text-surface-400 text-base">{formatTime(currentTime)}</div>
      </div>
    </div>
  );
}
