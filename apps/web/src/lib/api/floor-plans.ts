import { api } from '@/lib/api-client';
import type { ApiResponse } from '@omniops/shared';

export interface FloorPlanData {
  id: string;
  siteId: string;
  name: string;
  description?: string;
  layout?: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  tables?: Array<{
    id: string;
    number: string;
    status: string;
    capacity: number;
    section?: string;
    position?: { x: number; y: number; w: number; h: number };
  }>;
}

export async function getFloorPlans(siteId: string): Promise<ApiResponse<FloorPlanData[]>> {
  return api.get(`/floor-plans?siteId=${siteId}`);
}

export async function createFloorPlan(data: {
  siteId: string;
  name: string;
  description?: string;
  layout?: Record<string, unknown>;
}): Promise<ApiResponse<FloorPlanData>> {
  return api.post('/floor-plans', data);
}

export async function updateFloorPlan(id: string, data: {
  name?: string;
  description?: string;
  layout?: Record<string, unknown>;
}): Promise<ApiResponse<FloorPlanData>> {
  return api.patch(`/floor-plans/${id}`, data);
}

export async function deleteFloorPlan(id: string): Promise<ApiResponse<null>> {
  return api.delete(`/floor-plans/${id}`);
}
