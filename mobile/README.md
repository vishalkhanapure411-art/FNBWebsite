# OmniOps Mobile App (Expo React Native)

One mobile app with two personas (Phase 3, final deliverable):

- **Guest mode** (no token) — customer survey flow: enter the survey code printed on
  the receipt / QR code (or tap an `omniops://s/<slug>` deep link), answer the live
  survey served by the OmniOps Surveys API.
- **Staff mode** (signed in) — the authenticated staff companion: staff log in with
  their platform account and handle day-to-day work (shifts, maintenance tickets)
  from their phone.

The persona is chosen automatically: when a JWT is present the app shows the staff
screens; when signed out it returns to the guest survey flow. Guests can reach the
login screen via the "Staff login" link on the home screen.

## What it does

### Guest (customer survey flow)
- **Home** — brand header, survey-code/link input, "Start survey" button, "Staff login" link.
- **Survey** — fetches the public survey (`GET /api/surveys/public/:publicSlug`, no auth)
  and renders every question type (NPS, STAR_RATING, CSAT, TEXT, SINGLE_CHOICE,
  MULTIPLE_CHOICE). Required questions are enforced client-side and server-side.
- **Thank you** — confirmation after submitting
  (`POST /api/surveys/public/:publicSlug/responses`, no auth).

Deep links (`omniops://s/sv-…`) work in guest mode via RN's built-in `Linking` API —
no navigation library (the app uses plain state-based navigation).

### Staff (authenticated)
- **Login** — email + password → `POST /api/auth/login`. Stores the JWT in memory
  (no persistence library installed on Expo SDK 52; reloading signs you out —
  expo-secure-store can be added later). 401 → "Invalid credentials".
- **Home (dashboard)** — greeting with the signed-in user's name and role (from the
  login response's `user` object), cards for **My Shifts** and **Maintenance Tickets**,
  sign-out button. Sections are role-gated to match the API's RBAC (see below).
- **My Shifts** — `GET /api/shifts?siteId=…&limit=50` (siteId = the user's own site;
  omitted for tenant-wide roles). Shows name, date/time range, site, status badge.
  Pull-to-refresh. (Clock-in/out is NOT included: the API has no per-staff
  clock-in/out endpoint — shift open/close is a site-lead cash-reconciliation action.)
- **Maintenance Tickets** — `GET /api/maintenance/tickets?siteId=…&limit=50`. List with
  title, status badge, priority badge, category. Tap → detail.
- **Ticket detail** — `GET /api/maintenance/tickets/:id`, then
  `PATCH /api/maintenance/tickets/:id/status` with `{ "status": "…" }` for the status
  transitions the API allows (Accept → Start work → Resolve, plus Reopen / Close where
  valid). 403 → "no permission" note; invalid transition → the API's message shown.

**RBAC gating (mirrors the API's RolesGuard):**
- Shifts: SUPER_ADMIN, BRAND_MANAGER, SITE_LEAD
- Maintenance: SUPER_ADMIN, BRAND_MANAGER, SITE_LEAD, MAINTENANCE_TECH
- Other roles (e.g. KITCHEN_STAFF) see a "no staff modules for this role" notice on
  the dashboard; any 403 that slips through is surfaced as a friendly message.

## Requirements
- Node.js ≥ 20 and pnpm (monorepo uses pnpm workspaces)
- The OmniOps API running (NestJS, default port 4000) with PostgreSQL up and seeded

## Run it
```bash
cd mobile
pnpm install
pnpm start        # then press i (iOS sim) or a (Android emu), or scan the QR in Expo Go
```

The app resolves the API base URL from `process.env.EXPO_PUBLIC_API_URL`, defaulting to
`http://localhost:4000/api`.
- **iOS simulator / Expo Go on the same machine as the API:** no env var needed.
- **Physical device:** the device can't see your machine's `localhost`:
  ```bash
  EXPO_PUBLIC_API_URL=http://192.168.1.50:4000/api pnpm start
  ```

## Demo accounts (seeded)
All demo users share the password **`Staff123!`** except the super admin:

| Email | Role | Site |
| --- | --- | --- |
| admin@omniops.dev (`Admin123!`) | SUPER_ADMIN | — |
| maria@demokitchen.co | SITE_LEAD | Demo Kitchen - Downtown (s-demo-restaurant) |
| james@demokitchen.co | SITE_LEAD | Demo Kitchen - Cloud Hub (s-demo-cloud) |
| carlos@demokitchen.co | KITCHEN_STAFF | Downtown (no shifts/tickets access) |
| aisha@demokitchen.co | KITCHEN_STAFF | Cloud Hub (no shifts/tickets access) |

**Start with `maria@demokitchen.co` / `Staff123!`** — a SITE_LEAD with full access to
both shifts and maintenance tickets for the Downtown site.

> The seed (`database/prisma/seed.ts`) now hashes a real password (`Staff123!`) for the
> four staff accounts — previously they had placeholder hashes and could not log in.
> A fresh `pnpm db:seed` produces working staff logins.

## Verification
```bash
cd mobile
pnpm typecheck          # tsc --noEmit, zero errors
pnpm export:ios         # expo export --platform ios — proves the JS bundles compile
pnpm export:android     # same for android
# or, to a scratch dir:
npx expo export --platform ios --output-dir /tmp/expo-export-staff/ios
npx expo export --platform android --output-dir /tmp/expo-export-staff/android
```
No iOS/Android simulator is required for these checks.

## Structure
```
mobile/
├── App.tsx                     # state-based navigation + persona switch + deep links + fonts
├── index.ts                    # Expo entry (registerRootComponent)
├── app.json                    # Expo config (scheme "omniops", ids)
├── babel.config.js             # babel-preset-expo
├── tsconfig.json
└── src/
    ├── theme.ts                # design tokens (#E63946 primary, Inter, spacing, radius)
    ├── api.ts                  # customer Surveys API client + types + slug extraction
    ├── env.d.ts                # EXPO_PUBLIC_API_URL typing
    ├── components/
    │   └── QuestionCard.tsx    # renders all 6 survey question types
    ├── screens/                # guest flow
    │   ├── HomeScreen.tsx      # + "Staff login" link (optional prop)
    │   ├── SurveyScreen.tsx
    │   └── ThankYouScreen.tsx
    └── staff/                  # staff persona
        ├── api.ts              # auth/shifts/maintenance client + types + role gates
        ├── format.ts           # date/role/status labels + ticket transition table
        ├── components/
        │   ├── Badge.tsx       # status / priority / shift pills
        │   └── ScreenState.tsx # loading / error / empty states
        └── screens/
            ├── LoginScreen.tsx
            ├── StaffHomeScreen.tsx
            ├── ShiftsScreen.tsx
            ├── TicketsScreen.tsx
            └── TicketDetailScreen.tsx
```

## Notes
- Fonts: Inter (regular/medium/semibold/bold) via `expo-font` +
  `@expo-google-fonts/inter`; the app blocks on font load.
- Dependency-light: no navigation library, no UI kit — Expo, React Native, and
  `@omniops/shared` (survey question types).
- The JWT is kept in memory only and expires after 24h (30d with "remember me",
  not exposed in the UI). No token refresh in the app yet.
- Known API gaps (backend, not this app): `POST /api/shifts/open` and
  `POST /api/maintenance/tickets` currently fail with a Prisma validation error
  (missing relation `connect`) — the app only consumes GET + PATCH endpoints, so it
  is unaffected, but the create endpoints need a service fix.
