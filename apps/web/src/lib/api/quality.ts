import { api } from '@/lib/api-client';
import type { ApiResponse } from '@omniops/shared';

// ─── Types ───
export interface TemplateSummary {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  sectionCount: number;
  itemCount: number;
}

export interface AuditItem {
  id: string;
  sectionId: string;
  question: string;
  description?: string | null;
  itemType: string;
  required: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface AuditSection {
  id: string;
  templateId: string;
  title: string;
  description?: string | null;
  sortOrder: number;
  createdAt: string;
  items: AuditItem[];
}

export interface AuditTemplateDetail {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  sections: AuditSection[];
}

export interface AuditResponse {
  id: string;
  auditId: string;
  itemId: string;
  value: string;
  notes?: string | null;
  photoUrl?: string | null;
  createdAt: string;
  item?: AuditItem & { section?: { id: string; title: string } };
}

export interface CapaData {
  id: string;
  auditId: string;
  title: string;
  description: string;
  assignedToId: string;
  priority: string;
  status: string;
  dueDate?: string | null;
  resolvedAt?: string | null;
  resolution?: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo?: { id: string; firstName: string; lastName: string; email?: string };
  audit?: {
    id: string;
    title: string;
    siteId: string;
    site?: { id: string; name: string };
  };
}

export interface AuditData {
  id: string;
  tenantId: string;
  siteId: string;
  templateId: string;
  title: string;
  auditorId: string;
  status: string;
  score?: number | null;
  maxScore?: number | null;
  startedAt: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  template?: { id: string; name: string; category: string };
  site?: { id: string; name: string };
  auditor?: { id: string; firstName: string; lastName: string; email?: string };
  responses?: AuditResponse[];
  capas?: CapaData[];
  _count?: { responses: number; capas: number };
}

export interface AuditDetail extends AuditData {
  template?: AuditTemplateDetail;
  responses: AuditResponse[];
  capas: CapaData[];
}

export interface ListResponse<T> {
  success: boolean;
  data: T[];
  meta?: { page: number; limit: number; total: number };
}

// ─── Templates ───
export async function getTemplates(): Promise<ApiResponse<TemplateSummary[]>> {
  return api.get('/quality/templates');
}
export async function getTemplate(id: string): Promise<ApiResponse<AuditTemplateDetail>> {
  return api.get(`/quality/templates/${id}`);
}
export async function createTemplate(body: {
  name: string;
  description?: string;
  category: string;
}): Promise<ApiResponse<AuditTemplateDetail>> {
  return api.post('/quality/templates', body);
}
export async function updateTemplate(
  id: string,
  body: Record<string, unknown>,
): Promise<ApiResponse<AuditTemplateDetail>> {
  return api.patch(`/quality/templates/${id}`, body);
}
export async function deleteTemplate(id: string): Promise<ApiResponse<AuditTemplateDetail>> {
  return api.delete(`/quality/templates/${id}`);
}

// ─── Sections ───
export async function createSection(
  templateId: string,
  body: { title: string; description?: string; sortOrder?: number },
): Promise<ApiResponse<AuditSection>> {
  return api.post(`/quality/templates/${templateId}/sections`, body);
}
export async function updateSection(
  id: string,
  body: Record<string, unknown>,
): Promise<ApiResponse<AuditSection>> {
  return api.patch(`/quality/sections/${id}`, body);
}
export async function deleteSection(id: string): Promise<ApiResponse<{ id: string }>> {
  return api.delete(`/quality/sections/${id}`);
}

// ─── Items ───
export async function createItem(
  sectionId: string,
  body: {
    question: string;
    description?: string;
    itemType: string;
    required?: boolean;
    sortOrder?: number;
  },
): Promise<ApiResponse<AuditItem>> {
  return api.post(`/quality/sections/${sectionId}/items`, body);
}
export async function updateItem(
  id: string,
  body: Record<string, unknown>,
): Promise<ApiResponse<AuditItem>> {
  return api.patch(`/quality/items/${id}`, body);
}
export async function deleteItem(id: string): Promise<ApiResponse<{ id: string }>> {
  return api.delete(`/quality/items/${id}`);
}

// ─── Audits ───
export async function startAudit(body: {
  siteId: string;
  templateId: string;
  title: string;
}): Promise<ApiResponse<AuditData>> {
  return api.post('/quality/audits', body);
}
export async function getAudits(params?: {
  siteId?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}): Promise<ListResponse<AuditData>> {
  const sp = new URLSearchParams();
  if (params?.siteId) sp.set('siteId', params.siteId);
  if (params?.status) sp.set('status', params.status);
  if (params?.from) sp.set('from', params.from);
  if (params?.to) sp.set('to', params.to);
  if (params?.page) sp.set('page', String(params.page));
  if (params?.limit) sp.set('limit', String(params.limit));
  const qs = sp.toString();
  return api.get(`/quality/audits${qs ? `?${qs}` : ''}`);
}
export async function getAudit(id: string): Promise<ApiResponse<AuditDetail>> {
  return api.get(`/quality/audits/${id}`);
}
export async function respondToItem(
  auditId: string,
  body: { itemId: string; value: string; notes?: string; photoUrl?: string },
): Promise<ApiResponse<AuditResponse>> {
  return api.patch(`/quality/audits/${auditId}/respond`, body);
}
export async function completeAudit(auditId: string): Promise<ApiResponse<AuditData>> {
  return api.post(`/quality/audits/${auditId}/complete`);
}
export async function updateAuditStatus(
  auditId: string,
  status: string,
): Promise<ApiResponse<AuditData>> {
  return api.patch(`/quality/audits/${auditId}/status`, { status });
}

// ─── CAPA ───
export async function createCapa(
  auditId: string,
  body: {
    title: string;
    description: string;
    assignedToId: string;
    priority: string;
    dueDate?: string;
  },
): Promise<ApiResponse<CapaData>> {
  return api.post(`/quality/audits/${auditId}/capas`, body);
}
export async function getCapas(params?: {
  status?: string;
  assignedToId?: string;
  siteId?: string;
  page?: number;
  limit?: number;
}): Promise<ListResponse<CapaData>> {
  const sp = new URLSearchParams();
  if (params?.status) sp.set('status', params.status);
  if (params?.assignedToId) sp.set('assignedToId', params.assignedToId);
  if (params?.siteId) sp.set('siteId', params.siteId);
  if (params?.page) sp.set('page', String(params.page));
  if (params?.limit) sp.set('limit', String(params.limit));
  const qs = sp.toString();
  return api.get(`/quality/capas${qs ? `?${qs}` : ''}`);
}
export async function updateCapa(id: string, body: Record<string, unknown>): Promise<ApiResponse<CapaData>> {
  return api.patch(`/quality/capas/${id}`, body);
}
export async function resolveCapa(id: string, resolution: string): Promise<ApiResponse<CapaData>> {
  return api.patch(`/quality/capas/${id}/resolve`, { resolution });
}
export async function verifyCapa(id: string): Promise<ApiResponse<CapaData>> {
  return api.patch(`/quality/capas/${id}/verify`);
}
