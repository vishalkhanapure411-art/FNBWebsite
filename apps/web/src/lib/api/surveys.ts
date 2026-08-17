import { api } from '@/lib/api-client';
import type { ApiResponse } from '@omniops/shared';

// ─── Types ───

export interface QuestionOption {
  id: string;
  questionId: string;
  label: string;
  value: string;
  order: number;
}

export interface SurveyQuestion {
  id: string;
  templateId: string;
  type: string;
  prompt: string;
  required: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  options?: QuestionOption[];
}

export interface TemplateSummary {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  questionCount: number;
  surveyCount: number;
}

export interface TemplateDetail {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  questions: SurveyQuestion[];
}

export interface SurveyData {
  id: string;
  tenantId: string;
  siteId: string;
  templateId: string;
  title: string;
  status: string;
  channel: string;
  startsAt?: string | null;
  endsAt?: string | null;
  publicSlug: string;
  responseCount: number;
  createdAt: string;
  updatedAt: string;
  template?: { id: string; name: string; questions?: SurveyQuestion[] };
  site?: { id: string; name: string };
  _count?: { responses: number };
}

export interface SurveyAnswerData {
  id: string;
  responseId: string;
  questionId: string;
  answerText?: string | null;
  ratingValue?: number | null;
  choiceValues?: string[];
  question?: { id: string; prompt: string; type: string };
}

export interface SurveyResponseData {
  id: string;
  surveyId: string;
  orderId?: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
  submittedAt: string;
  createdAt: string;
  answers: SurveyAnswerData[];
}

export interface QuestionAnalytics {
  questionId: string;
  prompt: string;
  type: string;
  responseCount: number;
  average?: number | null;
  distribution?: Record<string, number>;
  ratingCount?: number;
  choiceCounts?: Record<string, number>;
  textResponses?: string[];
  textCount?: number;
}

export interface SurveyAnalytics {
  surveyId: string;
  totalResponses: number;
  npsScore?: number | null;
  csatAverage?: number | null;
  questionAnalytics: QuestionAnalytics[];
  responsesByDate: Record<string, number>;
}

export interface PublicSurveyData {
  id: string;
  title: string;
  siteName: string;
  channel: string;
  questions: {
    id: string;
    type: string;
    prompt: string;
    required: boolean;
    order: number;
    options: { id: string; label: string; value: string }[];
  }[];
}

export interface ListResponse<T> {
  success: boolean;
  data: T[];
  meta?: { page: number; limit: number; total: number };
}

// ─── Templates ───

export async function getTemplates(): Promise<ApiResponse<TemplateSummary[]>> {
  return api.get('/surveys/templates');
}

export async function getTemplate(id: string): Promise<ApiResponse<TemplateDetail>> {
  return api.get(`/surveys/templates/${id}`);
}

export async function createTemplate(body: {
  name: string;
  description?: string;
  questions?: {
    type: string;
    prompt: string;
    required?: boolean;
    order?: number;
    options?: { label: string; value: string; order?: number }[];
  }[];
}): Promise<ApiResponse<TemplateDetail>> {
  return api.post('/surveys/templates', body);
}

export async function updateTemplate(
  id: string,
  body: Record<string, unknown>,
): Promise<ApiResponse<TemplateDetail>> {
  return api.patch(`/surveys/templates/${id}`, body);
}

export async function deleteTemplate(id: string): Promise<ApiResponse<{ id: string }>> {
  return api.delete(`/surveys/templates/${id}`);
}

// ─── Questions ───

export async function addQuestion(
  templateId: string,
  body: {
    type: string;
    prompt: string;
    required?: boolean;
    order?: number;
    options?: { label: string; value: string; order?: number }[];
  },
): Promise<ApiResponse<SurveyQuestion>> {
  return api.post(`/surveys/templates/${templateId}/questions`, body);
}

export async function updateQuestion(
  id: string,
  body: Record<string, unknown>,
): Promise<ApiResponse<SurveyQuestion>> {
  return api.patch(`/surveys/questions/${id}`, body);
}

export async function deleteQuestion(id: string): Promise<ApiResponse<{ id: string }>> {
  return api.delete(`/surveys/questions/${id}`);
}

// ─── Surveys ───

export async function createSurvey(body: {
  siteId: string;
  templateId: string;
  title: string;
  channel?: string;
  startsAt?: string;
  endsAt?: string;
}): Promise<ApiResponse<SurveyData>> {
  return api.post('/surveys', body);
}

export async function getSurveys(params?: {
  siteId?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ListResponse<SurveyData>> {
  const sp = new URLSearchParams();
  if (params?.siteId) sp.set('siteId', params.siteId);
  if (params?.status) sp.set('status', params.status);
  if (params?.page) sp.set('page', String(params.page));
  if (params?.limit) sp.set('limit', String(params.limit));
  const qs = sp.toString();
  return api.get(`/surveys${qs ? `?${qs}` : ''}`);
}

export async function getSurvey(id: string): Promise<ApiResponse<SurveyData>> {
  return api.get(`/surveys/${id}`);
}

export async function publishSurvey(id: string): Promise<ApiResponse<SurveyData>> {
  return api.post(`/surveys/${id}/publish`);
}

export async function closeSurvey(id: string): Promise<ApiResponse<SurveyData>> {
  return api.post(`/surveys/${id}/close`);
}

export async function deleteSurvey(id: string): Promise<ApiResponse<{ id: string }>> {
  return api.delete(`/surveys/${id}`);
}

// ─── Responses ───

export async function getResponses(
  surveyId: string,
  params?: { page?: number; limit?: number },
): Promise<ListResponse<SurveyResponseData>> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.limit) sp.set('limit', String(params.limit));
  const qs = sp.toString();
  return api.get(`/surveys/${surveyId}/responses${qs ? `?${qs}` : ''}`);
}

export async function getAnalytics(surveyId: string): Promise<ApiResponse<SurveyAnalytics>> {
  return api.get(`/surveys/${surveyId}/analytics`);
}

// ─── Public ───

export async function getPublicSurvey(publicSlug: string): Promise<ApiResponse<PublicSurveyData>> {
  return fetch(`/api/surveys/public/${publicSlug}`).then((r) => r.json());
}

export async function submitPublicResponse(
  publicSlug: string,
  body: {
    orderId?: string;
    customerEmail?: string;
    customerName?: string;
    answers: {
      questionId: string;
      answerText?: string;
      ratingValue?: number;
      choiceValues?: string[];
    }[];
  },
): Promise<ApiResponse<{ id: string; submittedAt: string }>> {
  return fetch(`/api/surveys/public/${publicSlug}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => r.json());
}
