# Field Reports Module

Structured reports submitted from the field (multi-site managers, maintenance
contractors, inspectors) — observations/issues per site — and reviewed by management.

## Models

- **FieldReport** — `tenantId`, `siteId`, `category` (SAFETY | QUALITY | MAINTENANCE | COMPLIANCE | OTHER),
  `severity` (LOW | MEDIUM | HIGH | CRITICAL), `title`, `description`,
  `status` (NEW | REVIEWED | ACTIONED | DISMISSED), `reportedById`, timestamps.
- **FieldReportComment** — `reportId`, `authorId`, `body`, `createdAt`.

## Endpoints (all JWT + RolesGuard, `{ success, data, meta? }` envelope)

| Method | Path                         | Roles | Notes |
|--------|------------------------------|-------|-------|
| POST   | `/api/field-reports`         | SUPER_ADMIN, BRAND_MANAGER, SITE_LEAD, MAINTENANCE_TECH, QUALITY_AUDITOR | Create; `reportedById = user.sub`. siteId must belong to caller's tenant (404 otherwise). |
| GET    | `/api/field-reports`         | same as above | Query: `siteId` (optional; tenant fallback for non-SUPER_ADMIN), `status`, `severity`, `category`, `page`, `limit`. SUPER_ADMIN without siteId sees all tenants. Includes reportedBy + comments. |
| PATCH  | `/api/field-reports/:id/status` | SUPER_ADMIN, BRAND_MANAGER, SITE_LEAD | Server-side validated transitions (below). |
| POST   | `/api/field-reports/:id/comments` | same as create | Adds a comment; `authorId = user.sub`. |

## Status transition rules

```
NEW      → REVIEWED | DISMISSED
REVIEWED → ACTIONED | DISMISSED
ACTIONED → (terminal)
DISMISSED → (terminal)
```

Invalid transitions return 400 with the allowed targets. Reports are
tenant-scoped via `verifySiteAccess` / `verifyReportAccess` (SUPER_ADMIN exempt).

## Notes

- Field staff can submit and comment; only management (SUPER_ADMIN / BRAND_MANAGER / SITE_LEAD)
  can move a report through review statuses.
- Tenant/site isolation mirrors the maintenance module (same verify pattern, JWT `user.sub`).
