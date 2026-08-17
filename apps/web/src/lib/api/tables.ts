import { api } from '@/lib/api-client';
import type { ApiResponse } from '@omniops/shared';
import { TableStatus } from '@omniops/shared';

export interface TableData {
  id: string;
  floorPlanId: string;
  siteId: string;
  number: string;
  section?: string;
  capacity: number;
  status: TableStatus;
  position?: { x: number; y: number; w: number; h: number };
  createdAt: string;
  updatedAt: string;
  floorPlan?: { id: string; name: string };
}

export async function getTables(params?: {
  siteId?: string;
  floorPlanId?: string;
}): Promise<ApiResponse<TableData[]>> {
  const searchParams = new URLSearchParams();
  if (params?.siteId) searchParams.set('siteId', params.siteId);
  if (params?.floorPlanId) searchParams.set('floorPlanId', params.floorPlanId);
  const qs = searchParams.toString();
  return api.get(`/tables${qs ? `?${qs}` : ''}`);
}

export async function createTable(data: {
  floorPlanId: string;
  siteId: string;
  number: string;
  section?: string;
  capacity?: number;
  position?: { x: number; y: number; w: number; h: number };
}): Promise<ApiResponse<TableData>> {
  return api.post('/tables', data);
}

export async function updateTable(id: string, data: {
  number?: string;
  section?: string;
  capacity?: number;
  position?: { x: number; y: number; w: number; h: number };
  status?: TableStatus;
}): Promise<ApiResponse<TableData>> {
  return api.patch(`/tables/${id}`, data);
}

export async function deleteTable(id: string): Promise<ApiResponse<null>> {
  return api.delete(`/tables/${id}`);
}

export async function updateTableStatus(id: string, status: TableStatus): Promise<ApiResponse<TableData>> {
  return api.patch(`/tables/${id}/status`, { status });
}
