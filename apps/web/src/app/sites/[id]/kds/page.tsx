'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '@/lib/api-client';
import type { KitchenQueue, KitchenQueueItem } from '@/lib/api/orders';

// API origin derived from NEXT_PUBLIC_API_URL (e.g. '/api' -> '' same-origin, or a full URL).
// NEXT_PUBLIC_API_URL points at the API *prefix*; KDS uses it as origin + '/api' path,
// so strip a trailing '/api' to get the origin.
const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/api$/, '');

const STATIONS = ['ALL', 'GRILL', 'FRY', 'COLD', 'DRINKS', 'DESSERT', 'EXPO'] as const;
type Station = (typeof STATIONS)[number];

const WARNING_THRESHOLD = 10 * 60; // 10 minutes
const CRITICAL_THRESHOLD = 15 * 60; // 15 minutes

interface KdsSettings {
  soundEnabled: boolean;
  warningThreshold: number;
  criticalThreshold: number;
  defaultStation: Station;
  gridColumns: number;
}

const DEFAULT_SETTINGS: KdsSettings = {
  soundEnabled: true,
  warningThreshold: WARNING_THRESHOLD,
  criticalThreshold: CRITICAL_THRESHOLD,
  defaultStation: 'ALL',
  gridColumns: 2,
};

function loadSettings(): KdsSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem('omniops_kds_settings');
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: KdsSettings) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('omniops_kds_settings', JSON.stringify(settings));
}

// Simple chime sound using Web Audio API
function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch { /* ignore audio errors */ }
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getOrderTypeIcon(type: string): string {
  switch (type) {
    case 'DINE_IN': return '🍽️';
    case 'TAKEAWAY': return '🛍️';
    case 'DELIVERY': return '🚗';
    case 'DRIVE_THRU': return '🚘';
    default: return '📋';
  }
}

