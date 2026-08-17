import { api } from '@/lib/api-client';
import type { ApiResponse } from '@omniops/shared';

// ─── Types ───
export type FieldReportCategory = 'SAFETY' | 'QUALITY' | 'MAINTENANCE' | 'COMPLIANCE' | 'OTHER';
export type FieldReportSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type FieldReportStatus = 'NEW' | 'REVIEWED' | 'ACTIONED' | 'DISMISSED';

export interface FieldReportCommentData {
  id: string;
  reportId: string;
  authorId: string;
  body: string;
  createdAt: string;
  author?: { id: string; firstName: string; lastName: string };
}

export interface FieldReportData {
  id: string;
  tenantId: string;
  siteId: string;
  category: FieldReportCategory;
  severity: FieldReportSeverity;
  title: string;
  description: string;
  status: FieldReportStatus;
  reportedById: string;
  createdAt: string;
  updatedAt: string;
  site?: { id: string; name: string };
  reportedBy?: { id: string; firstName: string; lastName: string; email?: string };
  comments?: FieldReportCommentData[];
}

export interface FieldReportListResponse {
  success: boolean;
  data: FieldReportData[];
  meta: { page: number; limit: number; total: number };
}

export interface CreateFieldReportInput {
  siteId: string;
  category: FieldReportCategory;
  severity: FieldReportSeverity;
  title: string;
  description: string;
}

// ─── API ───
export async function getFieldReports(params?: {
  siteId?: string;
  status?: FieldReportStatus;
  severity?: FieldReportSeverity;
  category?: FieldReportCategory;
  page?: number;
  limit?: number;
}): Promise<FieldReportListResponse> {
  const sp = new URLSearchParams();
  if (params?.siteId) sp.set('siteId', params.siteId);
  if (params?.status) sp.set('status', params.status);
  if (params?.severity) sp.set('severity', params.severity);
  if (params?.category) sp.set('category', params.category);
  if (params?.page) sp.set('page', String(params.page));
  if (params?.limit) sp.set('limit', String(params.limit));
  const qs = sp.toString();
  return api.get(`/field-reports${qs ? `?${qs}` : ''}`);
}

export async function createFieldReport(
  input: CreateFieldReportInput,
): Promise<ApiResponse<FieldReportData>> {
  return api.post('/field-reports', input);
}

export async function updateFieldReportStatus(
  id: string,
  status: FieldReportStatus,
): Promise<ApiResponse<FieldReportData>> {
  return api.patch(`/field-reports/${id}/status`, { status });
}

export async function addFieldReportComment(
  id: string,
  body: string,
): Promise<ApiResponse<FieldReportCommentData>> {
  return api.post(`/field-reports/${id}/comments`, { body });
}
