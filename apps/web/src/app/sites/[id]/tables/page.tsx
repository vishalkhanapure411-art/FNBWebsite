'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import {
  getTables,
  createTable,
  updateTable,
  deleteTable,
  updateTableStatus,
  type TableData,
} from '@/lib/api/tables';
import { getFloorPlans, type FloorPlanData } from '@/lib/api/floor-plans';
import { TableStatus } from '@omniops/shared';

const TABLE_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  OCCUPIED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  RESERVED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  DIRTY: 'bg-surface-200 text-surface-600 dark:bg-surface-600 dark:text-surface-300',
  OUT_OF_SERVICE: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

export default function TablesPage() {
  const params = useParams();
  const siteId = params.id as string;
  const { addToast } = useToast();

  const [tables, setTables] = useState<TableData[]>([]);
  const [floorPlans, setFloorPlans] = useState<FloorPlanData[]>([]);
  const [selectedFloorPlanId, setSelectedFloorPlanId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTable, setEditTable] = useState<TableData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create form
  const [createForm, setCreateForm] = useState({
    floorPlanId: '',
    number: '',
    section: '',
    capacity: 4,
  });

  // Edit form
  const [editForm, setEditForm] = useState({
    number: '',
    section: '',
    capacity: 4,
    status: TableStatus.AVAILABLE,
  });

  const fetchTables = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getTables({
        siteId,
        floorPlanId: selectedFloorPlanId || undefined,
      });
      setTables(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load tables', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [siteId, selectedFloorPlanId, addToast]);

  const fetchFloorPlans = useCallback(async () => {
    try {
      const res = await getFloorPlans(siteId);
      const plans = Array.isArray(res.data) ? res.data : [];
      setFloorPlans(plans);
      if (plans.length > 0 && !selectedFloorPlanId) {
        setSelectedFloorPlanId(plans[0]!.id);
        setCreateForm((f) => ({ ...f, floorPlanId: plans[0]!.id }));
      }
    } catch {
      // Silently fail
    }
  }, [siteId, selectedFloorPlanId]);

  useEffect(() => {
    fetchFloorPlans();
  }, [fetchFloorPlans]);

  useEffect(() => {
    if (selectedFloorPlanId || floorPlans.length === 0) {
      fetchTables();
    }
  }, [fetchTables, selectedFloorPlanId, floorPlans]);

  const handleCreate = async () => {
    if (!createForm.floorPlanId) {
      addToast('Please select a floor plan', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await createTable({
        floorPlanId: createForm.floorPlanId,
        siteId,
        number: createForm.number,
        section: createForm.section || undefined,
        capacity: createForm.capacity,
      });
      addToast('Table created', 'success');
      setShowCreateModal(false);
      setCreateForm({ floorPlanId: selectedFloorPlanId, number: '', section: '', capacity: 4 });
      fetchTables();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create table', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editTable) return;
    setIsSubmitting(true);
    try {
      await updateTable(editTable.id, {
        number: editForm.number,
        section: editForm.section || undefined,
        capacity: editForm.capacity,
        status: editForm.status,
      });
      addToast('Table updated', 'success');
      setShowEditModal(false);
      setEditTable(null);
      fetchTables();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update table', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this table?')) return;
    try {
      await deleteTable(id);
      addToast('Table deleted', 'success');
      fetchTables();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete table', 'error');
    }
  };

  const handleQuickStatus = async (table: TableData, newStatus: TableStatus) => {
    try {
      await updateTableStatus(table.id, newStatus);
      addToast(`Table ${table.number} marked as ${newStatus.replace(/_/g, ' ')}`, 'success');
      fetchTables();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update status', 'error');
    }
  };

  const openEditModal = (table: TableData) => {
    setEditTable(table);
    setEditForm({
      number: table.number,
      section: table.section ?? '',
      capacity: table.capacity,
      status: table.status,
    });
    setShowEditModal(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50">Tables</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">Table and floor plan management</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
        >
          Add Table
        </button>
      </div>

      {/* Floor Plan Selector */}
      {floorPlans.length > 1 && (
        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Floor Plan:</label>
          <select
            value={selectedFloorPlanId}
            onChange={(e) => {
              setSelectedFloorPlanId(e.target.value);
              setCreateForm((f) => ({ ...f, floorPlanId: e.target.value }));
            }}
            className="rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {floorPlans.map((fp) => (
              <option key={fp.id} value={fp.id}>{fp.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Table Grid */}
      {isLoading ? (
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-8 text-center">
          <div className="text-surface-500">Loading tables...</div>
        </div>
      ) : tables.length === 0 ? (
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-12 text-center">
          <div className="text-4xl mb-3">🪑</div>
          <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-1">No tables found</h3>
          <p className="text-surface-500 dark:text-surface-400">Add a table to this floor plan to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {tables.map((table) => (
            <div
              key={table.id}
              className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openEditModal(table)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold text-surface-900 dark:text-surface-50">{table.number}</span>
                <StatusBadge status={table.status} variant="status" />
              </div>
              <div className="space-y-1 text-xs text-surface-500 dark:text-surface-400">
                {table.section && <p>Section: {table.section}</p>}
                <p>Capacity: {table.capacity}</p>
                {table.floorPlan && <p>Floor: {table.floorPlan.name}</p>}
              </div>
              {/* Quick Status Actions */}
              <div className="mt-3 flex flex-wrap gap-1">
                {table.status !== TableStatus.AVAILABLE && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickStatus(table, TableStatus.AVAILABLE);
                    }}
                    className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
                  >
                    Available
                  </button>
                )}
                {table.status !== TableStatus.OCCUPIED && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickStatus(table, TableStatus.OCCUPIED);
                    }}
                    className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                  >
                    Occupy
                  </button>
                )}
                {table.status !== TableStatus.DIRTY && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickStatus(table, TableStatus.DIRTY);
                    }}
                    className="text-xs px-2 py-0.5 rounded bg-surface-200 text-surface-600 hover:bg-surface-300 dark:bg-surface-600 dark:text-surface-300"
                  >
                    Dirty
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(table.id);
                  }}
                  className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 ml-auto"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Table Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Add Table">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
          className="space-y-4"
        >
          {floorPlans.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Floor Plan</label>
              <select
                value={createForm.floorPlanId}
                onChange={(e) => setCreateForm({ ...createForm, floorPlanId: e.target.value })}
                className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {floorPlans.map((fp) => (
                  <option key={fp.id} value={fp.id}>{fp.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Table Number *</label>
            <input
              type="text"
              required
              value={createForm.number}
              onChange={(e) => setCreateForm({ ...createForm, number: e.target.value })}
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. A1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Section</label>
            <input
              type="text"
              value={createForm.section}
              onChange={(e) => setCreateForm({ ...createForm, section: e.target.value })}
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. Patio"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Capacity</label>
            <input
              type="number"
              min="1"
              value={createForm.capacity}
              onChange={(e) => setCreateForm({ ...createForm, capacity: parseInt(e.target.value) || 4 })}
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
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
              disabled={isSubmitting}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Add Table'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Table Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title={`Edit Table ${editTable?.number ?? ''}`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleEdit();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Table Number</label>
            <input
              type="text"
              value={editForm.number}
              onChange={(e) => setEditForm({ ...editForm, number: e.target.value })}
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Section</label>
            <input
              type="text"
              value={editForm.section}
              onChange={(e) => setEditForm({ ...editForm, section: e.target.value })}
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Capacity</label>
            <input
              type="number"
              min="1"
              value={editForm.capacity}
              onChange={(e) => setEditForm({ ...editForm, capacity: parseInt(e.target.value) || 4 })}
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Status</label>
            <select
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value as TableStatus })}
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="AVAILABLE">Available</option>
              <option value="OCCUPIED">Occupied</option>
              <option value="RESERVED">Reserved</option>
              <option value="DIRTY">Dirty</option>
              <option value="OUT_OF_SERVICE">Out of Service</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-200 dark:border-surface-700">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="rounded-lg border border-surface-300 dark:border-surface-600 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
