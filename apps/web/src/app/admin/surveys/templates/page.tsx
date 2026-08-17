'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { getTemplates, createTemplate, type TemplateSummary } from '@/lib/api/surveys';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PUBLISHED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  ARCHIVED: 'bg-surface-100 text-surface-500 dark:bg-surface-700 dark:text-surface-400',
};

const QUESTION_TYPES = [
  { value: 'STAR_RATING', label: 'Star Rating (1-5)' },
  { value: 'NPS', label: 'NPS (0-10)' },
  { value: 'CSAT', label: 'CSAT (1-5)' },
  { value: 'TEXT', label: 'Text Feedback' },
  { value: 'SINGLE_CHOICE', label: 'Single Choice' },
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
];

interface QuestionDraft {
  type: string;
  prompt: string;
  required: boolean;
  options: { label: string; value: string }[];
}

export default function SurveyTemplatesPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    { type: 'NPS', prompt: '', required: true, options: [] },
  ]);

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

  useEffect(() => { load(); }, [load]);

  const addQuestion = () => {
    setQuestions([...questions, { type: 'TEXT', prompt: '', required: false, options: [] }]);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, field: string, value: unknown) => {
    const updated = [...questions];
    const item = updated[idx];
    if (!item) return;
    (item as any)[field] = value;
    // Reset options if type changes to non-choice
    if (field === 'type' && !['SINGLE_CHOICE', 'MULTIPLE_CHOICE'].includes(value as string)) {
      item.options = [];
    }
    setQuestions(updated);
  };

  const addOption = (qIdx: number) => {
    const updated = [...questions];
    const q = updated[qIdx];
    if (!q) return;
    q.options = [...(q.options || []), { label: '', value: '' }];
    setQuestions(updated);
  };

  const updateOption = (qIdx: number, oIdx: number, field: string, value: string) => {
    const updated = [...questions];
    const q = updated[qIdx];
    if (!q || !q.options) return;
    const current = q.options[oIdx];
    if (!current) return;
    q.options[oIdx] = { ...current, [field]: value };
    setQuestions(updated);
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    const updated = [...questions];
    const q = updated[qIdx];
    if (!q) return;
    q.options = q.options.filter((_, i) => i !== oIdx);
    setQuestions(updated);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || questions.some((q) => !q.prompt.trim())) {
      addToast('Name and all question prompts are required', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await createTemplate({
        name: name.trim(),
        description: description || undefined,
        questions: questions.map((q, qi) => ({
          type: q.type,
          prompt: q.prompt.trim(),
          required: q.required,
          order: qi,
          options: q.options.length > 0 ? q.options.map((o, oi) => ({
            label: o.label,
            value: o.value || o.label.toLowerCase().replace(/\s+/g, '_'),
            order: oi,
          })) : undefined,
        })),
      });
      addToast('Template created', 'success');
      setShowCreate(false);
      setName('');
      setDescription('');
      setQuestions([{ type: 'NPS', prompt: '', required: true, options: [] }]);
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
          <h1 className="text-3xl font-bold">Survey Templates</h1>
          <p className="text-surface-500 mt-1">NPS, CSAT, and feedback survey templates</p>
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
            <div key={i} className="h-36 rounded-xl border border-surface-200 dark:border-surface-700 animate-pulse" />
          ))}
        </div>
      ) : !templates.length ? (
        <div className="rounded-xl border border-dashed p-16 text-center text-surface-500">
          <p className="text-4xl mb-3">📊</p>
          <p className="font-medium">No survey templates yet</p>
          <p className="text-sm mt-1">Create your first template to start collecting feedback</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => router.push(`/admin/surveys/templates/${t.id}`)}
              className="text-left rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-5 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start gap-2">
                <h2 className="font-semibold text-surface-900 dark:text-surface-50 truncate">{t.name}</h2>
                <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[t.status] ?? statusColors.DRAFT}`}>
                  {t.status}
                </span>
              </div>
              <p className="text-sm text-surface-500 mt-2 line-clamp-2 min-h-[2.5rem]">
                {t.description || 'No description'}
              </p>
              <div className="flex gap-4 mt-4 text-xs text-surface-500">
                <span>{t.questionCount} questions</span>
                <span>{t.surveyCount} surveys</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New survey template" size="lg">
        <form onSubmit={handleCreate} className="space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              required
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
              placeholder="e.g. Customer Satisfaction Survey"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
              placeholder="What is this survey about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="border-t border-surface-200 dark:border-surface-700 pt-3">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">Questions</label>
              <button type="button" onClick={addQuestion} className="text-xs text-brand-600 hover:text-brand-700">
                + Add question
              </button>
            </div>
            {questions.map((q, qi) => (
              <div key={qi} className="border border-surface-200 dark:border-surface-700 rounded-lg p-3 mb-2 space-y-2">
                <div className="flex gap-2">
                  <select
                    className="w-1/3 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-2 py-1.5 text-sm"
                    value={q.type}
                    onChange={(e) => updateQuestion(qi, 'type', e.target.value)}
                  >
                    {QUESTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <input
                    className="flex-1 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-2 py-1.5 text-sm"
                    placeholder="Question prompt..."
                    value={q.prompt}
                    onChange={(e) => updateQuestion(qi, 'prompt', e.target.value)}
                  />
                  <label className="flex items-center gap-1 text-xs text-surface-500 shrink-0">
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={(e) => updateQuestion(qi, 'required', e.target.checked)}
                    />
                    Required
                  </label>
                  <button type="button" onClick={() => removeQuestion(qi)} className="text-red-500 text-xs shrink-0">
                    ✕
                  </button>
                </div>
                {['SINGLE_CHOICE', 'MULTIPLE_CHOICE'].includes(q.type) && (
                  <div className="ml-4 space-y-1">
                    {(q.options || []).map((opt, oi) => (
                      <div key={oi} className="flex gap-1 items-center">
                        <input
                          className="flex-1 rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-2 py-1 text-xs"
                          placeholder="Option label"
                          value={opt.label}
                          onChange={(e) => updateOption(qi, oi, 'label', e.target.value)}
                        />
                        <input
                          className="w-24 rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-2 py-1 text-xs"
                          placeholder="Value"
                          value={opt.value}
                          onChange={(e) => updateOption(qi, oi, 'value', e.target.value)}
                        />
                        <button type="button" onClick={() => removeOption(qi, oi)} className="text-red-500 text-xs">✕</button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addOption(qi)} className="text-xs text-brand-600">
                      + Add option
                    </button>
                  </div>
                )}
              </div>
            ))}
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
