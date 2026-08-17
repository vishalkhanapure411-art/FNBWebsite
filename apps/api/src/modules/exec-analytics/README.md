# Exec Analytics (Phase 4)

Tenant-wide, cross-site analytics for executives (SUPER_ADMIN / BRAND_MANAGER).

## Endpoints

- `GET /api/exec-analytics/overview?from&to&granularity&tenantId`
- `GET /api/exec-analytics/site-comparison?from&to&tenantId`

Both are JWT-protected and gated to `SUPER_ADMIN` + `BRAND_MANAGER` (SITE_LEAD → 403).
There is no `TENANT_ADMIN` role in this codebase — `BRAND_MANAGER` is the tenant-admin
role (same gate as the site-level benchmarking endpoint).

## Tenant scoping

- `BRAND_MANAGER` is always pinned to `user.tenantId` (cross-tenant → 403).
- `SUPER_ADMIN` may pass `?tenantId=` to query any tenant; without it, defaults to the
  first tenant (by `createdAt`) so the admin UI works without a tenant picker.

## Revenue definition

`totalRevenue` = sum of `order.grandTotal` for orders with `status NOT IN ('CANCELLED','REFUNDED')`
in `[from, to)` — identical to the site-level analytics module (sales summary, realtime,
costs, benchmarking). DRAFT orders carry `grandTotal 0` and are included for consistency.

## Anomaly aggregation

`anomalyCount` / `anomalyValue` come from `RevenueAssuranceService.getSummary` per site
(over the same window) summed across sites. The RA engine runs over non-DRAFT orders —
including CANCELLED/REFUNDED — so anomaly metrics deliberately span a slightly different
order set than the revenue KPI (that is how void/refund spikes are caught).

## NPS aggregation

Per-site NPS = average of per-survey NPS scores (via `SurveysService.getAnalytics`, reused)
across surveys at that site with ≥1 NPS answer. `avgNps` = average of per-site NPS across
sites with responses; `null` when no site has responses (UI renders "—").

## Files

- `exec-analytics.controller.ts` / `exec-analytics.service.ts` / `exec-analytics.module.ts`
- `dto/exec-analytics-query.dto.ts` (from, to, granularity day|week, tenantId)

Web: `apps/web/src/app/admin/analytics` page, `apps/web/src/lib/api/execAnalytics.ts`,
`apps/web/src/components/charts/LineChart.tsx`, sidebar "Exec Analytics" link
(`apps/web/src/components/sidebar.tsx`), role map in `apps/web/src/app/admin/layout.tsx`.
