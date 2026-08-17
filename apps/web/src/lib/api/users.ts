import { api } from '@/lib/api-client';
import type { ApiResponse } from '@omniops/shared';

export interface UserData {
  id: string;
  tenantId?: string | null;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  siteId?: string | null;
  status: string;
}

export interface UserListResponse {
  success?: boolean;
  data?: UserData[];
  items?: UserData[];
  meta?: { page: number; limit: number; total: number };
}

export async function getUsers(params?: { page?: number; limit?: number }): Promise<UserListResponse> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.limit) sp.set('limit', String(params.limit));
  const qs = sp.toString();
  return api.get(`/users${qs ? `?${qs}` : ''}`);
}

export async function getUser(id: string): Promise<ApiResponse<UserData>> {
  return api.get(`/users/${id}`);
}
