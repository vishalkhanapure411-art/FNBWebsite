import { api } from '@/lib/api-client';

// ── Types ─────────────────────────────────────────────────────────────
export type DeviceType = 'KDS_SCREEN' | 'CDS_SCREEN' | 'KOT_PRINTER';
export type Station = 'GRILL' | 'FRY' | 'COLD' | 'DRINKS' | 'DESSERT' | 'EXPO';

export interface Device {
  id: string;
  tenantId: string;
  siteId: string;
  name: string;
  type: DeviceType;
  deviceId: string;
  station: Station | null;
  ipAddress: string | null;
  isOnline: boolean;
  lastHeartbeat: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  site?: { id: string; name: string } | null;
}

export interface ProductRouting {
  id: string;
  tenantId: string;
  siteId: string;
  menuItemId: string;
  station: Station;
  printerId: string | null;
  createdAt: string;
  updatedAt: string;
  menuItem?: { id: string; name: string } | null;
  printer?: { id: string; name: string; deviceId: string; type?: DeviceType } | null;
  site?: { id: string; name: string } | null;
}

// ── Devices ───────────────────────────────────────────────────────────
export async function listDevices(siteId?: string, type?: DeviceType) {
  const sp = new URLSearchParams();
  if (siteId) sp.set('siteId', siteId);
  if (type) sp.set('type', type);
  const qs = sp.toString();
  return api.get<{ success: boolean; data: Device[] }>(`/it/devices${qs ? `?${qs}` : ''}`);
}

export async function getDevice(id: string) {
  return api.get<{ success: boolean; data: Device }>(`/it/devices/${id}`);
}

export async function createDevice(body: {
  name: string;
  type: DeviceType;
  deviceId: string;
  siteId: string;
  station?: Station | null;
  ipAddress?: string;
  notes?: string;
}) {
  return api.post<{ success: boolean; data: Device }>('/it/devices', body);
}

export async function updateDevice(
  id: string,
  body: Partial<{
    name: string;
    type: DeviceType;
    station: Station | null;
    ipAddress: string | null;
    notes: string | null;
    isOnline: boolean;
    lastHeartbeat: string;
  }>,
) {
  return api.patch<{ success: boolean; data: Device }>(`/it/devices/${id}`, body);
}

export async function deleteDevice(id: string) {
  return api.delete<{ success: boolean; data: { id: string; deleted: boolean } }>(`/it/devices/${id}`);
}

// ── Product routings ──────────────────────────────────────────────────
export async function listRoutings(siteId?: string, station?: Station, menuItemId?: string) {
  const sp = new URLSearchParams();
  if (siteId) sp.set('siteId', siteId);
  if (station) sp.set('station', station);
  if (menuItemId) sp.set('menuItemId', menuItemId);
  const qs = sp.toString();
  return api.get<{ success: boolean; data: ProductRouting[] }>(`/it/routings${qs ? `?${qs}` : ''}`);
}

export async function getRouting(id: string) {
  return api.get<{ success: boolean; data: ProductRouting }>(`/it/routings/${id}`);
}

export async function createRouting(body: {
  menuItemId: string;
  station: Station;
  siteId: string;
  printerId?: string | null;
}) {
  return api.post<{ success: boolean; data: ProductRouting }>('/it/routings', body);
}

export async function updateRouting(
  id: string,
  body: Partial<{ station: Station; printerId: string | null }>,
) {
  return api.patch<{ success: boolean; data: ProductRouting }>(`/it/routings/${id}`, body);
}

export async function deleteRouting(id: string) {
  return api.delete<{ success: boolean; data: { id: string; deleted: boolean } }>(`/it/routings/${id}`);
}