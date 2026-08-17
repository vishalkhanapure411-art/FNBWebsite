'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import {
  getAssets,
  createAsset,
  updateAssetStatus,
  type AssetData,
} from '@/lib/api/maintenance';

const ASSET_CATEGORIES = [
  'HVAC', 'REFRIGERATION', 'KITCHEN_EQUIP', 'PLUMBING_ELECTRICAL',
  'FURNITURE', 'VEHICLE', 'OTHER',
];

export default function AssetsPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.id as string;
  const { addToast } = useToast();

  const [assets, setAssets] = useState<AssetData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('KITCHEN_EQUIP');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getAssets({
        siteId,
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
      });
      setAssets(res.data ?? []);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load assets', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [siteId, categoryFilter, statusFilter, addToast]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await createAsset({
        siteId,
        name: name.trim(),
        category,
        model: model || undefined,
        serialNumber: serialNumber || undefined,
        manufacturer: manufacturer || undefined,
        location: location || undefined,
        notes: notes || undefined,
      });
      addToast('Asset created', 'success');
      setShowAddModal(false);
      resetForm();
      fetchAssets();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create asset', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (assetId: string, newStatus: string) => {
    try {
      await updateAssetStatus(assetId, newStatus);
      addToast('Status updated', 'success');
      fetchAssets();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update status', 'error');
    }
  };

  const resetForm = () => {
    setName('');
    setCategory('KITCHEN_EQUIP');
    setModel('');
    setSerialNumber('');
    setManufacturer('');
    setLocation('');
    setNotes('');
  };

  const columns: Column<AssetData>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (item) => (
        <span className="font-medium text-surface-900 dark:text-surface-50">{item.name}</span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (item) => (
        <StatusBadge status={item.category} variant="type" />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => (
        <select
          value={item.status}
          onChange={(e) => handleStatusChange(item.id, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-2 py-0.5 text-xs"
        >
          <option value="OPERATIONAL">Operational</option>
          <option value="NEEDS_REPAIR">Needs Repair</option>
          <option value="UNDER_MAINTENANCE">Under Maintenance</option>
          <option value="DECOMMISSIONED">Decommissioned</option>
        </select>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (item) => item.location ?? '—',
    },
    {
      key: 'schedules',
      header: 'Next Maintenance',
      render: (item) => {
        const schedules = item.schedules ?? [];
        if (schedules.length === 0) return '—';
        const next = schedules[0]!;
        return (
          <span className="text-xs">
            {next.title}: {new Date(next.nextDueAt).toLocaleDateString()}
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50">Assets</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">Equipment and asset registry</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
        >
          Add Asset
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Categories</option>
          {ASSET_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Statuses</option>
          <option value="OPERATIONAL">Operational</option>
          <option value="NEEDS_REPAIR">Needs Repair</option>
          <option value="UNDER_MAINTENANCE">Under Maintenance</option>
          <option value="DECOMMISSIONED">Decommissioned</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={assets}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        onRowClick={(item) => router.push(`/sites/${siteId}/maintenance/assets/${item.id}`)}
        emptyState={
          <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-12 text-center">
            <div className="text-4xl mb-3">🔧</div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-1">No assets found</h3>
            <p className="text-surface-500 dark:text-surface-400">Add your first asset to get started.</p>
          </div>
        }
      />

      {/* Add Asset Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); resetForm(); }} title="Add Asset" size="lg">
        <form
          onSubmit={(e) => { e.preventDefault(); handleCreate(); }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Name *</label>
              <input
                type="text" value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
                placeholder="e.g. Walk-in Freezer #2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
              >
                {ASSET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Model</label>
              <input
                type="text" value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Serial Number</label>
              <input
                type="text" value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Manufacturer</label>
              <input
                type="text" value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Location</label>
              <input
                type="text" value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
                placeholder="e.g. Kitchen - Back Wall"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-200 dark:border-surface-700">
            <button type="button" onClick={() => { setShowAddModal(false); resetForm(); }}
              className="rounded-lg border px-4 py-2 text-sm font-medium">Cancel</button>
            <button type="submit" disabled={isSubmitting || !name.trim()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {isSubmitting ? 'Creating...' : 'Create Asset'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
