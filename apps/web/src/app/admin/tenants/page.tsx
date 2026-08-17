'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import {
  getTenants,
  createTenant,
  bulkOnboardTenants,
  exportTenants,
  type TenantQueryParams,
  type TenantWithSitesCount,
} from '@/lib/api/tenants';
import { SubscriptionTier } from '@omniops/shared';

export default function TenantsPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [tenants, setTenants] = useState<TenantWithSitesCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    email: '',
    legalName: '',
    phone: '',
    subscriptionTier: SubscriptionTier.STARTER,
  });

  const fetchTenants = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: TenantQueryParams = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const response = await getTenants(params);
      setTenants(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load tenants', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, addToast]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await createTenant(formData);
      addToast('Tenant created successfully', 'success');
      setShowCreateModal(false);
      setFormData({ name: '', slug: '', email: '', legalName: '', phone: '', subscriptionTier: SubscriptionTier.STARTER });
      fetchTenants();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create tenant', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await bulkOnboardTenants(file);
      addToast(`Import complete: ${result.data?.created ?? 0} created`, 'success');
      if (result.data?.errors?.length) {
        addToast(`${result.data.errors.length} errors during import`, 'warning');
      }
      fetchTenants();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Bulk import failed', 'error');
    }
    e.target.value = '';
  };

  const handleExport = async () => {
    try {
      await exportTenants();
      addToast('Export downloaded', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Export failed', 'error');
    }
  };

  const columns: Column<TenantWithSitesCount>[] = [
    { key: 'name', header: 'Name' },
    { key: 'slug', header: 'Slug' },
    {
      key: 'subscriptionTier',
      header: 'Tier',
      render: (item) => <StatusBadge status={item.subscriptionTier} variant="tier" />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <StatusBadge status={item.status} variant="status" />,
    },
    {
      key: 'sites',
      header: 'Sites',
      render: (item) => (
        <span className="font-medium">{item._count?.sites ?? item.sites?.length ?? 0}</span>
      ),
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
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50">Tenants</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">
            Manage all brands on the platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
          >
            New Tenant
          </button>
          <label className="cursor-pointer rounded-lg border border-surface-300 dark:border-surface-600 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
            Bulk Import
            <input type="file" accept=".csv" onChange={handleBulkImport} className="hidden" />
          </label>
          <button
            onClick={handleExport}
            className="rounded-lg border border-surface-300 dark:border-surface-600 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search tenants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 w-64"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="DELETED">Deleted</option>
        </select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={tenants}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        onRowClick={(item) => router.push(`/admin/tenants/${item.id}`)}
        emptyState={
          <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-12 text-center">
            <div className="text-4xl mb-3">🏢</div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-1">No tenants found</h3>
            <p className="text-surface-500 dark:text-surface-400">
              Create your first tenant to get started.
            </p>
          </div>
        }
      />

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Tenant">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Slug *</label>
            <input
              type="text"
              required
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Legal Name</label>
              <input
                type="text"
                value={formData.legalName}
                onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Tier</label>
            <select
              value={formData.subscriptionTier}
              onChange={(e) => setFormData({ ...formData, subscriptionTier: e.target.value as SubscriptionTier })}
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="FREE">Free</option>
              <option value="STARTER">Starter</option>
              <option value="PROFESSIONAL">Professional</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-200 dark:border-surface-700">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="rounded-lg border border-surface-300 dark:border-surface-600 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {isCreating ? 'Creating...' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
