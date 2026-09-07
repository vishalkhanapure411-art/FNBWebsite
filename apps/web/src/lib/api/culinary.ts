import { api } from '@/lib/api-client';

// ── Types ─────────────────────────────────────────────────────────────
export type MenuPlanStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type IndentStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'ISSUED' | 'CANCELLED';
export type MealSlot = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACKS' | 'ALL_DAY';

export interface MenuPlanItem {
  id: string;
  menuPlanId: string;
  menuItemId: string;
  dayIndex: number | null;
  mealSlot: MealSlot | null;
  plannedQty: number;
  menuItem?: { id: string; name: string; price: number };
}

export interface MenuPlan {
  id: string;
  tenantId: string;
  siteId: string | null;
  name: string;
  startDate: string;
  endDate: string;
  status: MenuPlanStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items?: MenuPlanItem[];
  _count?: { indents: number };
}

export interface IndentLine {
  id: string;
  indentId: string;
  ingredientId: string;
  requiredQty: number;
  unit: string;
  ingredient?: { id: string; name: string; unit: string };
}

export interface Indent {
  id: string;
  tenantId: string;
  siteId: string | null;
  menuPlanId: string;
  label: string;
  status: IndentStatus;
  notes: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  issuedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lines?: IndentLine[];
  menuPlan?: { id: string; name: string };
  site?: { id: string; name: string } | null;
}

// ── Menu plans ───────────────────────────────────────────────────────
export async function listPlans(status?: MenuPlanStatus, siteId?: string) {
  const sp = new URLSearchParams();
  if (status) sp.set('status', status);
  if (siteId) sp.set('siteId', siteId);
  const qs = sp.toString();
  return api.get<{ success: boolean; data: MenuPlan[] }>(`/culinary/plans${qs ? `?${qs}` : ''}`);
}

export async function getPlan(id: string) {
  return api.get<{ success: boolean; data: MenuPlan }>(`/culinary/plans/${id}`);
}

export async function createPlan(body: {
  name: string;
  siteId?: string;
  startDate: string;
  endDate: string;
  notes?: string;
}) {
  return api.post<{ success: boolean; data: MenuPlan }>('/culinary/plans', body);
}

export async function updatePlan(
  id: string,
  body: Partial<{ name: string; startDate: string; endDate: string; notes: string; status: MenuPlanStatus }>,
) {
  return api.patch<{ success: boolean; data: MenuPlan }>(`/culinary/plans/${id}`, body);
}

export async function replacePlanItems(id: string, body: { items: { menuItemId: string; dayIndex?: number; mealSlot?: MealSlot; plannedQty?: number }[] }) {
  return api.post<{ success: boolean; data: MenuPlan }>(`/culinary/plans/${id}/items`, body);
}

export async function deletePlan(id: string) {
  return api.delete<{ success: boolean; data: { id: string; deleted: boolean } }>(`/culinary/plans/${id}`);
}

// ── Indents ──────────────────────────────────────────────────────────
export async function listIndents(status?: IndentStatus, siteId?: string) {
  const sp = new URLSearchParams();
  if (status) sp.set('status', status);
  if (siteId) sp.set('siteId', siteId);
  const qs = sp.toString();
  return api.get<{ success: boolean; data: Indent[] }>(`/culinary/indents${qs ? `?${qs}` : ''}`);
}

export async function getIndent(id: string) {
  return api.get<{ success: boolean; data: Indent }>(`/culinary/indents/${id}`);
}

export async function createIndent(body: { menuPlanId: string; siteId?: string; label?: string; notes?: string }) {
  return api.post<{ success: boolean; data: Indent }>('/culinary/indents', body);
}

export async function submitIndent(id: string) {
  return api.post<{ success: boolean; data: Indent }>(`/culinary/indents/${id}/submit`);
}

export async function approveIndent(id: string) {
  return api.post<{ success: boolean; data: Indent }>(`/culinary/indents/${id}/approve`);
}

export async function issueIndent(id: string) {
  return api.post<{ success: boolean; data: Indent }>(`/culinary/indents/${id}/issue`);
}

export async function cancelIndent(id: string) {
  return api.post<{ success: boolean; data: Indent }>(`/culinary/indents/${id}/cancel`);
}

export async function deleteIndent(id: string) {
  return api.delete<{ success: boolean; data: { id: string; deleted: boolean } }>(`/culinary/indents/${id}`);
}