'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import {
  getTenant,
  updateTenant,
  updateTenantStatus,
  exportTenantSites,
  type TenantWithSitesCount,
} from '@/lib/api/tenants';
import { TenantStatus } from '@omniops/shared';

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const id = params.id as string;

  const [tenant, setTenant] = useState<TenantWithSitesCount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  const fetchTenant = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getTenant(id);
      setTenant(response.data ?? null);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load tenant', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  const handleEdit = () => {
    if (!tenant) return;
    setEditForm({
      name: tenant.name,
      legalName: tenant.legalName ?? '',
      email: tenant.email,
      phone: tenant.phone ?? '',
      subscriptionTier: tenant.subscriptionTier,
    });
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const data: Record<string, unknown> = {
        name: editForm.name,
        email: editForm.email,
        legalName: editForm.legalName || undefined,
        phone: editForm.phone || undefined,
        subscriptionTier: editForm.subscriptionTier,
      };
      await updateTenant(id, data);
      addToast('Tenant updated', 'success');
      setIsEditing(false);
      fetchTenant();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update tenant', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!tenant) return;
    const newStatus = tenant.status === TenantStatus.ACTIVE ? TenantStatus.SUSPENDED : TenantStatus.ACTIVE;
    setIsTogglingStatus(true);
    try {
      await updateTenantStatus(id, newStatus);
      addToast(`Tenant ${newStatus === TenantStatus.ACTIVE ? 'activated' : 'suspended'}`, 'success');
      fetchTenant();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Status update failed', 'error');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleExportSites = async () => {
    try {
      await exportTenantSites(id);
      addToast('Export downloaded', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Export failed', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-surface-500">Loading...</div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <p className="text-surface-500">Tenant not found.</p>
        <Link href="/admin/tenants" className="mt-4 text-brand-600 hover:underline">
          Back to Tenants
        </Link>
      </div>
    );
  }

  const sites = tenant.sites ?? [];
  const siteColumns: Column<{ id: string; name: string; slug: string; status: string; siteType: string; city?: string; goLiveDate?: string; createdAt: string }>[] = [
    { key: 'name', header: 'Site Name' },
    { key: 'slug', header: 'Slug' },
    {
      key: 'status',
      header: 'Status',
      render: (site) => <StatusBadge status={site.status} variant="status" />,
    },
    {
      key: 'siteType',
      header: 'Type',
      render: (site) => <StatusBadge status={site.siteType} variant="type" />,
    },
    {
      key: 'city',
      header: 'City',
      render: (site) => site.city ?? '—',
    },
    {
      key: 'goLiveDate',
      header: 'Go-Live',
      render: (site) => (site.goLiveDate ? new Date(site.goLiveDate).toLocaleDateString() : '—'),
    },
  ];

  const featureFlags = tenant.featureFlags ?? {};

  return (
    <div>
      {/* Back link */}
      <Link
        href="/admin/tenants"
        className="inline-flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 mb-4"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Tenants
      </Link>

      {/* Tenant Profile Card */}
      <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">{tenant.name}</h1>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">/{tenant.slug}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleEdit}
              className="rounded-lg border border-surface-300 dark:border-surface-600 px-3 py-1.5 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={handleStatusToggle}
              disabled={isTogglingStatus}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                tenant.status === TenantStatus.ACTIVE
                  ? 'border border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/30'
                  : 'border border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/30'
              }`}
            >
              {isTogglingStatus
                ? 'Updating...'
                : tenant.status === TenantStatus.ACTIVE
                  ? 'Suspend'
                  : 'Activate'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs text-surface-400 dark:text-surface-500 uppercase tracking-wider">Legal Name</p>
            <p className="text-sm text-surface-900 dark:text-surface-50">{tenant.legalName || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-surface-400 dark:text-surface-500 uppercase tracking-wider">Email</p>
            <p className="text-sm text-surface-900 dark:text-surface-50">{tenant.email}</p>
          </div>
          <div>
            <p className="text-xs text-surface-400 dark:text-surface-500 uppercase tracking-wider">Phone</p>
            <p className="text-sm text-surface-900 dark:text-surface-50">{tenant.phone || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-surface-400 dark:text-surface-500 uppercase tracking-wider">Created</p>
            <p className="text-sm text-surface-900 dark:text-surface-50">
              {new Date(tenant.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge status={tenant.subscriptionTier} variant="tier" />
          <StatusBadge status={tenant.status} variant="status" />
        </div>

        {/* Feature Flags */}
        {Object.keys(featureFlags).length > 0 && (
          <div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
            <p className="text-xs text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">Feature Flags</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(featureFlags).map(([key, enabled]) => (
                <span
                  key={key}
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    enabled
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-surface-100 text-surface-500 dark:bg-surface-700 dark:text-surface-400'
                  }`}
                >
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                  {enabled ? ' ✓' : ' ✗'}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sites Section */}
      <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
            Sites ({sites.length})
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportSites}
              className="rounded-lg border border-surface-300 dark:border-surface-600 px-3 py-1.5 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              Export CSV
            </button>
            <button
              onClick={() => router.push('/admin/sites')}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
            >
              Add Site
            </button>
          </div>
        </div>
        <DataTable
          columns={siteColumns}
          data={sites}
          keyExtractor={(site) => site.id}
          onRowClick={(site) => router.push(`/admin/sites/${site.id}`)}
          emptyState={
            <div className="text-center py-8">
              <p className="text-surface-500 dark:text-surface-400">No sites for this tenant yet.</p>
            </div>
          }
        />
      </div>

      {/* Edit Modal */}
      <Modal isOpen={isEditing} onClose={() => setIsEditing(false)} title="Edit Tenant">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Name</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Legal Name</label>
            <input
              type="text"
              value={editForm.legalName}
              onChange={(e) => setEditForm({ ...editForm, legalName: e.target.value })}
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Email</label>
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Phone</label>
            <input
              type="text"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Tier</label>
            <select
              value={editForm.subscriptionTier}
              onChange={(e) => setEditForm({ ...editForm, subscriptionTier: e.target.value })}
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
              onClick={() => setIsEditing(false)}
              className="rounded-lg border border-surface-300 dark:border-surface-600 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
