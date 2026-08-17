'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import {
  getTemplate,
  updateTemplate,
  deleteTemplate,
  createSection,
  updateSection,
  deleteSection,
  createItem,
  updateItem,
  deleteItem,
  type AuditTemplateDetail,
  type AuditSection,
  type AuditItem,
} from '@/lib/api/quality';

const ITEM_TYPES = ['PASS_FAIL', 'SCORE_1_5', 'TEMPERATURE', 'PHOTO_REQUIRED', 'YES_NO'];

const inputCls =
  'w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm';

export default function TemplateBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;
  const { addToast } = useToast();

  const [template, setTemplate] = useState<AuditTemplateDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // section modal state
  const [sectionModal, setSectionModal] = useState<{ open: boolean; editing: AuditSection | null; title: string; description: string }>({
    open: false,
    editing: null,
    title: '',
    description: '',
  });
  // item modal state
  const [itemModal, setItemModal] = useState<{
    open: boolean;
    sectionId: string;
    editing: AuditItem | null;
    question: string;
    description: string;
    itemType: string;
    required: boolean;
  }>({ open: false, sectionId: '', editing: null, question: '', description: '', itemType: 'PASS_FAIL', required: true });

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getTemplate(templateId);
      setTemplate(res.data);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load template', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [templateId, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const sortedSections = (t: AuditTemplateDetail) =>
    [...t.sections].sort((a, b) => a.sortOrder - b.sortOrder);

  // ─── template ops ───
  const handleRename = async (name: string) => {
    if (!template || !name.trim()) return;
    try {
      await updateTemplate(template.id, { name: name.trim() });
      addToast('Template updated', 'success');
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Update failed', 'error');
    }
  };

  const handleDelete = async () => {
    if (!template) return;
    if (!window.confirm('Deactivate this template? It will no longer be available for new audits.')) return;
    try {
      await deleteTemplate(template.id);
      addToast('Template deactivated', 'success');
      router.push('/admin/quality/templates');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  };

  // ─── section ops ───
  const openAddSection = () => setSectionModal({ open: true, editing: null, title: '', description: '' });
  const openEditSection = (s: AuditSection) =>
    setSectionModal({ open: true, editing: s, title: s.title, description: s.description ?? '' });

  const saveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionModal.title.trim()) return;
    setIsSubmitting(true);
    try {
      if (sectionModal.editing) {
        await updateSection(sectionModal.editing.id, { title: sectionModal.title.trim(), description: sectionModal.description || undefined });
        addToast('Section updated', 'success');
      } else {
        await createSection(templateId, { title: sectionModal.title.trim(), description: sectionModal.description || undefined });
        addToast('Section added', 'success');
      }
      setSectionModal({ open: false, editing: null, title: '', description: '' });
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSection = async (s: AuditSection) => {
    if (!window.confirm(`Delete section "${s.title}" and all its items?`)) return;
    try {
      await deleteSection(s.id);
      addToast('Section deleted', 'success');
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  };

  const moveSection = async (index: number, dir: -1 | 1) => {
    if (!template) return;
    const sections = sortedSections(template);
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    const a = sections[index]!;
    const b = sections[target]!;
    try {
      await Promise.all([
        updateSection(a.id, { sortOrder: b.sortOrder }),
        updateSection(b.id, { sortOrder: a.sortOrder }),
      ]);
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Reorder failed', 'error');
    }
  };

  // ─── item ops ───
  const openAddItem = (sectionId: string) =>
    setItemModal({ open: true, sectionId, editing: null, question: '', description: '', itemType: 'PASS_FAIL', required: true });
  const openEditItem = (sectionId: string, item: AuditItem) =>
    setItemModal({
      open: true,
      sectionId,
      editing: item,
      question: item.question,
      description: item.description ?? '',
      itemType: item.itemType,
      required: item.required,
    });

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemModal.question.trim()) return;
    setIsSubmitting(true);
    try {
      if (itemModal.editing) {
        await updateItem(itemModal.editing.id, {
          question: itemModal.question.trim(),
          description: itemModal.description || undefined,
          itemType: itemModal.itemType,
          required: itemModal.required,
        });
        addToast('Item updated', 'success');
      } else {
        await createItem(itemModal.sectionId, {
          question: itemModal.question.trim(),
          description: itemModal.description || undefined,
          itemType: itemModal.itemType,
          required: itemModal.required,
        });
        addToast('Item added', 'success');
      }
      setItemModal({ open: false, sectionId: '', editing: null, question: '', description: '', itemType: 'PASS_FAIL', required: true });
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (item: AuditItem) => {
    if (!window.confirm(`Delete item "${item.question}"?`)) return;
    try {
      await deleteItem(item.id);
      addToast('Item deleted', 'success');
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  };

  const moveItem = async (section: AuditSection, index: number, dir: -1 | 1) => {
    const items = [...section.items].sort((a, b) => a.sortOrder - b.sortOrder);
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const a = items[index]!;
    const b = items[target]!;
    try {
      await Promise.all([
        updateItem(a.id, { sortOrder: b.sortOrder }),
        updateItem(b.id, { sortOrder: a.sortOrder }),
      ]);
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Reorder failed', 'error');
    }
  };

  if (isLoading) {
    return <div className="text-surface-500 py-16 text-center">Loading template…</div>;
  }
  if (!template) {
    return <div className="text-surface-500 py-16 text-center">Template not found.</div>;
  }

  const sections = sortedSections(template);

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1 min-w-0">
          <input
            className="text-3xl font-bold bg-transparent border-b border-transparent hover:border-surface-300 focus:border-brand-600 focus:outline-none w-full"
            defaultValue={template.name}
            onBlur={(e) => e.target.value !== template.name && handleRename(e.target.value)}
          />
          <p className="text-sm text-surface-500 mt-1">
            Category: <span className="font-medium text-surface-700 dark:text-surface-300">{template.category.replace(/_/g, ' ')}</span>
            {' · '}
            {sections.length} sections · {sections.reduce((acc, s) => acc + s.items.length, 0)} items
          </p>
        </div>
        <button
          onClick={handleDelete}
          className="shrink-0 ml-4 rounded-lg border border-red-200 text-red-600 dark:border-red-900 dark:text-red-400 px-3 py-1.5 text-sm hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          Deactivate
        </button>
      </div>

      {!sections.length ? (
        <div className="rounded-xl border border-dashed p-16 text-center text-surface-500">
          <p className="text-4xl mb-3">📂</p>
          <p className="font-medium">No sections yet</p>
          <p className="text-sm mt-1 mb-4">Add a section to start building your audit checklist</p>
          <button onClick={openAddSection} className="rounded-lg bg-brand-600 px-4 py-2 text-white text-sm">
            + Add Section
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={openAddSection} className="rounded-lg bg-brand-600 px-4 py-2 text-white text-sm font-medium hover:bg-brand-700">
              + Add Section
            </button>
          </div>
          {sections.map((section, si) => {
            const items = [...section.items].sort((a, b) => a.sortOrder - b.sortOrder);
            const isOpen = expanded[section.id] ?? si === 0;
            return (
              <div key={section.id} className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3">
                  <button
                    onClick={() => setExpanded((p) => ({ ...p, [section.id]: !isOpen }))}
                    className="flex-1 flex items-center gap-3 text-left"
                  >
                    <span className="text-surface-400">{isOpen ? '▾' : '▸'}</span>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{section.title}</p>
                      {section.description && <p className="text-xs text-surface-500 truncate">{section.description}</p>}
                    </div>
                    <span className="ml-auto text-xs text-surface-500 shrink-0">{items.length} items</span>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => moveSection(si, -1)} disabled={si === 0} className="px-1.5 py-1 text-surface-400 hover:text-surface-700 disabled:opacity-30 text-sm" title="Move up">↑</button>
                    <button onClick={() => moveSection(si, 1)} disabled={si === sections.length - 1} className="px-1.5 py-1 text-surface-400 hover:text-surface-700 disabled:opacity-30 text-sm" title="Move down">↓</button>
                    <button onClick={() => openEditSection(section)} className="px-1.5 py-1 text-surface-400 hover:text-brand-600 text-sm" title="Edit">✎</button>
                    <button onClick={() => handleDeleteSection(section)} className="px-1.5 py-1 text-surface-400 hover:text-red-600 text-sm" title="Delete">🗑</button>
                  </div>
                </div>
                {isOpen && (
                  <div className="border-t border-surface-100 dark:border-surface-700">
                    {!items.length ? (
                      <div className="px-4 py-6 text-center text-sm text-surface-500">No items in this section</div>
                    ) : (
                      items.map((item, ii) => (
                        <div key={item.id} className="flex items-center gap-2 px-4 py-2.5 border-b border-surface-100 dark:border-surface-700 last:border-b-0">
                          <span className="w-6 text-xs text-surface-400">{ii + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{item.question}</p>
                            <div className="flex gap-2 mt-0.5">
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-surface-100 text-surface-500 dark:bg-surface-700 dark:text-surface-400">
                                {item.itemType.replace(/_/g, ' ')}
                              </span>
                              {!item.required && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-100 text-surface-500 dark:bg-surface-700 dark:text-surface-400">optional</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => moveItem(section, ii, -1)} disabled={ii === 0} className="px-1.5 py-1 text-surface-400 hover:text-surface-700 disabled:opacity-30 text-sm">↑</button>
                            <button onClick={() => moveItem(section, ii, 1)} disabled={ii === items.length - 1} className="px-1.5 py-1 text-surface-400 hover:text-surface-700 disabled:opacity-30 text-sm">↓</button>
                            <button onClick={() => openEditItem(section.id, item)} className="px-1.5 py-1 text-surface-400 hover:text-brand-600 text-sm">✎</button>
                            <button onClick={() => handleDeleteItem(item)} className="px-1.5 py-1 text-surface-400 hover:text-red-600 text-sm">🗑</button>
                          </div>
                        </div>
                      ))
                    )}
                    <div className="px-4 py-2">
                      <button onClick={() => openAddItem(section.id)} className="text-sm text-brand-600 hover:underline">
                        + Add item
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Section modal */}
      <Modal isOpen={sectionModal.open} onClose={() => setSectionModal({ ...sectionModal, open: false })} title={sectionModal.editing ? 'Edit section' : 'Add section'}>
        <form onSubmit={saveSection} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input required className={inputCls} placeholder="e.g. Cold Storage & Chillers" value={sectionModal.title} onChange={(e) => setSectionModal({ ...sectionModal, title: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea className={inputCls} placeholder="Optional" value={sectionModal.description} onChange={(e) => setSectionModal({ ...sectionModal, description: e.target.value })} />
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-brand-600 py-2 text-white text-sm font-medium disabled:opacity-50">
            {isSubmitting ? 'Saving…' : 'Save section'}
          </button>
        </form>
      </Modal>

      {/* Item modal */}
      <Modal isOpen={itemModal.open} onClose={() => setItemModal({ ...itemModal, open: false })} title={itemModal.editing ? 'Edit item' : 'Add item'}>
        <form onSubmit={saveItem} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Question *</label>
            <input required className={inputCls} placeholder="e.g. Fridge temperature logged?" value={itemModal.question} onChange={(e) => setItemModal({ ...itemModal, question: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description / guidance</label>
            <textarea className={inputCls} placeholder="Optional guidance for the auditor" value={itemModal.description} onChange={(e) => setItemModal({ ...itemModal, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Response type</label>
              <select className={inputCls} value={itemModal.itemType} onChange={(e) => setItemModal({ ...itemModal, itemType: e.target.value })}>
                {ITEM_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={itemModal.required} onChange={(e) => setItemModal({ ...itemModal, required: e.target.checked })} className="rounded border-surface-300" />
                Required
              </label>
            </div>
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-brand-600 py-2 text-white text-sm font-medium disabled:opacity-50">
            {isSubmitting ? 'Saving…' : 'Save item'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
