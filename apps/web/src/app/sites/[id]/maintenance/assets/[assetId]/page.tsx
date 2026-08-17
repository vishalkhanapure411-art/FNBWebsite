'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import {
  getAsset,
  updateAsset,
  updateAssetStatus,
  createTicket,
  createSchedule,
  completeSchedule,
  type AssetData,
} from '@/lib/api/maintenance';
import { MaintenanceFrequency } from '@omniops/shared';

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.id as string;
  const assetId = params.assetId as string;
  const { addToast } = useToast();

  const [asset, setAsset] = useState<AssetData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ticket form
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketPriority, setTicketPriority] = useState('MEDIUM');
  const [ticketCategory, setTicketCategory] = useState('REACTIVE');

  // Schedule form
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleDesc, setScheduleDesc] = useState('');
  const [scheduleFreq, setScheduleFreq] = useState('MONTHLY');

  const fetchAsset = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getAsset(assetId);
      setAsset(res.data as AssetData);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load asset', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [assetId, addToast]);

  useEffect(() => {
    fetchAsset();
  }, [fetchAsset]);

  const handleCreateTicket = async () => {
    if (!ticketTitle.trim()) return;
    setIsSubmitting(true);
    try {
      await createTicket({
        siteId,
        title: ticketTitle.trim(),
        description: ticketDesc,
        assetId,
        priority: ticketPriority,
        category: ticketCategory,
      });
      addToast('Ticket created', 'success');
      setShowTicketModal(false);
      setTicketTitle(''); setTicketDesc(''); setTicketPriority('MEDIUM');
      fetchAsset();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create ticket', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!scheduleTitle.trim()) return;
    setIsSubmitting(true);
    try {
      await createSchedule({
        assetId,
        title: scheduleTitle.trim(),
        description: scheduleDesc || undefined,
        frequency: scheduleFreq,
      });
      addToast('Schedule created', 'success');
      setShowScheduleModal(false);
      setScheduleTitle(''); setScheduleDesc(''); setScheduleFreq('MONTHLY');
      fetchAsset();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create schedule', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteSchedule = async (scheduleId: string) => {
    try {
      await completeSchedule(scheduleId);
      addToast('Maintenance completed', 'success');
      fetchAsset();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to complete', 'error');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateAssetStatus(assetId, newStatus);
      addToast('Status updated', 'success');
      fetchAsset();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update status', 'error');
    }
  };

  if (isLoading) {
    return <div className="flex min-h-[40vh] items-center justify-center"><p className="text-surface-500">Loading...</p></div>;
  }
  if (!asset) {
    return <div className="flex min-h-[40vh] items-center justify-center"><p className="text-surface-500">Asset not found.</p></div>;
  }

  const tickets = asset.tickets ?? [];
  const schedules = asset.schedules ?? [];

  return (
    <div className="max-w-4xl">
      <button onClick={() => router.push(`/sites/${siteId}/maintenance/assets`)} className="text-sm text-brand-600 mb-4 inline-block">← Back to Assets</button>

      {/* Asset Info Card */}
      <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">{asset.name}</h1>
            <div className="flex gap-2 mt-2">
              <StatusBadge status={asset.category} variant="type" />
              <select
                value={asset.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-2 py-0.5 text-xs"
              >
                <option value="OPERATIONAL">Operational</option>
                <option value="NEEDS_REPAIR">Needs Repair</option>
                <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                <option value="DECOMMISSIONED">Decommissioned</option>
              </select>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {asset.model && <div><p className="text-xs text-surface-500 uppercase">Model</p><p className="font-medium">{asset.model}</p></div>}
          {asset.serialNumber && <div><p className="text-xs text-surface-500 uppercase">Serial</p><p className="font-medium">{asset.serialNumber}</p></div>}
          {asset.manufacturer && <div><p className="text-xs text-surface-500 uppercase">Manufacturer</p><p className="font-medium">{asset.manufacturer}</p></div>}
          {asset.location && <div><p className="text-xs text-surface-500 uppercase">Location</p><p className="font-medium">{asset.location}</p></div>}
          {asset.purchaseDate && <div><p className="text-xs text-surface-500 uppercase">Purchased</p><p className="font-medium">{new Date(asset.purchaseDate).toLocaleDateString()}</p></div>}
          {asset.warrantyExpiry && <div><p className="text-xs text-surface-500 uppercase">Warranty Expires</p><p className="font-medium">{new Date(asset.warrantyExpiry).toLocaleDateString()}</p></div>}
        </div>
        {asset.notes && <p className="mt-4 text-sm text-surface-600 dark:text-surface-400">{asset.notes}</p>}
        <div className="flex gap-2 mt-6">
          <button onClick={() => setShowTicketModal(true)} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Create Ticket</button>
          <button onClick={() => setShowScheduleModal(true)} className="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium hover:bg-surface-100 dark:hover:bg-surface-700">Add Schedule</button>
        </div>
      </div>

      {/* Preventive Schedules */}
      <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6 mb-6">
        <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-4">Preventive Schedules</h2>
        {schedules.length === 0 ? (
          <p className="text-sm text-surface-500">No schedules configured.</p>
        ) : (
          <div className="space-y-3">
            {schedules.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg bg-surface-50 dark:bg-surface-700/30 p-3">
                <div>
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-surface-500">
                    Every {s.frequency.toLowerCase()} · Next due: {new Date(s.nextDueAt).toLocaleDateString()}
                    {s.lastDoneAt && <> · Last: {new Date(s.lastDoneAt).toLocaleDateString()}</>}
                  </p>
                  {s.description && <p className="text-xs text-surface-400 mt-1">{s.description}</p>}
                </div>
                <button
                  onClick={() => handleCompleteSchedule(s.id)}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                >
                  Mark Complete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ticket History */}
      <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6">
        <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-4">Maintenance History</h2>
        {tickets.length === 0 ? (
          <p className="text-sm text-surface-500">No tickets for this asset.</p>
        ) : (
          <div className="space-y-2">
            {tickets.map((t) => (
              <div
                key={t.id}
                onClick={() => router.push(`/sites/${siteId}/maintenance/tickets/${t.id}`)}
                className="flex items-center justify-between rounded-lg border border-surface-100 dark:border-surface-700 p-3 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-700/30"
              >
                <div>
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-surface-500">{new Date(t.createdAt).toLocaleDateString()} · {t.category}</p>
                </div>
                <div className="flex gap-2">
                  <StatusBadge status={t.priority} />
                  <StatusBadge status={t.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      <Modal isOpen={showTicketModal} onClose={() => setShowTicketModal(false)} title="Create Ticket for Asset">
        <form onSubmit={(e) => { e.preventDefault(); handleCreateTicket(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input type="text" value={ticketTitle} onChange={(e) => setTicketTitle(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="e.g. Freezer not cooling" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={ticketDesc} onChange={(e) => setTicketDesc(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select value={ticketPriority} onChange={(e) => setTicketPriority(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select value={ticketCategory} onChange={(e) => setTicketCategory(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm">
                <option value="REACTIVE">Reactive</option>
                <option value="PREVENTIVE">Preventive</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setShowTicketModal(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={isSubmitting || !ticketTitle.trim()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {isSubmitting ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Schedule Modal */}
      <Modal isOpen={showScheduleModal} onClose={() => setShowScheduleModal(false)} title="Add Preventive Schedule">
        <form onSubmit={(e) => { e.preventDefault(); handleCreateSchedule(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input type="text" value={scheduleTitle} onChange={(e) => setScheduleTitle(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="e.g. Monthly coil cleaning" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={scheduleDesc} onChange={(e) => setScheduleDesc(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm" rows={2} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Frequency</label>
            <select value={scheduleFreq} onChange={(e) => setScheduleFreq(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm">
              {Object.values(MaintenanceFrequency).map((f) => (
                <option key={f} value={f}>{f.charAt(0) + f.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setShowScheduleModal(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={isSubmitting || !scheduleTitle.trim()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {isSubmitting ? 'Creating...' : 'Add Schedule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
