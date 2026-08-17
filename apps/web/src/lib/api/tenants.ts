import { apiRequest, getAccessToken } from '@/lib/api-client';
import type { ApiResponse } from '@omniops/shared';
import type { Tenant } from '@omniops/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export interface TenantQueryParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface TenantWithSitesCount extends Tenant {
  _count?: { sites: number };
  sites?: { id: string; name: string; status: string; slug: string; siteType: string; city?: string; goLiveDate?: string; createdAt: string }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

function buildQueryString(params: TenantQueryParams): string {
  const sp = new URLSearchParams();
  if (params.search) sp.set('search', params.search);
  if (params.status) sp.set('status', params.status);
  if (params.page) sp.set('page', String(params.page));
  if (params.limit) sp.set('limit', String(params.limit));
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export async function getTenants(params: TenantQueryParams = {}): Promise<ApiResponse<TenantWithSitesCount[]>> {
  return apiRequest(`/tenants${buildQueryString(params)}`);
}

export async function getTenant(id: string): Promise<ApiResponse<TenantWithSitesCount>> {
  return apiRequest(`/tenants/${id}`);
}

export async function createTenant(data: Record<string, unknown>): Promise<ApiResponse<Tenant>> {
  return apiRequest('/tenants', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTenant(id: string, data: Record<string, unknown>): Promise<ApiResponse<Tenant>> {
  return apiRequest(`/tenants/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function updateTenantStatus(id: string, status: string): Promise<ApiResponse<Tenant>> {
  return apiRequest(`/tenants/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function bulkOnboardTenants(file: File): Promise<ApiResponse<{ created: number; errors: string[] }>> {
  const formData = new FormData();
  formData.append('file', file);

  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/tenants/bulk-onboard`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message ?? errorData.message ?? 'Bulk onboard failed');
  }

  return response.json();
}

export async function exportTenants(): Promise<void> {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/tenants/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error('Export failed');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tenants-export.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function exportTenantSites(tenantId: string): Promise<void> {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/sites/export?tenantId=${tenantId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error('Export failed');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sites-export-${tenantId}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
