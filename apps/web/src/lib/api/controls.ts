import { api } from '@/lib/api-client';

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
  supplier: string | null;
  active: boolean;
  _count?: { recipeLines: number };
}

export interface RecipeLine {
  id: string;
  ingredientId: string;
  qty: number;
  unit: string;
  ingredient?: { id: string; name: string; unit: string; costPerUnit: number };
}

export interface Recipe {
  id: string;
  menuItemId: string;
  name: string;
  yieldQty: number;
  version: number;
  costPerServe: number;
  active: boolean;
  menuItem?: { id: string; name: string; price: number };
  lines?: RecipeLine[];
}

export interface CogsRow {
  menuItemId: string;
  name: string;
  qty: number;
  revenue: number;
  cost: number;
}

export interface CogsData {
  siteId: string;
  siteName: string;
  from: string;
  to: string;
  perItem: CogsRow[];
  uncostedItems: string[];
  totals: { revenue: number; cogs: number; grossMargin: number; marginPct: number };
}

export interface ClosingPeriod {
  id: string;
  tenantId: string;
  siteId: string | null;
  label: string;
  startDate: string;
  endDate: string;
  status: 'OPEN' | 'LOCKED';
  revenue: number;
  cogs: number;
  grossMargin: number;
  closedAt: string | null;
  closedBy?: { id: string; email: string } | null;
  site?: { id: string; name: string } | null;
}

// ── Ingredients ──
export async function listIngredients(active?: string) {
  const qs = active ? `?active=${active}` : '';
  return api.get<{ success: boolean; data: Ingredient[] }>(`/controls/ingredients${qs}`);
}
export async function createIngredient(body: { name: string; unit: string; costPerUnit: number; supplier?: string; siteId?: string }) {
  return api.post<{ success: boolean; data: Ingredient }>('/controls/ingredients', body);
}
export async function updateIngredient(id: string, body: Partial<{ name: string; unit: string; costPerUnit: number; supplier: string; active: boolean }>) {
  return api.patch<{ success: boolean; data: Ingredient }>(`/controls/ingredients/${id}`, body);
}
export async function deleteIngredient(id: string) {
  return api.delete<{ success: boolean; data: { id: string } }>(`/controls/ingredients/${id}`);
}

// ── Recipes ──
export async function listRecipes(active?: string) {
  const qs = active ? `?active=${active}` : '';
  return api.get<{ success: boolean; data: Recipe[] }>(`/controls/recipes${qs}`);
}
export async function createRecipe(body: { menuItemId: string; name?: string; yieldQty?: number; lines: { ingredientId: string; qty: number; unit: string }[] }) {
  return api.post<{ success: boolean; data: Recipe }>('/controls/recipes', body);
}
export async function updateRecipe(id: string, body: { name?: string; yieldQty?: number; active?: boolean; lines: { ingredientId: string; qty: number; unit: string }[] }) {
  return api.patch<{ success: boolean; data: Recipe }>(`/controls/recipes/${id}`, body);
}
export async function getRecipeVersions(id: string) {
  return api.get<{ success: boolean; data: Recipe[] }>(`/controls/recipes/${id}/versions`);
}

// ── COGS ──
export async function getCogs(params: { siteId?: string; from?: string; to?: string }) {
  const sp = new URLSearchParams();
  if (params.siteId) sp.set('siteId', params.siteId);
  if (params.from) sp.set('from', params.from);
  if (params.to) sp.set('to', params.to);
  const qs = sp.toString();
  return api.get<{ success: boolean; data: CogsData }>(`/controls/cogs${qs ? `?${qs}` : ''}`);
}

// ── Month closings ──
export async function listClosings(siteId?: string) {
  const qs = siteId ? `?siteId=${siteId}` : '';
  return api.get<{ success: boolean; data: ClosingPeriod[] }>(`/controls/closings${qs}`);
}
export async function createClosingPeriod(body: { siteId?: string; label: string; startDate: string; endDate: string }) {
  return api.post<{ success: boolean; data: ClosingPeriod }>('/controls/closings', body);
}
export async function closeClosingPeriod(id: string) {
  return api.post<{ success: boolean; data: ClosingPeriod }>(`/controls/closings/${id}/close`);
}