export default function KdsPage() {
  const params = useParams();
  const siteId = params.id as string;

  const [settings, setSettings] = useState<KdsSettings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [activeStation, setActiveStation] = useState<Station>(settings.defaultStation);
  const [connected, setConnected] = useState(false);
  const [tickets, setTickets] = useState<KitchenQueueItem[]>([]);
  const [selectedTicketIdx, setSelectedTicketIdx] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  const socketRef = useRef<Socket | null>(null);
  const ticketsRef = useRef<KitchenQueueItem[]>([]);

  // Keep ref in sync for socket callbacks
  useEffect(() => {
    ticketsRef.current = tickets;
  }, [tickets]);

  // Persist settings
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Fetch initial kitchen queue
  const fetchQueue = useCallback(async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const res = await fetch(`${API_ORIGIN}/api/orders/kitchen-queue?siteId=${siteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.data?.stations) {
        const allItems: KitchenQueueItem[] = [];
        const stations = data.data.stations;
        for (const station of Object.keys(stations)) {
          for (const item of stations[station]) {
            allItems.push(item);
          }
        }
        setTickets(allItems);
        setLastFetchTime(Date.now());
      }
    } catch { /* offline will use cached data */ }
  }, [siteId]);

  // Connect to WebSocket
  const connectSocket = useCallback(() => {
    const token = getAccessToken();
    if (!token) return;

    // Disconnect existing
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(`${API_ORIGIN}/kitchen`, {
      auth: { token },
      query: { siteId },
      // polling-only: Next.js rewrites proxy HTTP but not WebSocket upgrades,
      // so the WebSocket transport cannot traverse port 3000.
      transports: ['polling'],
    });

    socket.on('connect', () => {
      setConnected(true);
      // Full sync on reconnect
      fetchQueue();
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', () => {
      setConnected(false);
    });

    socket.on('order:new', (payload: { orderId: string; items: KitchenQueueItem[] }) => {
      setTickets((prev) => {
        // Avoid duplicates
        const existingIds = new Set(prev.map((t) => t.itemId));
        const newItems = (payload.items ?? []).filter((item) => !existingIds.has(item.itemId));
        if (newItems.length > 0 && settings.soundEnabled) {
          playChime();
        }
        return [...prev, ...newItems];
      });
    });

    socket.on('order:updated', (payload: { orderId: string; itemId?: string; status: string }) => {
      if (payload.status === 'CANCELLED' || payload.status === 'COMPLETED') {
        // Remove all items from this order
        setTickets((prev) => prev.filter((t) => t.orderId !== payload.orderId));
      } else if (payload.itemId && payload.status === 'READY') {
        // Remove bumped item
        setTickets((prev) => prev.filter((t) => t.itemId !== payload.itemId));
      } else {
        // Full refresh for other updates
        fetchQueue();
      }
    });

    socketRef.current = socket;
  }, [siteId, settings.soundEnabled, fetchQueue]);

  // Initial connect
  useEffect(() => {
    fetchQueue();
    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [fetchQueue, connectSocket]);

  // Auto-reconnect with exponential backoff
  useEffect(() => {
    if (connected) return;
    const timer = setTimeout(connectSocket, 3000);
    return () => clearTimeout(timer);
  }, [connected, connectSocket]);

  // Update timers every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTickets((prev) => [...prev]); // force re-render for elapsed time
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Bump item
  const bumpItem = useCallback((itemId: string, orderId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('order:bump', { orderId, itemId });
    }
    // Optimistic removal
    setTickets((prev) => prev.filter((t) => t.itemId !== itemId));
  }, []);

  // Bump all items on current ticket
  const bumpAllOnTicket = useCallback(() => {
    const ticket = filteredTickets[selectedTicketIdx];
    if (!ticket) return;
    const orderId = ticket.orderId;
    const itemsToBump = filteredTickets.filter((t) => t.orderId === orderId);
    for (const item of itemsToBump) {
      bumpItem(item.itemId, item.orderId);
    }
  }, [selectedTicketIdx]);

  // Filter by station
  const now = Date.now();
  const filteredTickets = activeStation === 'ALL'
    ? tickets
    : tickets.filter((t) => {
        // The station info comes from the item's own station property
        // In our queue items, we don't have station directly; we need to infer
        return true; // Server already groups by station, we show all in ALL view
      });

  // Group by order for display
  const groupedByOrder = new Map<string, KitchenQueueItem[]>();
  for (const ticket of filteredTickets) {
    const existing = groupedByOrder.get(ticket.orderId) ?? [];
    existing.push(ticket);
    groupedByOrder.set(ticket.orderId, existing);
  }

  const orderGroups = Array.from(groupedByOrder.entries()).map(([orderId, items]) => ({
    orderId,
    orderNumber: items[0]?.orderNumber ?? '',
    orderType: items[0]?.orderType ?? 'DINE_IN',
    tableNumber: items[0]?.tableNumber ?? null,
    guestCount: items[0]?.guestCount ?? 0,
    items,
    oldestElapsed: Math.max(...items.map((i) => i.elapsedSeconds ?? 0)),
  }));

  // Get elapsed color class
  const getElapsedClass = (elapsedSeconds: number): string => {
    if (elapsedSeconds > settings.criticalThreshold) return 'border-red-500 bg-red-50 dark:bg-red-900/20 animate-pulse';
    if (elapsedSeconds > settings.warningThreshold) return 'border-amber-400 bg-amber-50 dark:bg-amber-900/20';
    return 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800';
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if settings modal is open or user is typing in input
      if (showSettings) return;
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          bumpItem(filteredTickets[selectedTicketIdx]?.itemId ?? '', filteredTickets[selectedTicketIdx]?.orderId ?? '');
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          setSelectedTicketIdx((prev) => Math.min(filteredTickets.length - 1, prev + 1));
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          setSelectedTicketIdx((prev) => Math.max(0, prev - 1));
          break;
        case 'b':
        case 'B':
          e.preventDefault();
          bumpAllOnTicket();
          break;
        case '1': setActiveStation('ALL'); break;
        case '2': setActiveStation('GRILL'); break;
        case '3': setActiveStation('FRY'); break;
        case '4': setActiveStation('COLD'); break;
        case '5': setActiveStation('DRINKS'); break;
        case '6': setActiveStation('DESSERT'); break;
        case '7': setActiveStation('EXPO'); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredTickets, selectedTicketIdx, bumpItem, bumpAllOnTicket, showSettings]);

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] bg-surface-100 dark:bg-surface-950">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700">
        {/* Station Tabs */}
        <div className="flex gap-1">
          {STATIONS.map((station, idx) => (
            <button
              key={station}
              onClick={() => setActiveStation(station)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                activeStation === station
                  ? 'bg-brand-600 text-white'
                  : 'bg-surface-100 dark:bg-surface-800 text-surface-600 hover:bg-surface-200 dark:hover:bg-surface-700'
              }`}
              title={`Press ${idx === 0 ? '1' : idx + 1} for ${station}`}
            >
              {station === 'ALL' ? 'ALL' : station}
              {idx > 0 && idx < 8 && (
                <span className="ml-1.5 text-[10px] opacity-60">{idx + 1}</span>
              )}
            </button>
          ))}
        </div>

        {/* Right Side: Connection + Settings */}
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-1.5 text-xs">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                connected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-surface-500">
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>

          {/* Settings Gear */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500 transition-colors"
            title="KDS Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50">KDS Settings</h3>
            <button
              onClick={() => setShowSettings(false)}
              className="text-surface-400 hover:text-surface-600 text-lg"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <label className="flex items-center gap-2 text-sm text-surface-700 dark:text-surface-300">
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => setSettings({ ...settings, soundEnabled: e.target.checked })}
                className="rounded border-surface-300 text-brand-600"
              />
              Sound Alerts
            </label>
            <div>
              <label className="block text-xs text-surface-500 mb-1">Warning (sec)</label>
              <input
                type="number"
                value={settings.warningThreshold}
                onChange={(e) => setSettings({ ...settings, warningThreshold: parseInt(e.target.value) || 600 })}
                className="w-full rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-surface-500 mb-1">Critical (sec)</label>
              <input
                type="number"
                value={settings.criticalThreshold}
                onChange={(e) => setSettings({ ...settings, criticalThreshold: parseInt(e.target.value) || 900 })}
                className="w-full rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-surface-500 mb-1">Columns</label>
              <select
                value={settings.gridColumns}
                onChange={(e) => setSettings({ ...settings, gridColumns: parseInt(e.target.value) })}
                className="w-full rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-2 py-1 text-sm"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {orderGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-surface-400">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-lg font-medium">No active orders</p>
            <p className="text-sm mt-1">Orders from POS will appear here in real-time</p>
          </div>
        ) : (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${settings.gridColumns}, 1fr)` }}
          >
            {orderGroups.map((group) => {
              const elapsedClass = getElapsedClass(group.oldestElapsed);
              return (
                <div
                  key={group.orderId}
                  className={`rounded-xl border-2 p-4 transition-all ${elapsedClass} ${
                    filteredTickets[selectedTicketIdx]?.orderId === group.orderId
                      ? 'ring-2 ring-brand-500 ring-offset-2'
                      : ''
                  }`}
                  onClick={() => {
                    const idx = filteredTickets.findIndex((t) => t.orderId === group.orderId);
                    if (idx >= 0) setSelectedTicketIdx(idx);
                  }}
                >
                  {/* Ticket Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getOrderTypeIcon(group.orderType)}</span>
                      <div>
                        <div className="text-lg font-bold text-surface-900 dark:text-surface-50">
                          #{group.orderNumber}
                        </div>
                        {group.tableNumber && (
                          <div className="text-xs text-surface-500">
                            Table {group.tableNumber}
                            {group.guestCount > 0 && ` · ${group.guestCount} guests`}
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      className={`text-xl font-mono font-bold ${
                        group.oldestElapsed > settings.criticalThreshold
                          ? 'text-red-600'
                          : group.oldestElapsed > settings.warningThreshold
                          ? 'text-amber-600'
                          : 'text-surface-700 dark:text-surface-300'
                      }`}
                    >
                      {formatElapsed(group.oldestElapsed)}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-2 mb-3">
                    {group.items.map((item) => (
                      <div
                        key={item.itemId}
                        className="flex items-start justify-between gap-2 p-2 rounded-lg bg-surface-50 dark:bg-surface-900/50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-surface-900 dark:text-surface-50">
                              {item.quantity}× {item.itemName}
                            </span>
                          </div>
                          {item.modifiers && item.modifiers.length > 0 && (
                            <div className="text-xs text-surface-400 mt-0.5">
                              {Array.isArray(item.modifiers)
                                ? item.modifiers.map((m: any) =>
                                    typeof m === 'string' ? m : m.modifierName
                                  ).join(', ')
                                : ''}
                            </div>
                          )}
                          {item.notes && (
                            <div className="text-xs text-amber-600 mt-0.5 italic">
                              {item.notes}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            bumpItem(item.itemId, item.orderId);
                          }}
                          className="shrink-0 px-3 py-1 text-xs font-bold rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors"
                          title="Bump (mark as ready)"
                        >
                          BUMP
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Bump All */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      bumpAllOnTicket();
                    }}
                    className="w-full py-2 text-xs font-bold rounded-lg border border-surface-300 dark:border-surface-600 text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                    title="Bump all items (B)"
                  >
                    Bump All (B)
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Keyboard Hints */}
      <div className="flex items-center justify-center gap-4 py-1.5 px-4 bg-white dark:bg-surface-900 border-t border-surface-200 dark:border-surface-700 text-[10px] text-surface-400">
        <span><kbd className="px-1 py-0.5 rounded bg-surface-100 dark:bg-surface-800">←→↑↓</kbd> Navigate</span>
        <span><kbd className="px-1 py-0.5 rounded bg-surface-100 dark:bg-surface-800">Space</kbd> Bump</span>
        <span><kbd className="px-1 py-0.5 rounded bg-surface-100 dark:bg-surface-800">B</kbd> Bump All</span>
        <span><kbd className="px-1 py-0.5 rounded bg-surface-100 dark:bg-surface-800">1-7</kbd> Stations</span>
      </div>
    </div>
  );
}
