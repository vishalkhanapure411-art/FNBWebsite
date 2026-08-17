import { api } from '@/lib/api-client';

// ─── Types ───
export type ExecGranularity = 'day' | 'week';

export interface TrendPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface ExecOverview {
  tenantId: string;
  from: string;
  to: string;
  granularity: ExecGranularity;
  totalRevenue: number;
  totalOrders: number;
  avgCheck: number;
  activeSites: number;
  anomalyCount: number;
  anomalyValue: number;
  avgNps: number | null;
  trend: TrendPoint[];
}

export interface SiteComparisonRow {
  siteId: string;
  siteName: string;
  revenue: number;
  orders: number;
  avgCheck: number;
  anomalyCount: number;
  anomalyValue: number;
  npsScore: number | null;
  revenueRank: number;
  anomalyRank: number;
}

export interface SiteComparison {
  tenantId: string;
  from: string;
  to: string;
  sites: SiteComparisonRow[];
}

export interface ExecAnalyticsParams {
  tenantId?: string;
  from?: string;
  to?: string;
  granularity?: ExecGranularity;
}

function buildQuery(params: ExecAnalyticsParams): string {
  const sp = new URLSearchParams();
  if (params.tenantId) sp.set('tenantId', params.tenantId);
  if (params.from) sp.set('from', params.from);
  if (params.to) sp.set('to', params.to);
  if (params.granularity) sp.set('granularity', params.granularity);
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export async function getExecOverview(
  params: ExecAnalyticsParams,
): Promise<{ success: boolean; data: ExecOverview }> {
  return api.get(`/exec-analytics/overview${buildQuery(params)}`);
}

export async function getSiteComparison(
  params: ExecAnalyticsParams,
): Promise<{ success: boolean; data: SiteComparison }> {
  return api.get(`/exec-analytics/site-comparison${buildQuery(params)}`);
}
