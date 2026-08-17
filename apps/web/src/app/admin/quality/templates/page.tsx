'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { getTemplates, createTemplate, type TemplateSummary } from '@/lib/api/quality';

const CATEGORIES = ['FOOD_SAFETY', 'HACCP', 'CLEANLINESS', 'BRAND_STANDARD', 'TEMPERATURE_LOG', 'CUSTOM'];

const categoryColors: Record<string, string> = {
  FOOD_SAFETY: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  HACCP: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  CLEANLINESS: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  BRAND_STANDARD: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  TEMPERATURE_LOG: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  CUSTOM: 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400',
};

export default function QualityTemplatesPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('FOOD_SAFETY');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getTemplates();
      setTemplates(res.data ?? []);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load templates', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await createTemplate({ name: name.trim(), description: description || undefined, category });
      addToast('Template created', 'success');
      setShowCreate(false);
      setName('');
      setDescription('');
      setCategory('FOOD_SAFETY');
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create template', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Quality Templates</h1>
          <p className="text-surface-500 mt-1">
            Configurable audit templates for food safety, HACCP, and brand compliance
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-white text-sm font-medium hover:bg-brand-700"
        >
          + New Template
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl border border-surface-200 dark:border-surface-700 animate-pulse" />
          ))}
        </div>
      ) : !templates.length ? (
        <div className="rounded-xl border border-dashed p-16 text-center text-surface-500">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">No templates yet</p>
          <p className="text-sm mt-1">Create your first audit template to get started</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => router.push(`/admin/quality/templates/${t.id}`)}
              className="text-left rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-5 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start gap-2">
                <h2 className="font-semibold text-surface-900 dark:text-surface-50 truncate">{t.name}</h2>
                <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${categoryColors[t.category] ?? categoryColors.CUSTOM}`}>
                  {t.category.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-sm text-surface-500 mt-2 line-clamp-2 min-h-[2.5rem]">
                {t.description || 'No description'}
              </p>
              <div className="flex gap-4 mt-4 text-xs text-surface-500">
                <span>{t.sectionCount} sections</span>
                <span>{t.itemCount} items</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New audit template">
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              required
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
              placeholder="e.g. Daily HACCP Walkthrough"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
              placeholder="What does this template cover?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-brand-600 py-2 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating…' : 'Create template'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
