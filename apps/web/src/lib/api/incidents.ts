import { api } from '@/lib/api-client';
import type {
  IncidentDepartment,
  IncidentSeverity,
  IncidentStatus,
} from '@omniops/shared';

// ─── Types (mirror backend /api/incidents shapes) ───
export interface IncidentCategoryNode {
  id: string;
  name: string;
  level: number;
  children: IncidentCategoryNode[];
}

export interface UserRef {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

export interface SiteRef {
  id: string;
  name: string;
}

export interface IncidentCommentData {
  id: string;
  ticketId: string;
  authorId: string;
  text: string;
  createdAt: string;
  author?: { id: string; firstName: string; lastName: string };
}

export interface IncidentTicket {
  id: string;
  ticketNumber: string;
  tenantId: string;
  siteId: string | null;
  department: IncidentDepartment;
  categoryLevel1Id: string | null;
  categoryLevel2Id: string | null;
  categoryLevel3Id: string | null;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  assignedToId: string | null;
  createdById: string;
  dueAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  site?: SiteRef | null;
  createdBy?: UserRef | null;
  assignedTo?: UserRef | null;
  categoryLevel1?: { id: string; name: string } | null;
  categoryLevel2?: { id: string; name: string } | null;
  categoryLevel3?: { id: string; name: string } | null;
  comments?: IncidentCommentData[];
}

export interface IncidentListResponse {
  success: boolean;
  data: IncidentTicket[];
  meta: { page: number; limit: number; total: number };
}

export interface IncidentDetailResponse {
  success: boolean;
  data: IncidentTicket;
}

export interface IncidentEntityResponse {
  success: boolean;
  data: IncidentTicket;
}

export interface CreateIncidentInput {
  siteId?: string;
  department: IncidentDepartment;
  categoryLevel1Id?: string;
  categoryLevel2Id?: string;
  categoryLevel3Id?: string;
  title: string;
  description: string;
  severity?: IncidentSeverity;
}

export interface IncidentListParams {
  siteId?: string;
  department?: IncidentDepartment;
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  scope?: 'all' | 'mine';
  page?: number;
  limit?: number;
}

// ─── API ───
export async function getIncidents(
  params: IncidentListParams = {},
): Promise<IncidentListResponse> {
  const sp = new URLSearchParams();
  if (params.siteId) sp.set('siteId', params.siteId);
  if (params.department) sp.set('department', params.department);
  if (params.status) sp.set('status', params.status);
  if (params.severity) sp.set('severity', params.severity);
  if (params.scope) sp.set('scope', params.scope);
  if (params.page) sp.set('page', String(params.page));
  if (params.limit) sp.set('limit', String(params.limit));
  const qs = sp.toString();
  return api.get(`/incidents${qs ? `?${qs}` : ''}`);
}

export async function getIncident(id: string): Promise<IncidentDetailResponse> {
  return api.get(`/incidents/${id}`);
}

export async function createIncident(
  input: CreateIncidentInput,
): Promise<IncidentEntityResponse> {
  return api.post('/incidents', input);
}

export async function updateIncidentStatus(
  id: string,
  status: IncidentStatus,
): Promise<IncidentEntityResponse> {
  return api.patch(`/incidents/${id}/status`, { status });
}

export async function addIncidentComment(
  id: string,
  text: string,
): Promise<{ success: boolean; data: IncidentCommentData }> {
  return api.post(`/incidents/${id}/comments`, { text });
}

export async function getIncidentCategories(
  department: IncidentDepartment,
): Promise<{ success: boolean; data: IncidentCategoryNode[] }> {
  return api.get(`/incidents/categories?department=${department}`);
}
