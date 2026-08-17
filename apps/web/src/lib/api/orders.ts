import { apiRequest } from '@/lib/api-client';
import type { ApiResponse } from '@omniops/shared';

export interface OrderData {
  id: string;
  tenantId: string;
  siteId: string;
  userId?: string;
  orderNumber: number;
  orderNumberDisplay?: string;
  orderType: string;
  channel: string;
  status: string;
  subTotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  tableId?: string;
  guestCount: number;
  notes?: string;
  itemCount?: number;
  items?: OrderItemData[];
  discounts?: DiscountData[];
  payments?: PaymentData[];
  table?: { number: string };
  site?: { id: string; name: string; slug: string };
  user?: { id: string; firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

export interface OrderItemData {
  id: string;
  orderId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
  station: string;
  status: string;
  notes?: string;
  firedAt?: string;
  completedAt?: string;
  modifiers?: OrderItemModifierData[];
  createdAt: string;
}

export interface OrderItemModifierData {
  id: string;
  orderItemId: string;
  modifierName: string;
  priceAdjustment: number;
}

export interface DiscountData {
  id: string;
  orderId: string;
  type: string;
  value: number;
  reason?: string;
  approvedBy?: string;
  createdAt: string;
}

export interface PaymentData {
  id: string;
  orderId: string;
  amount: number;
  method: string;
  status: string;
  gatewayTransactionId?: string;
  createdAt: string;
}

export interface KitchenQueueItem {
  orderId: string;
  orderNumber: string;
  orderType: string;
  tableNumber: string | null;
  guestCount?: number;
  itemId: string;
  itemName: string;
  quantity: number;
  modifiers: Array<string | { modifierName: string; priceAdjustment: number }>;
  notes: string | null;
  status: string;
  elapsedSeconds: number;
  priority: boolean;
  createdAt: string;
}

export interface KitchenQueue {
  GRILL: KitchenQueueItem[];
  FRY: KitchenQueueItem[];
  COLD: KitchenQueueItem[];
  DRINKS: KitchenQueueItem[];
  DESSERT: KitchenQueueItem[];
  EXPO: KitchenQueueItem[];
}

export interface OrdersQueryParams {
  siteId?: string;
  status?: string;
  orderType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

function buildQueryString(params: OrdersQueryParams): string {
  const sp = new URLSearchParams();
  if (params.siteId) sp.set('siteId', params.siteId);
  if (params.status) sp.set('status', params.status);
  if (params.orderType) sp.set('orderType', params.orderType);
  if (params.dateFrom) sp.set('dateFrom', params.dateFrom);
  if (params.dateTo) sp.set('dateTo', params.dateTo);
  if (params.search) sp.set('search', params.search);
  if (params.page) sp.set('page', String(params.page));
  if (params.limit) sp.set('limit', String(params.limit));
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

// ─── Orders CRUD ──────────────────────────────────

export async function getOrders(params: OrdersQueryParams = {}): Promise<ApiResponse<OrderData[]>> {
  return apiRequest(`/orders${buildQueryString(params)}`);
}

export async function getOrder(id: string): Promise<ApiResponse<OrderData>> {
  return apiRequest(`/orders/${id}`);
}

export async function createOrder(data: {
  siteId: string;
  orderType: string;
  channel?: string;
  tableId?: string;
  guestCount?: number;
  items: Array<{
    menuItemId: string;
    quantity: number;
    modifiers?: Array<{ modifierName: string; priceAdjustment?: number }>;
    notes?: string;
  }>;
  notes?: string;
}): Promise<ApiResponse<OrderData>> {
  return apiRequest('/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
): Promise<ApiResponse<OrderData>> {
  return apiRequest(`/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function addOrderItem(
  orderId: string,
  data: {
    menuItemId: string;
    quantity: number;
    modifiers?: Array<{ modifierName: string; priceAdjustment?: number }>;
    notes?: string;
  },
): Promise<ApiResponse<{ item: OrderItemData; order: OrderData }>> {
  return apiRequest(`/orders/${orderId}/items`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function cancelOrderItem(
  orderId: string,
  itemId: string,
): Promise<ApiResponse<OrderData>> {
  return apiRequest(`/orders/${orderId}/items/${itemId}/cancel`, { method: 'PATCH' });
}

export async function applyDiscount(
  orderId: string,
  data: { type: string; value: number; reason?: string },
): Promise<ApiResponse<{ discount: DiscountData; order: OrderData }>> {
  return apiRequest(`/orders/${orderId}/discounts`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function removeDiscount(
  orderId: string,
  discountId: string,
): Promise<ApiResponse<OrderData>> {
  return apiRequest(`/orders/${orderId}/discounts/${discountId}`, { method: 'DELETE' });
}

export async function cancelOrder(orderId: string): Promise<ApiResponse<any>> {
  return apiRequest(`/orders/${orderId}/cancel`, { method: 'POST' });
}

export async function getKitchenQueue(siteId: string): Promise<ApiResponse<KitchenQueue>> {
  return apiRequest(`/orders/kitchen-queue?siteId=${siteId}`);
}
