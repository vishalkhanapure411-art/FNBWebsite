'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import {
  getSites,
  createSite,
  bulkOnboardSites,
  exportSites,
  type SiteQueryParams,
  type SiteWithTenant,
} from '@/lib/api/sites';
import { getTenants, type TenantWithSitesCount } from '@/lib/api/tenants';
import { SiteType } from '@omniops/shared';

export default function SitesPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [sites, setSites] = useState<SiteWithTenant[]>([]);
  const [tenants, setTenants] = useState<TenantWithSitesCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    tenantId: '',
    name: '',
    slug: '',
    siteType: SiteType.RESTAURANT,
    timezone: 'UTC',
    email: '',
    phone: '',
  });

  const fetchSites = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: SiteQueryParams = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.siteType = typeFilter;
      if (tenantFilter) params.tenantId = tenantFilter;
      const response = await getSites(params);
      setSites(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load sites', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, typeFilter, tenantFilter, addToast]);

  const fetchTenants = useCallback(async () => {
    try {
      const response = await getTenants({ limit: 200 });
      setTenants(Array.isArray(response.data) ? response.data : []);
    } catch {
      // Silently fail — tenant filter is optional
    }
  }, []);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tenantId) {
      addToast('Please select a tenant', 'error');
      return;
    }
    setIsCreating(true);
    try {
      await createSite({
        tenantId: formData.tenantId,
        name: formData.name,
        slug: formData.slug,
        siteType: formData.siteType,
        timezone: formData.timezone,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
      });
      addToast('Site created successfully', 'success');
      setShowCreateModal(false);
      setFormData({ tenantId: '', name: '', slug: '', siteType: SiteType.RESTAURANT, timezone: 'UTC', email: '', phone: '' });
      fetchSites();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create site', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await bulkOnboardSites(file);
      addToast(`Import complete: ${result.data?.created ?? 0} created`, 'success');
      if (result.data?.errors?.length) {
        addToast(`${result.data.errors.length} errors during import`, 'warning');
      }
      fetchSites();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Bulk import failed', 'error');
    }
    e.target.value = '';
  };

  const handleExport = async () => {
    try {
      const params: SiteQueryParams = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.siteType = typeFilter;
      if (tenantFilter) params.tenantId = tenantFilter;
      await exportSites(params);
      addToast('Export downloaded', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Export failed', 'error');
    }
  };

  const columns: Column<SiteWithTenant>[] = [
    { key: 'name', header: 'Name' },
    {
      key: 'tenant',
      header: 'Tenant',
      render: (item) => item.tenant?.name ?? '—',
    },
    {
      key: 'siteType',
      header: 'Type',
      render: (item) => <StatusBadge status={item.siteType} variant="type" />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <StatusBadge status={item.status} variant="status" />,
    },
    {
      key: 'city',
      header: 'City',
      render: (item) => item.address?.city ?? '—',
    },
    {
      key: 'goLiveDate',
      header: 'Go-Live',
      render: (item) => (item.goLiveDate ? new Date(item.goLiveDate).toLocaleDateString() : '—'),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50">Sites</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">
            Manage all restaurant locations across tenants
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
          >
            New Site
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
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search sites..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 w-64"
        />
        <select
          value={tenantFilter}
          onChange={(e) => setTenantFilter(e.target.value)}
          className="rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Tenants</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="ONBOARDING">Onboarding</option>
          <option value="LIVE">Live</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Types</option>
          <option value="RESTAURANT">Restaurant</option>
          <option value="LOUNGE">Lounge</option>
          <option value="CLOUD_KITCHEN">Cloud Kitchen</option>
          <option value="QSR">QSR</option>
          <option value="CAFE">Cafe</option>
          <option value="BAR">Bar</option>
        </select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={sites}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        onRowClick={(item) => router.push(`/admin/sites/${item.id}`)}
        emptyState={
          <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-12 text-center">
            <div className="text-4xl mb-3">🏢</div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-1">No sites found</h3>
            <p className="text-surface-500 dark:text-surface-400">
              Create your first site to get started.
            </p>
          </div>
        }
      />

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Site">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Tenant *</label>
            <select
              required
              value={formData.tenantId}
              onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select a tenant...</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Type</label>
              <select
                value={formData.siteType}
                onChange={(e) => setFormData({ ...formData, siteType: e.target.value as SiteType })}
                className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="RESTAURANT">Restaurant</option>
                <option value="LOUNGE">Lounge</option>
                <option value="CLOUD_KITCHEN">Cloud Kitchen</option>
                <option value="QSR">QSR</option>
                <option value="CAFE">Cafe</option>
                <option value="BAR">Bar</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Timezone</label>
              <input
                type="text"
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
              {isCreating ? 'Creating...' : 'Create Site'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
