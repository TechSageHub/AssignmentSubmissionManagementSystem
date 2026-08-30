# AGENTS.md

Full-stack assignment-management app. React 19 + Vite + Tailwind 4 frontend, Express 5 (CommonJS) backend, SQL Server (local) / PostgreSQL (prod). Node 22+.

## Commands

Run everything from the package dirs — `npm install` at the root is unrelated to the real app.

```bash
# backend (port 5000, nodemon)
cd fullstack-app/backend && npm run dev
# frontend (port 5173; vite proxies /api -> localhost:5000)
cd fullstack-app/frontend && npm run dev
# migrations (backend dir; idempotent schema + journaled migrations, fails loudly)
cd fullstack-app/backend && npm run migrate
# tests: Node builtin runner, from backend dir (npm test is a stub that errors)
cd fullstack-app/backend && node --test
# build frontend (backend serves frontend/dist as SPA in prod)
cd fullstack-app/frontend && npm run build
```

`npm run lint` (frontend) currently fails with ~45 pre-existing errors repo-wide (react-hooks set-state-in-effect, no-explicit-any). Don't treat it as a merge gate. Verify with `tsc`/`npm run build` instead.

## Layout

- `fullstack-app/backend/` — Express app, single entry `index.js`. CommonJS. Routes in `routes/`, SQL in `models/`, handlers in `controllers/`, DB translation in `config/db.js`.
- `fullstack-app/frontend/` — React SPA. Routes in `src/App.tsx`. Path alias `@/` → `src`. shadcn/ui components in `src/components/ui`.
- `fullstack-app/database/` — twin SQL dialects, kept in sync by hand: `*.sql` (mssql) and `*.postgres.sql` (Postgres). `migrate.js` picks by `DB_TYPE`.
- `api/index.js` — re-exports the backend Express app for Vercel serverless; `vercel.json` rewrites `/api/*` → `/api`.
- `fullstack-app/.continuation.md` — session log with recent-work context; read for history, not as source of truth.

## Env & DB

- `fullstack-app/backend/.env` is REQUIRED even for unit tests: `config/env.js` throws if DB creds + `JWT_SECRET` + `EMAIL_FROM`/`EMAIL_PASSWORD`/`EMAIL_HOST` are missing. Copy from `.env.example`; file is gitignored.
- **DB is dual-dialect.** Models write T-SQL (named `@params`, bracketed `[idents]`, `GETDATE()`, `OUTPUT INSERTED.*`); `convertPgSql()` in `config/db.js` rewrites it to Postgres at runtime (`$n` params, `"quoted"` idents, `NOW()`, `RETURNING`, bit `1/0`→`true/false`). Write every new query T-SQL-flavored; it must run clean on both DBs.
- Bracket identifiers (`[column]`) are case-preserving in Postgres: must match the schema case; unbracketed names are lowercased. New columns: add to BOTH dialect schema files + BOTH migration files.
- New columns often use the `isMissingColumnError` probe pattern in models to degrade gracefully on partially-migrated DBs — keep it.

## Ops notes

- Bootstrapping an admin: seeded admin can't log in (placeholder hash). Run from backend dir:
  `$env:ADMIN_EMAIL="..."; $env:ADMIN_PASSWORD="..."; npm run create-admin`
  (idempotent; resets password/role if the email exists).
- `migrate.js` is fail-loud: per-statement errors abort with exit 1. It records applied migration files in a `SchemaMigrations` journal table and skips already-applied ones; the schema files (mssql `schema.sql`, `schema.postgres.sql`) are authoritative + idempotent and re-run every time as the baseline. Postgres runs only `schema.postgres.sql` + the `*.postgres.sql` migrations (008 submission files, 009 reminder log); migrations 001-007 are T-SQL only (guarded so mssql re-runs are safe no-ops). New table/column changes go into the schema files AND new guarded migrations (an mssql one, plus a `*.postgres.sql` twin for PG).
- Prod serves `frontend/dist` from the backend; uploads live at `backend/uploads/assignments/:id/` (gitignored) and are NEVER served statically — files stream only through the authorized `GET /api/submissions/:submissionId/file` endpoint, `/uploads/*` returns 404.
- Deploy: `render.yaml` blueprint (Postgres + web service). After deploy: run migrations in Render shell, then `create-admin`. Vercel skips cron/reminders (`VERCEL !== '1'` guard in `index.js`).

## Frontend data layer

`src/services/api.ts` wraps axios with a 60s GET cache (`readApiCache`/`writeApiCache`); every mutation clears the whole cache; a 401 clears auth and redirects to `/login`. Use the cache helpers when adding list pages; do not add per-request caching on top.