# Revenue Assurance Module (Phase 4)

Detection engine + API for revenue-leak anomalies over real Order/Payment data.
Implemented as a standalone module (not inside `analytics`) because it has its own
rule set, severity model, and paged list endpoint — the analytics module is
pure aggregation, while this module encodes business rules with thresholds.

## Endpoints (auth: SUPER_ADMIN, BRAND_MANAGER, SITE_LEAD)

- `GET /api/revenue-assurance/summary?siteId&from&to&category&severity`
  → `{ success, data: { siteId, from, to, totalOrders, totalRevenue, anomalyCount,
    anomalyValue, riskScore, byCategory: [{ category, count, value, severity }] } }`
- `GET /api/revenue-assurance/anomalies?siteId&from&to&category&severity&page&limit`
  → `{ success, data: [anomaly...], meta: { page, limit, total } }`

Anomaly shape: `{ id, category, severity (LOW|MEDIUM|HIGH), siteId, orderId,
orderNumber, reference, description, amount, detectedAt }`.

`from`/`to` default to last 30 days → now. `siteId` required (or falls back to
`user.siteId`); non-SUPER_ADMIN scoped to their tenant (same convention as analytics).

## Rules (thresholds)

| Category | Trigger | Severity |
|---|---|---|
| `MISSING_PAYMENT` | Order in CONFIRMED…COMPLETED, grandTotal > 0, no payments (non-FAILED) | HIGH ≥ $100, MEDIUM ≥ $30, else LOW |
| `VOID_REFUND_SPIKE` | Per site/day: ≥ 3 voided/refunded orders (status CANCELLED/REFUNDED or payment VOIDED/REFUNDED/PARTIALLY_REFUNDED), or their value > 20% of the day's order value. Flags each offending order. | HIGH if value > $200 or ratio > 30%, else MEDIUM |
| `DISCOUNT_OUTLIER` | discountTotal > 30% of subTotal (subTotal > 0) | HIGH if > 50% or fully comped (grandTotal ≤ 0), else MEDIUM |
| `PAYMENT_MISMATCH` | Sum of applied payments (PENDING/AUTHORIZED/CAPTURED/PARTIALLY_REFUNDED) differs from grandTotal by > $0.01 (orders in CONFIRMED…COMPLETED with ≥ 1 payment) | HIGH if diff > $50 or > 10% of total, else MEDIUM |
| `NO_SALE` | CONFIRMED…COMPLETED order with subTotal = 0 and zero items | LOW |

`riskScore = min(100, round(50 * anomalyValue / totalRevenue + 3 * anomalyCount))`.
`totalOrders` = non-DRAFT orders in range; `totalRevenue` = sum of grandTotal for
non-CANCELLED/REFUNDED/DRAFT orders.

## Demo data

Seed section 6 creates 14 orders (6 clean + 8 deliberately anomalous: missing
payment, 55% discount, fully-comped order, 3-order void/refund spike on one day,
payment under-capture, zero-value no-sale) across both demo sites, with matching
OrderItems, Discounts, and Payments.
