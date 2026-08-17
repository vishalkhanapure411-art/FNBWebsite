import { api } from '@/lib/api-client';
import type { ApiResponse } from '@omniops/shared';
import { ShiftStatus } from '@omniops/shared';

export interface ShiftData {
  id: string;
  siteId: string;
  name: string;
  startTime: string;
  endTime?: string | null;
  openedById: string;
  closedById?: string | null;
  openingCash?: number;
  closingCash?: number;
  expectedCash?: number;
  cashVariance?: number;
  notes?: string;
  status: ShiftStatus;
  createdAt: string;
  updatedAt: string;
  openedBy?: { id: string; firstName: string; lastName: string };
  closedBy?: { id: string; firstName: string; lastName: string } | null;
  site?: { id: string; name: string };
  staffList?: Array<{
    user: { id: string; firstName: string; lastName: string; email: string; role: string };
  }>;
  cashSummary?: {
    openingCash?: number;
    closingCash?: number;
    expectedCash?: number;
    cashVariance?: number;
    cashSales: number;
    cardSales: number;
    totalOrders: number;
  };
}

export async function openShift(siteId: string, openingCash?: number, name?: string): Promise<ApiResponse<ShiftData>> {
  return api.post('/shifts/open', { siteId, openingCash, name });
}

export async function closeShift(id: string, closingCash?: number): Promise<ApiResponse<ShiftData>> {
  return api.post(`/shifts/${id}/close`, { closingCash });
}

export async function getShifts(params?: {
  siteId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<ShiftData[]>> {
  const searchParams = new URLSearchParams();
  if (params?.siteId) searchParams.set('siteId', params.siteId);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();
  return api.get(`/shifts${qs ? `?${qs}` : ''}`);
}

export async function getShift(id: string): Promise<ApiResponse<ShiftData>> {
  return api.get(`/shifts/${id}`);
}

export async function getActiveShift(siteId: string): Promise<ApiResponse<ShiftData | null>> {
  return api.get(`/shifts/active?siteId=${siteId}`);
}

export async function addShiftStaff(shiftId: string, userId: string): Promise<ApiResponse<unknown>> {
  return api.post(`/shifts/${shiftId}/staff`, { userId });
}

export async function removeShiftStaff(shiftId: string, userId: string): Promise<ApiResponse<unknown>> {
  return api.delete(`/shifts/${shiftId}/staff/${userId}`);
}
