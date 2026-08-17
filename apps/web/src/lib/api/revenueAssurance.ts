import { api } from '@/lib/api-client';

// ─── Types ───
export type AnomalyCategory =
  | 'MISSING_PAYMENT'
  | 'VOID_REFUND_SPIKE'
  | 'DISCOUNT_OUTLIER'
  | 'PAYMENT_MISMATCH'
  | 'NO_SALE';

export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AnomalyData {
  id: string;
  category: AnomalyCategory;
  severity: AnomalySeverity;
  siteId: string;
  orderId: string;
  orderNumber: number;
  reference: string;
  description: string;
  amount: number;
  detectedAt: string;
}

export interface CategoryBreakdown {
  category: AnomalyCategory;
  count: number;
  value: number;
  severity: AnomalySeverity;
}

export interface RevenueAssuranceSummary {
  siteId: string;
  from: string;
  to: string;
  totalOrders: number;
  totalRevenue: number;
  anomalyCount: number;
  anomalyValue: number;
  riskScore: number;
  byCategory: CategoryBreakdown[];
}

export interface AnomalyListResponse {
  success: boolean;
  data: AnomalyData[];
  meta?: { page: number; limit: number; total: number };
}

export interface RevenueAssuranceParams {
  siteId: string;
  from?: string;
  to?: string;
  category?: AnomalyCategory;
  severity?: AnomalySeverity;
  page?: number;
  limit?: number;
}

function buildQuery(params: RevenueAssuranceParams): string {
  const sp = new URLSearchParams();
  sp.set('siteId', params.siteId);
  if (params.from) sp.set('from', params.from);
  if (params.to) sp.set('to', params.to);
  if (params.category) sp.set('category', params.category);
  if (params.severity) sp.set('severity', params.severity);
  if (params.page) sp.set('page', String(params.page));
  if (params.limit) sp.set('limit', String(params.limit));
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export async function getRevenueAssuranceSummary(
  params: RevenueAssuranceParams,
): Promise<{ success: boolean; data: RevenueAssuranceSummary }> {
  return api.get(`/revenue-assurance/summary${buildQuery(params)}`);
}

export async function getRevenueAssuranceAnomalies(
  params: RevenueAssuranceParams,
): Promise<AnomalyListResponse> {
  return api.get(`/revenue-assurance/anomalies${buildQuery(params)}`);
}
