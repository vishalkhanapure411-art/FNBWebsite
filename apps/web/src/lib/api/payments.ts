import { apiRequest } from '@/lib/api-client';
import type { ApiResponse } from '@omniops/shared';

export interface PaymentData {
  id: string;
  orderId: string;
  amount: number;
  method: string;
  status: string;
  gatewayTransactionId?: string;
  gatewayResponse?: Record<string, unknown>;
  refundReason?: string;
  refundApprovedBy?: string;
  createdAt: string;
  order?: {
    id: string;
    orderNumber: number;
    grandTotal: number;
    site?: { id: string; name: string; slug: string };
  };
}

export interface ProcessPaymentInput {
  orderId: string;
  method: string;
  gatewayData?: Record<string, unknown>;
}

export interface RefundPaymentInput {
  amount: number;
  reason?: string;
}

export interface SplitPaymentInput {
  orderId: string;
  payments: Array<{
    method: string;
    amount: number;
    gatewayData?: Record<string, unknown>;
  }>;
}

export interface PaymentQueryParams {
  orderId?: string;
  siteId?: string;
  method?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

function buildQueryString(params: PaymentQueryParams): string {
  const sp = new URLSearchParams();
  if (params.orderId) sp.set('orderId', params.orderId);
  if (params.siteId) sp.set('siteId', params.siteId);
  if (params.method) sp.set('method', params.method);
  if (params.status) sp.set('status', params.status);
  if (params.dateFrom) sp.set('dateFrom', params.dateFrom);
  if (params.dateTo) sp.set('dateTo', params.dateTo);
  if (params.page) sp.set('page', String(params.page));
  if (params.limit) sp.set('limit', String(params.limit));
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export async function processPayment(
  data: ProcessPaymentInput,
): Promise<ApiResponse<PaymentData>> {
  return apiRequest('/payments/process', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function splitPayment(
  data: SplitPaymentInput,
): Promise<ApiResponse<any>> {
  return apiRequest('/payments/split', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function refundPayment(
  id: string,
  data: RefundPaymentInput,
): Promise<ApiResponse<PaymentData>> {
  return apiRequest(`/payments/${id}/refund`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function voidPayment(id: string): Promise<ApiResponse<PaymentData>> {
  return apiRequest(`/payments/${id}/void`, { method: 'POST' });
}

export async function getPayments(
  params: PaymentQueryParams = {},
): Promise<ApiResponse<PaymentData[]>> {
  return apiRequest(`/payments${buildQueryString(params)}`);
}

export async function getPayment(id: string): Promise<ApiResponse<PaymentData>> {
  return apiRequest(`/payments/${id}`);
}

export async function getOrderPayments(
  orderId: string,
): Promise<ApiResponse<PaymentData[]>> {
  return apiRequest(`/payments/order/${orderId}`);
}
