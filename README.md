# Lead Management System

A CRM-style Lead Management System: React + Vite + MUI + Redux Toolkit frontend,
Node.js + Express + Prisma + PostgreSQL backend, JWT auth with permission-driven
RBAC (Admin / Manager / Executive).

## Project structure

```
lms/
├── backend/     Express API, Prisma schema, seed script
├── frontend/    React app (Vite)
└── docker-compose.yml   Local PostgreSQL for development
```

## 1. Local setup

### Prerequisites
- Node.js 18+
- Docker (for local Postgres) — or your own Postgres instance

### Database
```bash
docker compose up -d          # starts Postgres on localhost:5432
```

### Backend
```bash
cd backend
cp .env.example .env
# Fill in DATABASE_URL (the docker-compose default is already commented
# in .env.example), and generate real JWT secrets:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

npm install
npx prisma migrate dev --name init   # creates tables
npm run seed                          # creates demo org + 3 demo users
npm run dev                           # http://localhost:4000
```

Demo logins after seeding (password `ChangeMe123!` for all three — rotate
before any real use):
- `admin@demo.com` — Admin
- `manager@demo.com` — Manager
- `executive@demo.com` — Executive (reports to the manager above)

### Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev     # http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:4000`, so no CORS
setup is needed locally (see `vite.config.js`).

## 2. Deploying

You mentioned you don't have a Postgres connection string yet — nothing in
this codebase assumes local dev. When you're ready:

1. Provision Postgres (Supabase, Neon, Railway, RDS, etc.) and get its
   connection string.
2. Set `DATABASE_URL` in the backend's environment to that string.
3. Run `npx prisma migrate deploy` (not `migrate dev`) against it, then
   `npm run seed` once if you want the demo accounts (or write your own
   seed for production data).
4. Set `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` to freshly generated
   random values (not the ones from your local `.env`).
5. Deploy the backend (Render, Railway, Fly.io, etc.) and set `CORS_ORIGIN`
   to your frontend's deployed URL.
6. Build the frontend (`npm run build` → `frontend/dist`) with
   `VITE_API_BASE_URL` pointing at the deployed backend, and deploy the
   static output (Vercel, Netlify, Cloudflare Pages, etc.).

## 3. How RBAC works here

Authorization is **permission-driven**, not role-driven:

- `Permission` rows are granular strings (`lead.create`, `lead.assign`, …).
- `Role` rows (Admin/Manager/Executive) are wired to permissions via
  `RolePermission` — see `backend/src/config/permissions.js` for the
  default wiring used by the seed script.
- Route middleware (`authorize()`) checks "does this user's role have
  permission X", never `if (role === 'MANAGER')`.
- This means adding a future role (e.g. "Executive Level 2" from the spec)
  is a data change — a new `Role` row + `RolePermission` rows — not a code
  change.

**Every permission check happens server-side.** The frontend's
`usePermission()` hook only hides buttons the user isn't allowed to use —
it is a UX convenience, never the actual gate. If you inspect the network
tab and replay a request without permission, the API rejects it
independently (see `backend/src/middleware/authorize.js` and
`backend/src/services/leadScope.service.js` for the "which leads can this
user see/edit" logic specifically).

## 4. Testing

```bash
cd backend
npm ci
npx prisma generate
npm test          # node --test "tests/*.test.js"
```

- `httpAuth.test.js` — login, token validation/expiry/forgery, refresh-token
  type enforcement, RBAC 401/403 boundaries.
- `httpLeadSecurity.test.js` — cross-user (IDOR) and cross-organization attacks
  on every lead-scoped endpoint (lead, status, priority, history, notes,
  follow-ups, assignment), note edit/delete rules, follow-up id/lead id binding,
  lead CRUD, filters, pagination, sorting, status transitions.
- `httpUserHierarchy.test.js` — manager/executive rules, notifications on
  assignment, atomic manager deactivation + rollback, cross-org user access.
- `httpScopeViews.test.js` — Executive/Manager/Admin dashboards, CSV export
  scope, notification privacy.
- `serviceFixes.test.js` and the smaller files — service-level unit tests.
- `securityIntegration.test.js` — needs a generated Prisma client and a live
  PostgreSQL (`DATABASE_URL`). Reported as **skipped** when unavailable.

The HTTP suites run the real Express app and real services against an in-memory
database (`tests/helpers/memoryDb.js`). That proves the authorization decisions
and query filters, but not SQL, indexes or migrations — run the app against real
PostgreSQL before release.

Not yet automated: browser-level UI tests, and running these same HTTP suites
against a real PostgreSQL.

## 5. Frontend tests

```bash
cd frontend
npm ci
npm test        # vitest run
```

`EditFollowUpDialog.test.jsx` is a regression test for a real bug found in
review: the dialog component stays mounted between opens (only its `open`
prop toggles), so editing follow-up A, closing, then editing follow-up B
could show A's stale due date/notes/status. The fix is a `useEffect` keyed on
`[open, followUp?.id]`; the test fails without it (verified by temporarily
reverting the fix and re-running).

## 6. Implemented

Auth (access/refresh with token-type enforcement), permission-driven RBAC, lead
CRUD (edit + soft-delete UI), assignment/reassignment history with resolved
names (including Manager self-assignment), status lifecycle, priority,
follow-up CRUD with overdue tracking, notes with edit/delete, immutable audit
history, role-scoped dashboards (Admin/Manager/Executive each see their own
open/new/resolved/overdue numbers), search/filter/sort/pagination (DataGrid
v7), CSV export with error handling, admin user management with
Executive→Manager selector and edit dialog, an in-app notification center
(bell, unread badge, mark-as-read, 30s polling, click-to-navigate to the
relevant lead or filtered lead list), and startup environment validation.

## 7. Deferred

Bulk operations, real-time (websocket) notifications, report definitions beyond
dashboard KPIs, code-splitting of the frontend bundle (~1.5 MB).

## 8. Known security limitations

**Refresh tokens are stateless JWTs with no revocation mechanism.** The flow is:

```
refresh JWT -> verify signature -> confirm user still active -> issue new access token
```

There is no server-side record of issued refresh tokens, so there is nothing to
revoke. A leaked refresh token remains valid for its full lifetime
(`JWT_REFRESH_EXPIRES_IN`, default 7 days) even after password reset,
"log out everywhere", or account deactivation is added — deactivation only
blocks the *next* refresh's user lookup, it does not invalidate an
already-issued token before that lookup runs. Treat this as **not
production-hardened authentication** until a revocation store (e.g. a
refresh-token table keyed by a random ID, checked and rotated on every use)
is added. This is a known gap, not an oversight — do not read the presence of
token-type enforcement (access vs. refresh) as equivalent to revocation.
