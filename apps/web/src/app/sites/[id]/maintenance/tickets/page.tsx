'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import {
  getTickets,
  getAssets,
  createTicket,
  type TicketData,
  type AssetData,
} from '@/lib/api/maintenance';

export default function TicketsPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.id as string;
  const { addToast } = useToast();

  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assetId, setAssetId] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [category, setCategory] = useState('REACTIVE');

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getTickets({
        siteId,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        category: categoryFilter || undefined,
      });
      setTickets(res.data ?? []);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load tickets', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [siteId, statusFilter, priorityFilter, categoryFilter, addToast]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    getAssets({ siteId, limit: 200 }).then((res) => setAssets(res.data ?? [])).catch(() => {});
  }, [siteId]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setIsSubmitting(true);
    try {
      await createTicket({
        siteId,
        title: title.trim(),
        description,
        assetId: assetId || undefined,
        priority,
        category,
      });
      addToast('Ticket created', 'success');
      setShowCreateModal(false);
      resetForm();
      fetchTickets();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create ticket', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle(''); setDescription(''); setAssetId(''); setPriority('MEDIUM'); setCategory('REACTIVE');
  };

  const getSlaDisplay = (ticket: TicketData) => {
    if (!ticket.slaDueAt) return '—';
    const due = new Date(ticket.slaDueAt).getTime();
    const now = Date.now();
    const diff = due - now;
    if (diff <= 0 && ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED') {
      return <span className="text-red-600 font-semibold">OVERDUE</span>;
    }
    const hours = Math.max(0, Math.round(diff / (1000 * 60 * 60)));
    return <span className={hours < 8 ? 'text-amber-600' : 'text-emerald-600'}>{hours}h left</span>;
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case 'CRITICAL': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'HIGH': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'MEDIUM': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'LOW': return 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400';
      default: return '';
    }
  };

  const columns: Column<TicketData>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (item) => (
        <span className="font-medium text-surface-900 dark:text-surface-50">{item.title}</span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (item) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityColor(item.priority)}`}>
          {item.priority}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: 'category',
      header: 'Category',
      render: (item) => (
        <StatusBadge status={item.category} variant="type" />
      ),
    },
    {
      key: 'asset',
      header: 'Asset',
      render: (item) => item.asset?.name ?? '—',
    },
    {
      key: 'assignedTo',
      header: 'Assigned To',
      render: (item) =>
        item.assignedTo
          ? `${item.assignedTo.firstName} ${item.assignedTo.lastName}`
          : item.vendor
            ? `🏢 ${item.vendor.name}`
            : '—',
    },
    {
      key: 'sla',
      header: 'SLA',
      render: (item) => getSlaDisplay(item),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (item) => new Date(item.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50">Tickets</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">Maintenance requests and work orders</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
        >
          Create Ticket
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm">
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm">
          <option value="">All Categories</option>
          <option value="PREVENTIVE">Preventive</option>
          <option value="REACTIVE">Reactive</option>
          <option value="EMERGENCY">Emergency</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={tickets}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        onRowClick={(item) => router.push(`/sites/${siteId}/maintenance/tickets/${item.id}`)}
        emptyState={
          <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-12 text-center">
            <div className="text-4xl mb-3">🎫</div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-1">No tickets found</h3>
            <p className="text-surface-500 dark:text-surface-400">Create your first maintenance ticket.</p>
          </div>
        }
      />

      {/* Create Ticket Modal */}
      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); resetForm(); }} title="Create Ticket" size="lg">
        <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="e.g. Walk-in freezer not cooling" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Related Asset</label>
              <select value={assetId} onChange={(e) => setAssetId(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm">
                <option value="">None</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm">
                <option value="LOW">Low (7 days SLA)</option>
                <option value="MEDIUM">Medium (3 days SLA)</option>
                <option value="HIGH">High (24h SLA)</option>
                <option value="CRITICAL">Critical (4h SLA)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm">
                <option value="REACTIVE">Reactive</option>
                <option value="PREVENTIVE">Preventive</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => { setShowCreateModal(false); resetForm(); }}
              className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={isSubmitting || !title.trim()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {isSubmitting ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
