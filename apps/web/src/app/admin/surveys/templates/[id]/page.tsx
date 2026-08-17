'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import {
  getTemplate,
  updateTemplate,
  deleteTemplate,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  type TemplateDetail,
  type SurveyQuestion,
} from '@/lib/api/surveys';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PUBLISHED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  ARCHIVED: 'bg-surface-100 text-surface-500 dark:bg-surface-700 dark:text-surface-400',
};

const QUESTION_TYPES = [
  { value: 'STAR_RATING', label: 'Star Rating' },
  { value: 'NPS', label: 'NPS' },
  { value: 'CSAT', label: 'CSAT' },
  { value: 'TEXT', label: 'Text' },
  { value: 'SINGLE_CHOICE', label: 'Single Choice' },
  { value: 'MULTIPLE_CHOICE', label: 'Multi Choice' },
];

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const id = params.id as string;
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const [newQuestion, setNewQuestion] = useState({ type: 'TEXT', prompt: '', required: false, options: [] as { label: string; value: string }[] });

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getTemplate(id);
      setTemplate(res.data ?? null);
      if (res.data) setName(res.data.name);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => { load(); }, [load]);

  const handlePublish = async () => {
    try {
      await updateTemplate(id, { status: 'PUBLISHED' });
      addToast('Template published', 'success');
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to publish', 'error');
    }
  };

  const handleArchive = async () => {
    if (!confirm('Archive this template?')) return;
    try {
      await deleteTemplate(id);
      addToast('Template archived', 'success');
      router.push('/admin/surveys/templates');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to archive', 'error');
    }
  };

  const handleRename = async () => {
    if (!name.trim()) return;
    try {
      await updateTemplate(id, { name: name.trim() });
      addToast('Renamed', 'success');
      setEditingName(false);
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to rename', 'error');
    }
  };

  const handleAddQuestion = async () => {
    if (!newQuestion.prompt.trim()) return;
    try {
      const opts = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE'].includes(newQuestion.type)
        ? newQuestion.options.filter((o) => o.label.trim()).map((o) => ({
            label: o.label,
            value: o.value || o.label.toLowerCase().replace(/\s+/g, '_'),
          }))
        : undefined;
      await addQuestion(id, {
        type: newQuestion.type,
        prompt: newQuestion.prompt.trim(),
        required: newQuestion.required,
        options: opts && opts.length > 0 ? opts : undefined,
      });
      addToast('Question added', 'success');
      setNewQuestion({ type: 'TEXT', prompt: '', required: false, options: [] });
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to add', 'error');
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm('Delete this question?')) return;
    try {
      await deleteQuestion(qId);
      addToast('Question deleted', 'success');
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete', 'error');
    }
  };

  if (isLoading) {
    return <div className="p-8 text-surface-500">Loading...</div>;
  }

  if (!template) {
    return <div className="p-8 text-surface-500">Template not found</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/admin/surveys/templates')} className="text-surface-500 hover:text-surface-700">
            ← Back
          </button>
          {editingName ? (
            <div className="flex gap-2">
              <input
                className="rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-1 text-lg font-bold"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                autoFocus
              />
              <button onClick={handleRename} className="text-brand-600 text-sm">Save</button>
              <button onClick={() => setEditingName(false)} className="text-surface-500 text-sm">Cancel</button>
            </div>
          ) : (
            <h1
              className="text-2xl font-bold cursor-pointer hover:text-brand-600"
              onClick={() => setEditingName(true)}
            >
              {template.name}
            </h1>
          )}
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[template.status] ?? statusColors.DRAFT}`}>
            {template.status}
          </span>
        </div>
        <div className="flex gap-2">
          {template.status === 'DRAFT' && (
            <button onClick={handlePublish} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-white text-sm hover:bg-emerald-700">
              Publish
            </button>
          )}
          {template.status !== 'ARCHIVED' && (
            <button onClick={handleArchive} className="rounded-lg border border-red-300 px-3 py-1.5 text-red-600 text-sm hover:bg-red-50">
              Archive
            </button>
          )}
        </div>
      </div>

      {template.description && (
        <p className="text-surface-500 mb-6">{template.description}</p>
      )}

      {/* Questions */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Questions ({template.questions.length})</h2>
        {template.questions.length === 0 ? (
          <p className="text-surface-500 text-sm py-4">No questions yet. Add one below.</p>
        ) : (
          <div className="space-y-2">
            {template.questions.map((q) => (
              <div key={q.id} className="border border-surface-200 dark:border-surface-700 rounded-lg p-3 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-surface-100 dark:bg-surface-700 px-1.5 py-0.5 rounded">
                      {q.type}
                    </span>
                    <span className="font-medium">{q.prompt}</span>
                    {q.required && <span className="text-xs text-red-500">*required</span>}
                  </div>
                  {q.options && q.options.length > 0 && (
                    <div className="flex gap-2 mt-1 ml-2">
                      {q.options.map((o) => (
                        <span key={o.id} className="text-xs bg-surface-100 dark:bg-surface-700 px-1.5 py-0.5 rounded">
                          {o.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => handleDeleteQuestion(q.id)} className="text-red-500 text-sm shrink-0 ml-4">
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add question form */}
      <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
        <h3 className="text-sm font-semibold mb-2">Add Question</h3>
        <div className="flex gap-2 items-start flex-wrap">
          <select
            className="rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-2 py-1.5 text-sm"
            value={newQuestion.type}
            onChange={(e) => setNewQuestion({ ...newQuestion, type: e.target.value, options: [] })}
          >
            {QUESTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input
            className="flex-1 min-w-[200px] rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-2 py-1.5 text-sm"
            placeholder="Prompt"
            value={newQuestion.prompt}
            onChange={(e) => setNewQuestion({ ...newQuestion, prompt: e.target.value })}
          />
          <label className="flex items-center gap-1 text-xs text-surface-500">
            <input
              type="checkbox"
              checked={newQuestion.required}
              onChange={(e) => setNewQuestion({ ...newQuestion, required: e.target.checked })}
            />
            Required
          </label>
          <button
            onClick={handleAddQuestion}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-white text-sm hover:bg-brand-700"
          >
            Add
          </button>
        </div>
        {['SINGLE_CHOICE', 'MULTIPLE_CHOICE'].includes(newQuestion.type) && (
          <div className="mt-2 ml-2 space-y-1">
            {(newQuestion.options as { label: string; value: string }[]).map((opt, oi) => (
              <div key={oi} className="flex gap-1 items-center">
                <input
                  className="flex-1 rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-2 py-1 text-xs"
                  placeholder="Label"
                  value={opt.label}
                  onChange={(e) => {
                    const opts = [...newQuestion.options];
                    const current = opts[oi];
                    if (!current) return;
                    opts[oi] = { ...current, label: e.target.value };
                    setNewQuestion({ ...newQuestion, options: opts });
                  }}
                />
                <button
                  onClick={() => {
                    setNewQuestion({ ...newQuestion, options: newQuestion.options.filter((_, i) => i !== oi) });
                  }}
                  className="text-red-500 text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={() => setNewQuestion({ ...newQuestion, options: [...newQuestion.options, { label: '', value: '' }] })}
              className="text-xs text-brand-600"
            >
              + Add option
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
