import { apiRequest, getAccessToken } from '@/lib/api-client';
import type { ApiResponse } from '@omniops/shared';
import type { Site } from '@omniops/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export interface SiteQueryParams {
  search?: string;
  status?: string;
  siteType?: string;
  tenantId?: string;
  page?: number;
  limit?: number;
}

export interface SiteWithTenant extends Site {
  tenant?: { id: string; name: string; slug: string };
}

function buildQueryString(params: SiteQueryParams): string {
  const sp = new URLSearchParams();
  if (params.search) sp.set('search', params.search);
  if (params.status) sp.set('status', params.status);
  if (params.siteType) sp.set('siteType', params.siteType);
  if (params.tenantId) sp.set('tenantId', params.tenantId);
  if (params.page) sp.set('page', String(params.page));
  if (params.limit) sp.set('limit', String(params.limit));
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export async function getSites(params: SiteQueryParams = {}): Promise<ApiResponse<SiteWithTenant[]>> {
  return apiRequest(`/sites${buildQueryString(params)}`);
}

export async function getSite(id: string): Promise<ApiResponse<SiteWithTenant>> {
  return apiRequest(`/sites/${id}`);
}

export async function createSite(data: Record<string, unknown>): Promise<ApiResponse<Site>> {
  return apiRequest('/sites', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSite(id: string, data: Record<string, unknown>): Promise<ApiResponse<Site>> {
  return apiRequest(`/sites/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function updateSiteStatus(id: string, status: string): Promise<ApiResponse<Site>> {
  return apiRequest(`/sites/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function bulkOnboardSites(file: File): Promise<ApiResponse<{ created: number; errors: string[] }>> {
  const formData = new FormData();
  formData.append('file', file);

  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/sites/bulk-onboard`, {
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

export async function exportSites(params: SiteQueryParams = {}): Promise<void> {
  const token = getAccessToken();
  const queryString = buildQueryString(params);
  const response = await fetch(`${API_BASE_URL}/sites/export${queryString}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error('Export failed');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sites-export.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
