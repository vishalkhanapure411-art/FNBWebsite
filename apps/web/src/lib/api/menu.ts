import { apiRequest } from '@/lib/api-client';
import type { ApiResponse } from '@omniops/shared';

export interface MenuData {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  menuType: string;
  isActive: boolean;
  availabilitySchedule?: any;
  categoryCount?: number;
  categories?: CategoryData[];
  tenant?: { id: string; name: string; slug: string };
  createdAt: string;
  updatedAt: string;
}

export interface CategoryData {
  id: string;
  menuId: string;
  name: string;
  description?: string;
  sortOrder: number;
  imageUrl?: string;
  itemCount?: number;
  items?: MenuItemData[];
  createdAt: string;
  updatedAt: string;
}

export interface MenuItemData {
  id: string;
  categoryId: string;
  menuId: string;
  name: string;
  description?: string;
  shortCode?: string;
  imageUrl?: string;
  price: number;
  costPrice?: number;
  taxRate: number;
  prepTimeMinutes: number;
  station: string;
  dietaryTags: string[];
  allergens: string[];
  status: string;
  sortOrder: number;
  modifierGroups?: ModifierGroupData[];
  createdAt: string;
  updatedAt: string;
}

export interface ModifierGroupData {
  id: string;
  menuItemId: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  required: boolean;
  sortOrder: number;
  modifiers?: ModifierData[];
}

export interface ModifierData {
  id: string;
  modifierGroupId: string;
  name: string;
  priceAdjustment: number;
  isDefault: boolean;
  sortOrder: number;
}

// ─── Menus ────────────────────────────────────────

export async function getMenus(params?: {
  tenantId?: string;
  menuType?: string;
  isActive?: boolean;
}): Promise<ApiResponse<MenuData[]>> {
  const sp = new URLSearchParams();
  if (params?.tenantId) sp.set('tenantId', params.tenantId);
  if (params?.menuType) sp.set('menuType', params.menuType);
  if (params?.isActive !== undefined) sp.set('isActive', String(params.isActive));
  const qs = sp.toString();
  return apiRequest(`/menu${qs ? `?${qs}` : ''}`);
}

export async function getMenu(id: string): Promise<ApiResponse<MenuData>> {
  return apiRequest(`/menu/${id}`);
}

export async function createMenu(data: Record<string, unknown>): Promise<ApiResponse<MenuData>> {
  return apiRequest('/menu', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateMenu(id: string, data: Record<string, unknown>): Promise<ApiResponse<MenuData>> {
  return apiRequest(`/menu/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteMenu(id: string): Promise<ApiResponse<any>> {
  return apiRequest(`/menu/${id}`, { method: 'DELETE' });
}

export async function assignMenuToSites(menuId: string, siteIds: string[]): Promise<ApiResponse<any>> {
  return apiRequest(`/menu/${menuId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ siteIds }),
  });
}

export async function unassignMenuFromSite(menuId: string, siteId: string): Promise<ApiResponse<any>> {
  return apiRequest(`/menu/${menuId}/assign/${siteId}`, { method: 'DELETE' });
}

export async function getAvailableMenu(siteId: string): Promise<ApiResponse<MenuData[]>> {
  return apiRequest(`/menu/available/${siteId}`);
}

// ─── Categories ──────────────────────────────────

export async function getCategories(menuId: string): Promise<ApiResponse<CategoryData[]>> {
  return apiRequest(`/menu/${menuId}/categories`);
}

export async function createCategory(menuId: string, data: Record<string, unknown>): Promise<ApiResponse<CategoryData>> {
  return apiRequest(`/menu/${menuId}/categories`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCategory(
  menuId: string,
  categoryId: string,
  data: Record<string, unknown>,
): Promise<ApiResponse<CategoryData>> {
  return apiRequest(`/menu/${menuId}/categories/${categoryId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteCategory(menuId: string, categoryId: string): Promise<ApiResponse<any>> {
  return apiRequest(`/menu/${menuId}/categories/${categoryId}`, { method: 'DELETE' });
}

// ─── Items ───────────────────────────────────────

export async function getItems(menuId: string, categoryId: string): Promise<ApiResponse<MenuItemData[]>> {
  return apiRequest(`/menu/${menuId}/categories/${categoryId}/items`);
}

export async function createItem(
  menuId: string,
  categoryId: string,
  data: Record<string, unknown>,
): Promise<ApiResponse<MenuItemData>> {
  return apiRequest(`/menu/${menuId}/categories/${categoryId}/items`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateItem(
  menuId: string,
  categoryId: string,
  itemId: string,
  data: Record<string, unknown>,
): Promise<ApiResponse<MenuItemData>> {
  return apiRequest(`/menu/${menuId}/categories/${categoryId}/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteItem(
  menuId: string,
  categoryId: string,
  itemId: string,
): Promise<ApiResponse<any>> {
  return apiRequest(`/menu/${menuId}/categories/${categoryId}/items/${itemId}`, { method: 'DELETE' });
}

// ─── Modifier Groups ─────────────────────────────

export async function getModifierGroups(itemId: string): Promise<ApiResponse<ModifierGroupData[]>> {
  return apiRequest(`/menu/items/${itemId}/modifier-groups`);
}

export async function createModifierGroup(
  itemId: string,
  data: Record<string, unknown>,
): Promise<ApiResponse<ModifierGroupData>> {
  return apiRequest(`/menu/items/${itemId}/modifier-groups`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateModifierGroup(
  itemId: string,
  groupId: string,
  data: Record<string, unknown>,
): Promise<ApiResponse<ModifierGroupData>> {
  return apiRequest(`/menu/items/${itemId}/modifier-groups/${groupId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteModifierGroup(itemId: string, groupId: string): Promise<ApiResponse<any>> {
  return apiRequest(`/menu/items/${itemId}/modifier-groups/${groupId}`, { method: 'DELETE' });
}

// ─── Modifiers ───────────────────────────────────

export async function getModifiers(groupId: string): Promise<ApiResponse<ModifierData[]>> {
  return apiRequest(`/menu/modifier-groups/${groupId}/modifiers`);
}

export async function createModifier(
  groupId: string,
  data: Record<string, unknown>,
): Promise<ApiResponse<ModifierData>> {
  return apiRequest(`/menu/modifier-groups/${groupId}/modifiers`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateModifier(
  groupId: string,
  modifierId: string,
  data: Record<string, unknown>,
): Promise<ApiResponse<ModifierData>> {
  return apiRequest(`/menu/modifier-groups/${groupId}/modifiers/${modifierId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteModifier(groupId: string, modifierId: string): Promise<ApiResponse<any>> {
  return apiRequest(`/menu/modifier-groups/${groupId}/modifiers/${modifierId}`, {
    method: 'DELETE',
  });
}
