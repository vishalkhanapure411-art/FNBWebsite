import { api } from '@/lib/api-client';
// ─── Types ───
export type ForecastHorizon = 7 | 14 | 30;
export interface HistoricalPoint {
  date: string;
  revenue: number;
  orders: number;
}
export interface ForecastPoint {
  date: string;
  revenue: number;
  orders: number;
  lower: number;
  upper: number;
}
export interface ForecastMeta {
  historyDays: number;
  mape: number | null; // in-sample MAPE %, null when no non-zero day
  trend: number; // dampened daily trend ($/day)
  notes: string[];
}
export interface DemandForecast {
  siteId: string;
  method: string;
  generatedAt: string;
  horizon: number;
  historical: HistoricalPoint[];
  forecast: ForecastPoint[];
  meta: ForecastMeta;
}
export interface DemandForecastParams {
  siteId: string;
  horizon?: ForecastHorizon;
}
/**
 * Statistical demand forecast (weekday seasonality + dampened trend) for a
 * single site. Mirrors the execAnalytics client module.
 */
export async function getDemandForecast(
  params: DemandForecastParams,
): Promise<{ success: boolean; data: DemandForecast }> {
  const sp = new URLSearchParams();
  sp.set('siteId', params.siteId);
  if (params.horizon) sp.set('horizon', String(params.horizon));
  return api.get(`/forecasting/demand?${sp.toString()}`);
}
