'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import {
  getSurveys,
  createSurvey,
  publishSurvey,
  closeSurvey,
  deleteSurvey,
  getResponses,
  getAnalytics,
  getTemplates,
  type SurveyData,
  type SurveyResponseData,
  type SurveyAnalytics,
  type TemplateSummary,
} from '@/lib/api/surveys';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PUBLISHED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  CLOSED: 'bg-surface-100 text-surface-500 dark:bg-surface-700 dark:text-surface-400',
};

export default function SiteSurveysPage() {
  const params = useParams();
  const siteId = params.id as string;
  const { addToast } = useToast();
  const [surveys, setSurveys] = useState<SurveyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [createForm, setCreateForm] = useState({ templateId: '', title: '', channel: 'QR' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail modals
  const [viewingSurvey, setViewingSurvey] = useState<string | null>(null);
  const [responses, setResponses] = useState<SurveyResponseData[]>([]);
  const [analytics, setAnalytics] = useState<SurveyAnalytics | null>(null);
  const [detailTab, setDetailTab] = useState<'responses' | 'analytics'>('analytics');
  const [detailLoading, setDetailLoading] = useState(false);

  const loadSurveys = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getSurveys({ siteId, limit: 100 });
      setSurveys(res.data ?? []);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load surveys', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [siteId, addToast]);

  useEffect(() => { loadSurveys(); }, [loadSurveys]);

  const openCreate = async () => {
    setShowCreate(true);
    try {
      const res = await getTemplates();
      setTemplates((res.data ?? []).filter((t) => t.status === 'PUBLISHED'));
    } catch {}
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.templateId || !createForm.title.trim()) return;
    setIsSubmitting(true);
    try {
      await createSurvey({ siteId, templateId: createForm.templateId, title: createForm.title.trim(), channel: createForm.channel });
      addToast('Survey created', 'success');
      setShowCreate(false);
      setCreateForm({ templateId: '', title: '', channel: 'QR' });
      loadSurveys();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async (surveyId: string) => {
    try {
      await publishSurvey(surveyId);
      addToast('Survey published', 'success');
      loadSurveys();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to publish', 'error');
    }
  };

  const handleClose = async (surveyId: string) => {
    if (!confirm('Close this survey?')) return;
    try {
      await closeSurvey(surveyId);
      addToast('Survey closed', 'success');
      loadSurveys();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to close', 'error');
    }
  };

  const handleDelete = async (surveyId: string) => {
    if (!confirm('Delete this survey? This cannot be undone.')) return;
    try {
      await deleteSurvey(surveyId);
      addToast('Survey deleted', 'success');
      loadSurveys();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete', 'error');
    }
  };

  const viewDetail = async (surveyId: string) => {
    setViewingSurvey(surveyId);
    setDetailTab('analytics');
    setDetailLoading(true);
    try {
      const [respRes, analRes] = await Promise.all([
        getResponses(surveyId, { limit: 100 }),
        getAnalytics(surveyId),
      ]);
      setResponses(respRes.data ?? []);
      setAnalytics(analRes.data ?? null);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const survey = surveys.find((s) => s.id === viewingSurvey);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Surveys</h1>
          <p className="text-surface-500 mt-1">NPS, CSAT, and customer feedback surveys for this site</p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-brand-600 px-4 py-2 text-white text-sm font-medium hover:bg-brand-700"
        >
          + New Survey
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl border border-surface-200 dark:border-surface-700 animate-pulse" />
          ))}
        </div>
      ) : !surveys.length ? (
        <div className="rounded-xl border border-dashed p-16 text-center text-surface-500">
          <p className="text-4xl mb-3">📊</p>
          <p className="font-medium">No surveys yet</p>
          <p className="text-sm mt-1">Create a survey to start collecting customer feedback</p>
        </div>
      ) : (
        <div className="space-y-3">
          {surveys.map((s) => (
            <div key={s.id} className="border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 rounded-xl p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{s.title}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[s.status] ?? statusColors.DRAFT}`}>
                      {s.status}
                    </span>
                    <span className="text-xs text-surface-500">{s.channel}</span>
                  </div>
                  <div className="text-xs text-surface-500 mt-1">
                    Template: {s.template?.name ?? '—'} · Responses: {s._count?.responses ?? s.responseCount} · Slug: {s.publicSlug}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => viewDetail(s.id)} className="text-xs text-brand-600 hover:text-brand-700">
                    View
                  </button>
                  {s.status === 'DRAFT' && (
                    <button onClick={() => handlePublish(s.id)} className="text-xs text-emerald-600 hover:text-emerald-700">
                      Publish
                    </button>
                  )}
                  {s.status === 'PUBLISHED' && (
                    <button onClick={() => handleClose(s.id)} className="text-xs text-amber-600 hover:text-amber-700">
                      Close
                    </button>
                  )}
                  <button onClick={() => handleDelete(s.id)} className="text-xs text-red-500 hover:text-red-600">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New survey">
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              required
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
              placeholder="e.g. Monthly CSAT Survey"
              value={createForm.title}
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Template *</label>
            <select
              required
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
              value={createForm.templateId}
              onChange={(e) => setCreateForm({ ...createForm, templateId: e.target.value })}
            >
              <option value="">Select a published template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.questionCount} questions)</option>
              ))}
            </select>
            {templates.length === 0 && (
              <p className="text-xs text-amber-500 mt-1">No published templates available. Publish a template first.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Channel</label>
            <select
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
              value={createForm.channel}
              onChange={(e) => setCreateForm({ ...createForm, channel: e.target.value })}
            >
              <option value="QR">QR Code</option>
              <option value="EMAIL">Email</option>
              <option value="SMS">SMS</option>
              <option value="IN_STORE">In-Store</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-brand-600 py-2 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating…' : 'Create survey'}
          </button>
        </form>
      </Modal>

      {/* Detail modal */}
      <Modal
        isOpen={!!viewingSurvey}
        onClose={() => { setViewingSurvey(null); setResponses([]); setAnalytics(null); }}
        title={survey?.title ?? 'Survey Detail'}
        size="lg"
      >
        <div className="flex gap-2 mb-4 border-b border-surface-200 dark:border-surface-700 pb-2">
          <button
            onClick={() => setDetailTab('analytics')}
            className={`text-sm px-3 py-1 rounded-t ${detailTab === 'analytics' ? 'bg-white dark:bg-surface-800 border-b-2 border-brand-600 font-medium' : 'text-surface-500'}`}
          >
            Analytics
          </button>
          <button
            onClick={() => setDetailTab('responses')}
            className={`text-sm px-3 py-1 rounded-t ${detailTab === 'responses' ? 'bg-white dark:bg-surface-800 border-b-2 border-brand-600 font-medium' : 'text-surface-500'}`}
          >
            Responses
          </button>
        </div>

        {detailLoading ? (
          <div className="p-4 text-surface-500">Loading...</div>
        ) : detailTab === 'analytics' && analytics ? (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="border rounded-lg p-3 text-center">
                <div className="text-3xl font-bold text-brand-600">{analytics.totalResponses}</div>
                <div className="text-xs text-surface-500">Total Responses</div>
              </div>
              {analytics.npsScore != null && (
                <div className="border rounded-lg p-3 text-center">
                  <div className={`text-3xl font-bold ${analytics.npsScore > 0 ? 'text-emerald-600' : analytics.npsScore < 0 ? 'text-red-600' : 'text-surface-600'}`}>
                    {analytics.npsScore}
                  </div>
                  <div className="text-xs text-surface-500">NPS Score</div>
                </div>
              )}
              {analytics.csatAverage != null && (
                <div className="border rounded-lg p-3 text-center">
                  <div className="text-3xl font-bold text-brand-600">{analytics.csatAverage}</div>
                  <div className="text-xs text-surface-500">CSAT Avg (1-5)</div>
                </div>
              )}
            </div>

            {analytics.questionAnalytics.map((qa) => (
              <div key={qa.questionId} className="border rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-sm">{qa.prompt}</span>
                  <span className="text-xs text-surface-500">{qa.type} · {qa.responseCount} answers</span>
                </div>
                {qa.distribution && (
                  <div className="flex gap-1 items-end h-20">
                    {Object.entries(qa.distribution).sort(([a], [b]) => Number(a) - Number(b)).map(([key, count]) => {
                      const maxVal = Math.max(...Object.values(qa.distribution!), 1);
                      const height = Math.max(4, (count / maxVal) * 100);
                      return (
                        <div key={key} className="flex-1 flex flex-col items-center" title={`${key}: ${count}`}>
                          <span className="text-[10px] text-surface-500">{count}</span>
                          <div className="w-full bg-brand-500 rounded-t" style={{ height: `${height}%` }} />
                          <span className="text-[10px] text-surface-500">{key}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {qa.average != null && (
                  <div className="text-sm mt-1">Average: <strong>{qa.average}</strong></div>
                )}
                {qa.choiceCounts && (
                  <div className="space-y-1">
                    {Object.entries(qa.choiceCounts).map(([key, count]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span>{key}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : detailTab === 'responses' ? (
          <div className="max-h-[60vh] overflow-y-auto space-y-2">
            {responses.length === 0 ? (
              <p className="text-surface-500 text-sm">No responses yet.</p>
            ) : (
              responses.map((r) => (
                <div key={r.id} className="border rounded-lg p-3 text-sm">
                  <div className="flex justify-between text-xs text-surface-500 mb-1">
                    <span>{r.customerEmail || r.customerName || 'Anonymous'}</span>
                    <span>{new Date(r.submittedAt).toLocaleString()}</span>
                  </div>
                  {r.answers.map((a) => (
                    <div key={a.id} className="flex gap-2 py-0.5">
                      <span className="text-surface-500 shrink-0">{a.question?.prompt}:</span>
                      <span className="font-medium">
                        {a.ratingValue != null ? a.ratingValue : a.choiceValues?.join(', ') || a.answerText || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
