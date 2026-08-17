# Forecasting Module — AI-Assisted Demand Forecasting

Predicts future daily revenue + order counts per site from historical order
data using a **deterministic, explainable statistical model** (no external AI
API — none is available). The UI is explicit that this is a statistical model
with limited-history caveats.

## Endpoint

`GET /api/forecasting/demand?siteId=<id>&horizon=14`

- `horizon`: `7 | 14 | 30`, default `14`.
- Roles: `SUPER_ADMIN`, `BRAND_MANAGER`, `SITE_LEAD` (same gate as site-level
  analytics / revenue assurance). Non-super users are pinned to their tenant
  during site lookup; `SUPER_ADMIN` passes an explicit `siteId` to query any
  site. Invalid site → `400 Site not found`. Missing token → `401`.

Response `{ success, data }`:

```ts
{
  siteId, method: 'weekday-seasonality-trend', generatedAt, horizon,
  historical: [{ date, revenue, orders }],   // daily, zero-filled, trailing 60 days (UTC)
  forecast:  [{ date, revenue, orders, lower, upper }], // horizon entries, starting tomorrow
  meta: { historyDays, mape /* % | null */, trend /* dampened $/day */, notes: string[] }
}
```

`lower`/`upper` are the **revenue** confidence bounds. Order forecasts are the
same model run on the daily order-count series (rounded to 1 dp), so the
implied average check stays coherent.

## Model math (see `forecasting.service.ts` header for full docs)

1. Base series: orders with `status NOT IN ('CANCELLED','REFUNDED')`
   (identical revenue definition to analytics/exec-analytics), grouped by UTC
   day, zero-filled over the trailing 60 calendar days ending end-of-today.
2. Weekday seasonality: mean per weekday, normalized so the average factor is
   1 (clamped to [1/3, 3]). Enabled only with ≥ 14 calendar days AND ≥ 14
   days with orders — otherwise factors are flat 1.0 (spec's "< 2 weeks →
   fall back to overall average").
3. Trend: least-squares linear-regression slope, dampened ×0.5.
4. Recent level: mean of the trailing 7 days (whole series if shorter).
5. Forecast day k: `max(0, factor(weekday) × level + dampenedSlope × k)`.
6. Bounds: `±1.5 × population std dev` of the daily series, or `±20%` of the
   forecast when std dev ≈ 0; clamped ≥ 0, lower ≤ value ≤ upper.
7. `meta.mape`: in-sample MAPE (%) over days with revenue > 0 (capped 100%),
   `null` when no non-zero day — a fit-quality indicator, not a guarantee.
8. No orders → `200` with empty `historical`, zero `forecast` of horizon
   length, and an "insufficient data" meta note.

## Files

- `forecasting.controller.ts` / `forecasting.service.ts` / `forecasting.module.ts`
- `dto/forecasting-query.dto.ts` (siteId, horizon 7|14|30)

Web: `apps/web/src/app/sites/[id]/forecasting` page (horizon selector, line
chart of history + dashed forecast, forecast table), 
`apps/web/src/lib/api/forecasting.ts`, nav tab in `apps/web/src/app/sites/[id]/layout.tsx`.
The LineChart component was extended with an optional `overlay` series prop
(dashed, distinct color) for the forecast line.
