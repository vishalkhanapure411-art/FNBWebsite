'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { getSite, updateSite, updateSiteStatus, type SiteWithTenant } from '@/lib/api/sites';
import { SiteStatus } from '@omniops/shared';

const STATUS_FLOW: SiteStatus[] = [
  SiteStatus.DRAFT,
  SiteStatus.ONBOARDING,
  SiteStatus.LIVE,
];

const STATUS_FLOW_EXTENDED: SiteStatus[] = [
  SiteStatus.DRAFT,
  SiteStatus.ONBOARDING,
  SiteStatus.LIVE,
  SiteStatus.SUSPENDED,
  SiteStatus.CLOSED,
];

export default function SiteDetailPage() {
  const params = useParams();
  const { addToast } = useToast();
  const id = params.id as string;

  const [site, setSite] = useState<SiteWithTenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showGoLiveConfirm, setShowGoLiveConfirm] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const fetchSite = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getSite(id);
      setSite(response.data ?? null);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load site', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    fetchSite();
  }, [fetchSite]);

  const handleStatusChange = async (newStatus: SiteStatus) => {
    setIsUpdatingStatus(true);
    setShowStatusMenu(false);
    setShowGoLiveConfirm(false);
    try {
      await updateSiteStatus(id, newStatus);
      addToast(`Site status updated to ${newStatus.replace(/_/g, ' ')}`, 'success');
      fetchSite();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Status update failed', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleEdit = () => {
    if (!site) return;
    setEditForm({
      name: site.name,
      email: site.email ?? '',
      phone: site.phone ?? '',
      timezone: site.timezone,
      legalEntity: site.legalEntity ?? '',
    });
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSite(id, {
        name: editForm.name,
        email: editForm.email || undefined,
        phone: editForm.phone || undefined,
        timezone: editForm.timezone,
        legalEntity: editForm.legalEntity || undefined,
      });
      addToast('Site updated', 'success');
      setIsEditing(false);
      fetchSite();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update site', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-surface-500">Loading...</div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <p className="text-surface-500">Site not found.</p>
        <Link href="/admin/sites" className="mt-4 text-brand-600 hover:underline">
          Back to Sites
        </Link>
      </div>
    );
  }

  const currentStatusIdx = STATUS_FLOW_EXTENDED.indexOf(site.status);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-4">
        <Link href="/admin/sites" className="text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200">
          Sites
        </Link>
        <span className="text-surface-400">/</span>
        {site.tenant && (
          <>
            <Link href={`/admin/tenants/${site.tenant.id}`} className="text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200">
              {site.tenant.name}
            </Link>
            <span className="text-surface-400">/</span>
          </>
        )}
        <span className="text-surface-900 dark:text-surface-50 font-medium">{site.name}</span>
      </div>

      {/* Site Profile */}
      <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">{site.name}</h1>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">/{site.slug}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleEdit}
              className="rounded-lg border border-surface-300 dark:border-surface-600 px-3 py-1.5 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              Edit
            </button>

            {/* Status Change Menu */}
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                disabled={isUpdatingStatus}
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {isUpdatingStatus ? 'Updating...' : 'Change Status'}
              </button>
              {showStatusMenu && (
                <div className="absolute right-0 mt-1 w-48 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 shadow-lg z-10 py-1">
                  {STATUS_FLOW_EXTENDED.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors ${
                        s === site.status
                          ? 'text-brand-600 dark:text-brand-400 font-medium'
                          : 'text-surface-700 dark:text-surface-300'
                      }`}
                    >
                      {s.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Stepper */}
        <div className="mb-6">
          <p className="text-xs text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-3">Status Progression</p>
          <div className="flex items-center">
            {STATUS_FLOW.map((step, idx) => {
              const stepIdx = STATUS_FLOW_EXTENDED.indexOf(step);
              const isCompleted = currentStatusIdx > stepIdx;
              const isCurrent = site.status === step;
              const isUpcoming = currentStatusIdx < stepIdx;

              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        isCompleted
                          ? 'bg-emerald-500 text-white'
                          : isCurrent
                            ? 'bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-brand-900'
                            : isUpcoming
                              ? 'bg-surface-200 text-surface-500 dark:bg-surface-700 dark:text-surface-400'
                              : 'bg-surface-200 text-surface-500 dark:bg-surface-700 dark:text-surface-400'
                      }`}
                    >
                      {isCompleted ? '✓' : idx + 1}
                    </div>
                    <span
                      className={`mt-1 text-xs ${
                        isCurrent
                          ? 'text-brand-600 dark:text-brand-400 font-medium'
                          : 'text-surface-500 dark:text-surface-400'
                      }`}
                    >
                      {step.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {idx < STATUS_FLOW.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${
                        isCompleted ? 'bg-emerald-500' : 'bg-surface-200 dark:bg-surface-700'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Go-Live CTA */}
        {site.status === SiteStatus.ONBOARDING && (
          <div className="mb-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Ready for go-live?</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                  This will transition the site from ONBOARDING → LIVE and set the go-live date.
                </p>
              </div>
              <button
                onClick={() => setShowGoLiveConfirm(true)}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
              >
                Request Go-Live
              </button>
            </div>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs text-surface-400 dark:text-surface-500 uppercase tracking-wider">Tenant</p>
            <p className="text-sm text-surface-900 dark:text-surface-50">
              {site.tenant ? (
                <Link href={`/admin/tenants/${site.tenant.id}`} className="text-brand-600 hover:underline">
                  {site.tenant.name}
                </Link>
              ) : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-surface-400 dark:text-surface-500 uppercase tracking-wider">Type</p>
            <StatusBadge status={site.siteType} variant="type" />
          </div>
          <div>
            <p className="text-xs text-surface-400 dark:text-surface-500 uppercase tracking-wider">Status</p>
            <StatusBadge status={site.status} variant="status" />
          </div>
          <div>
            <p className="text-xs text-surface-400 dark:text-surface-500 uppercase tracking-wider">Timezone</p>
            <p className="text-sm text-surface-900 dark:text-surface-50">{site.timezone}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs text-surface-400 dark:text-surface-500 uppercase tracking-wider">Email</p>
            <p className="text-sm text-surface-900 dark:text-surface-50">{site.email || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-surface-400 dark:text-surface-500 uppercase tracking-wider">Phone</p>
            <p className="text-sm text-surface-900 dark:text-surface-50">{site.phone || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-surface-400 dark:text-surface-500 uppercase tracking-wider">Legal Entity</p>
            <p className="text-sm text-surface-900 dark:text-surface-50">{site.legalEntity || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-surface-400 dark:text-surface-500 uppercase tracking-wider">Go-Live Date</p>
            <p className="text-sm text-surface-900 dark:text-surface-50">
              {site.goLiveDate ? new Date(site.goLiveDate).toLocaleDateString() : '—'}
            </p>
          </div>
        </div>

        {/* Address */}
        {site.address && (
          <div className="pt-4 border-t border-surface-200 dark:border-surface-700">
            <p className="text-xs text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-1">Address</p>
            <p className="text-sm text-surface-900 dark:text-surface-50">
              {[site.address.line1, site.address.line2, site.address.city, site.address.state, site.address.zip, site.address.country]
                .filter(Boolean)
                .join(', ')}
            </p>
          </div>
        )}

        {/* Cuisine */}
        {site.cuisine && site.cuisine.length > 0 && (
          <div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
            <p className="text-xs text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">Cuisine</p>
            <div className="flex flex-wrap gap-2">
              {site.cuisine.map((c) => (
                <span key={c} className="inline-flex items-center rounded-full bg-surface-100 dark:bg-surface-700 px-2.5 py-0.5 text-xs font-medium text-surface-700 dark:text-surface-300">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Go-Live Confirmation Modal */}
      <Modal isOpen={showGoLiveConfirm} onClose={() => setShowGoLiveConfirm(false)} title="Confirm Go-Live">
        <div className="space-y-4">
          <p className="text-sm text-surface-700 dark:text-surface-300">
            Are you sure you want to transition <strong>{site.name}</strong> from ONBOARDING to LIVE?
          </p>
          <p className="text-sm text-surface-500 dark:text-surface-400">
            This will set the go-live date to today and make the site fully operational.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-200 dark:border-surface-700">
            <button
              onClick={() => setShowGoLiveConfirm(false)}
              className="rounded-lg border border-surface-300 dark:border-surface-600 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleStatusChange(SiteStatus.LIVE)}
              disabled={isUpdatingStatus}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {isUpdatingStatus ? 'Updating...' : 'Confirm Go-Live'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditing} onClose={() => setIsEditing(false)} title="Edit Site">
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
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Timezone</label>
            <input
              type="text"
              value={editForm.timezone}
              onChange={(e) => setEditForm({ ...editForm, timezone: e.target.value })}
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Legal Entity</label>
            <input
              type="text"
              value={editForm.legalEntity}
              onChange={(e) => setEditForm({ ...editForm, legalEntity: e.target.value })}
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
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
