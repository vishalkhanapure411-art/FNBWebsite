# OmniOps

Unified multi-tenant hospitality operations platform: Next.js 14 web app + NestJS API + Prisma/PostgreSQL + Redis/RabbitMQ + Expo (React Native) mobile app, covering POS/OMS, KDS, staff management, maintenance, quality audits, surveys, revenue assurance, forecasting, and field reporting.

## Structure

- `apps/web` — Next.js 14 web console (admin + site operations)
- `apps/api` — NestJS backend (JWT auth, RBAC, tenant isolation, Socket.io)
- `database/` — Prisma schema (44 models), seed, and DB bring-up config
- `mobile/` — Expo SDK 52 app (customer surveys + staff mode)
- `packages/shared` — shared TypeScript enums/entities

## Bring-up

Full stack bring-up steps (PostgreSQL 16 + schema push + seed + API on :4000) live in `apps/api/` docs and the team's bring-up skill; the committed `apps/api/.env` and `database/.env` contain the local-dev connection config (localhost, demo creds) needed to boot from a fresh clone.
