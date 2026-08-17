'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import {
  getVendors,
  createVendor,
  updateVendor,
  type VendorData,
} from '@/lib/api/maintenance';

const VENDOR_CATEGORIES = [
  'HVAC', 'PLUMBING', 'ELECTRICAL', 'GENERAL', 'APPLIANCE', 'PEST_CONTROL',
];

export default function VendorsPage() {
  const params = useParams();
  const siteId = params.id as string;
  const { addToast } = useToast();

  const [vendors, setVendors] = useState<VendorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [rating, setRating] = useState(0);

  const fetchVendors = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getVendors(categoryFilter || undefined);
      setVendors(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load vendors', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, addToast]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const openAdd = () => {
    setEditingVendor(null);
    setName(''); setCategory('GENERAL'); setContactName(''); setEmail(''); setPhone(''); setRating(0);
    setShowAddModal(true);
  };

  const openEdit = (v: VendorData) => {
    setEditingVendor(v);
    setName(v.name); setCategory(v.category); setContactName(v.contactName ?? '');
    setEmail(v.email ?? ''); setPhone(v.phone ?? ''); setRating(v.rating ?? 0);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const body = {
        name: name.trim(),
        category,
        contactName: contactName || undefined,
        email: email || undefined,
        phone: phone || undefined,
        rating: rating || undefined,
      };
      if (editingVendor) {
        await updateVendor(editingVendor.id, body);
        addToast('Vendor updated', 'success');
      } else {
        await createVendor(body);
        addToast('Vendor created', 'success');
      }
      setShowAddModal(false);
      fetchVendors();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save vendor', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (r: number) => {
    return '⭐'.repeat(Math.max(0, Math.min(5, r))) + '☆'.repeat(Math.max(0, 5 - Math.min(5, r)));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50">Vendors</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">Service provider directory</p>
        </div>
        <button onClick={openAdd}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors">
          Add Vendor
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm">
          <option value="">All Categories</option>
          {VENDOR_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center"><p className="text-surface-500">Loading...</p></div>
      ) : vendors.length === 0 ? (
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-12 text-center">
          <div className="text-4xl mb-3">🏢</div>
          <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-1">No vendors found</h3>
          <p className="text-surface-500 dark:text-surface-400">Add your first service vendor.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {vendors.map((v) => (
            <div key={v.id} className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-surface-900 dark:text-surface-50">{v.name}</h3>
                  <StatusBadge status={v.category} variant="type" className="mt-1" />
                </div>
                {!v.isActive && (
                  <span className="text-xs text-red-500 font-medium">Inactive</span>
                )}
              </div>
              {v.contactName && <p className="text-sm text-surface-600 dark:text-surface-400">{v.contactName}</p>}
              {v.email && <p className="text-sm text-surface-500 truncate">{v.email}</p>}
              {v.phone && <p className="text-sm text-surface-500">{v.phone}</p>}
              <div className="mt-2 text-sm">{renderStars(v.rating ?? 0)}</div>
              <button onClick={() => openEdit(v)}
                className="mt-4 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm font-medium hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
                Edit
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={editingVendor ? 'Edit Vendor' : 'Add Vendor'} size="lg">
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm">
                {VENDOR_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact Name</label>
              <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Rating (1-5)</label>
              <select value={rating} onChange={(e) => setRating(parseInt(e.target.value))}
                className="w-full rounded-lg border px-3 py-2 text-sm">
                <option value={0}>Not rated</option>
                {[1, 2, 3, 4, 5].map((r) => (
                  <option key={r} value={r}>{'⭐'.repeat(r)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setShowAddModal(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={isSubmitting || !name.trim()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {isSubmitting ? 'Saving...' : editingVendor ? 'Update Vendor' : 'Add Vendor'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
