import { api } from '@/lib/api-client';
import type { ApiResponse } from '@omniops/shared';

// ─── Asset types ───

export interface AssetData {
  id: string;
  tenantId: string;
  siteId: string;
  name: string;
  category: string;
  model?: string | null;
  serialNumber?: string | null;
  manufacturer?: string | null;
  purchaseDate?: string | null;
  warrantyExpiry?: string | null;
  location?: string | null;
  status: string;
  notes?: string | null;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  site?: { id: string; name: string; tenantId: string };
  tickets?: TicketData[];
  schedules?: ScheduleData[];
}

export interface AssetListResponse {
  success: boolean;
  data: AssetData[];
  meta: { page: number; limit: number; total: number };
}

// ─── Ticket types ───

export interface TicketData {
  id: string;
  tenantId: string;
  siteId: string;
  assetId?: string | null;
  title: string;
  description: string;
  priority: string;
  status: string;
  category: string;
  reportedById: string;
  assignedToId?: string | null;
  vendorId?: string | null;
  slaDueAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  resolution?: string | null;
  costEstimate?: number | null;
  actualCost?: number | null;
  createdAt: string;
  updatedAt: string;
  asset?: { id: string; name: string; category: string; location?: string } | null;
  assignedTo?: { id: string; firstName: string; lastName: string; email?: string } | null;
  vendor?: VendorData | null;
  reportedBy?: { id: string; firstName: string; lastName: string };
  site?: { id: string; name: string };
  comments?: CommentData[];
  photos?: PhotoData[];
}

export interface CommentData {
  id: string;
  ticketId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string };
}

export interface PhotoData {
  id: string;
  ticketId: string;
  url: string;
  caption?: string | null;
  createdAt: string;
}

export interface TicketListResponse {
  success: boolean;
  data: TicketData[];
  meta: { page: number; limit: number; total: number };
}

// ─── Vendor types ───

export interface VendorData {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  rating?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Schedule types ───

export interface ScheduleData {
  id: string;
  assetId: string;
  title: string;
  description?: string | null;
  frequency: string;
  nextDueAt: string;
  lastDoneAt?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  asset?: { id: string; name: string; siteId?: string; site?: { id: string; name: string } };
}

// ─── Asset API ───

export async function getAssets(params?: {
  siteId: string;
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<AssetListResponse> {
  const sp = new URLSearchParams();
  if (params?.siteId) sp.set('siteId', params.siteId);
  if (params?.category) sp.set('category', params.category);
  if (params?.status) sp.set('status', params.status);
  if (params?.page) sp.set('page', String(params.page));
  if (params?.limit) sp.set('limit', String(params.limit));
  const qs = sp.toString();
  return api.get(`/maintenance/assets${qs ? `?${qs}` : ''}`);
}

export async function getAsset(id: string): Promise<ApiResponse<AssetData>> {
  return api.get(`/maintenance/assets/${id}`);
}

export async function createAsset(body: {
  siteId: string;
  name: string;
  category: string;
  model?: string;
  serialNumber?: string;
  manufacturer?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  location?: string;
  status?: string;
  notes?: string;
  imageUrl?: string;
}): Promise<ApiResponse<AssetData>> {
  return api.post('/maintenance/assets', body);
}

export async function updateAsset(id: string, body: Record<string, unknown>): Promise<ApiResponse<AssetData>> {
  return api.patch(`/maintenance/assets/${id}`, body);
}

export async function updateAssetStatus(id: string, status: string): Promise<ApiResponse<AssetData>> {
  return api.patch(`/maintenance/assets/${id}/status`, { status });
}

// ─── Ticket API ───

export async function getTickets(params?: {
  siteId: string;
  status?: string;
  priority?: string;
  category?: string;
  assignedToId?: string;
  page?: number;
  limit?: number;
}): Promise<TicketListResponse> {
  const sp = new URLSearchParams();
  if (params?.siteId) sp.set('siteId', params.siteId);
  if (params?.status) sp.set('status', params.status);
  if (params?.priority) sp.set('priority', params.priority);
  if (params?.category) sp.set('category', params.category);
  if (params?.assignedToId) sp.set('assignedToId', params.assignedToId);
  if (params?.page) sp.set('page', String(params.page));
  if (params?.limit) sp.set('limit', String(params.limit));
  const qs = sp.toString();
  return api.get(`/maintenance/tickets${qs ? `?${qs}` : ''}`);
}

export async function getTicket(id: string): Promise<ApiResponse<TicketData>> {
  return api.get(`/maintenance/tickets/${id}`);
}

export async function createTicket(body: {
  siteId: string;
  title: string;
  description: string;
  assetId?: string;
  priority?: string;
  category: string;
}): Promise<ApiResponse<TicketData>> {
  return api.post('/maintenance/tickets', body);
}

export async function updateTicket(id: string, body: Record<string, unknown>): Promise<ApiResponse<TicketData>> {
  return api.patch(`/maintenance/tickets/${id}`, body);
}

export async function assignTicket(
  id: string,
  body: { assignedToId?: string; vendorId?: string },
): Promise<ApiResponse<TicketData>> {
  return api.patch(`/maintenance/tickets/${id}/assign`, body);
}

export async function updateTicketStatus(id: string, status: string): Promise<ApiResponse<TicketData>> {
  return api.patch(`/maintenance/tickets/${id}/status`, { status });
}

export async function addTicketComment(id: string, content: string): Promise<ApiResponse<CommentData>> {
  return api.post(`/maintenance/tickets/${id}/comments`, { content });
}

export async function addTicketPhoto(id: string, url: string, caption?: string): Promise<ApiResponse<PhotoData>> {
  return api.post(`/maintenance/tickets/${id}/photos`, { url, caption });
}

// ─── Vendor API ───

export async function getVendors(category?: string): Promise<ApiResponse<VendorData[]>> {
  const qs = category ? `?category=${encodeURIComponent(category)}` : '';
  return api.get(`/maintenance/vendors${qs}`);
}

export async function createVendor(body: {
  name: string;
  category: string;
  contactName?: string;
  email?: string;
  phone?: string;
  rating?: number;
  isActive?: boolean;
}): Promise<ApiResponse<VendorData>> {
  return api.post('/maintenance/vendors', body);
}

export async function updateVendor(id: string, body: Record<string, unknown>): Promise<ApiResponse<VendorData>> {
  return api.patch(`/maintenance/vendors/${id}`, body);
}

// ─── Schedule API ───

export async function getSchedules(params?: {
  assetId?: string;
  siteId?: string;
}): Promise<ApiResponse<ScheduleData[]>> {
  const sp = new URLSearchParams();
  if (params?.assetId) sp.set('assetId', params.assetId);
  if (params?.siteId) sp.set('siteId', params.siteId);
  const qs = sp.toString();
  return api.get(`/maintenance/schedules${qs ? `?${qs}` : ''}`);
}

export async function createSchedule(body: {
  assetId: string;
  title: string;
  description?: string;
  frequency: string;
  nextDueAt?: string;
}): Promise<ApiResponse<ScheduleData>> {
  return api.post('/maintenance/schedules', body);
}

export async function updateSchedule(id: string, body: Record<string, unknown>): Promise<ApiResponse<ScheduleData>> {
  return api.patch(`/maintenance/schedules/${id}`, body);
}

export async function completeSchedule(id: string): Promise<ApiResponse<ScheduleData>> {
  return api.post(`/maintenance/schedules/${id}/complete`);
}
