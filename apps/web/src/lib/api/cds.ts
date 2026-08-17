import { apiRequest } from '@/lib/api-client';

export interface CdsOrderView {
  orderNumber: string;
  orderType: string;
  table: string | null;
  guestCount: number;
  items: CdsOrderItem[];
  subtotal: number;
  tax: number;
  discounts: CdsDiscount[];
  grandTotal: number;
  payments: CdsPayment[];
  status: string;
  siteName: string;
}

export interface CdsOrderItem {
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
  modifiers: string[];
  status: string;
}

export interface CdsDiscount {
  type: string;
  value: number;
  amount: number;
}

export interface CdsPayment {
  method: string;
  amount: number;
}

export interface CdsUpsell {
  id: string;
  type: string;
  name: string;
  description: string;
  comboPrice?: number;
  priceAdjustment?: number;
}

export interface CdsUpsellsResponse {
  upsells: CdsUpsell[];
}

export async function getCdsOrderView(orderId: string): Promise<CdsOrderView> {
  return apiRequest(`/cds/order/${orderId}`);
}

export async function getCdsUpsells(siteId: string): Promise<CdsUpsellsResponse> {
  return apiRequest(`/cds/upsells/${siteId}`);
}
