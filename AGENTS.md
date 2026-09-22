# AGENTS.md

Full-stack assignment-management app. React 19 + Vite + Tailwind 4 frontend, Express 5 (CommonJS) backend, SQL Server (local) / PostgreSQL (prod). Node 22+.

## Commands

Run from package dirs — root `package.json` is not the app (Vercel fallback only).

```bash
# backend (port 5000, nodemon)
cd fullstack-app/backend && npm run dev
# ngrok (backend dir) — NGROK_URL auto-added to CORS and GET /api/config
cd fullstack-app/backend && npm run dev:ngrok
# frontend (port 5173; Vite proxies /api -> localhost:5000)
cd fullstack-app/frontend && npm run dev
# migrations — idempotent schema + journaled migrations, fails loudly
cd fullstack-app/backend && npm run migrate
# backend tests: Node builtin runner (npm test === node --test)
cd fullstack-app/backend && node --test          # single: node --test --test-name-pattern="convertPgSql"
# frontend tests: Vitest (api cache layer)
cd fullstack-app/frontend && npm test
# typecheck + build (backend serves frontend/dist as SPA in prod)
cd fullstack-app/frontend && npm run build       # runs tsc -b && vite build
```

`npm run lint` (frontend) fails on pre-existing errors — not a merge gate. Use `npm run build` / `tsc -b` instead.

## Layout

- `fullstack-app/backend/` — Express, entry `index.js` (CommonJS, not ESM). Routes `routes/`, handlers `controllers/`, SQL `models/`, DB translation `config/db.js`.
- `fullstack-app/frontend/` — React SPA, routes in `src/App.tsx`, path alias `@/` → `src`, shadcn/ui in `src/components/ui`.
- `fullstack-app/database/` — twin dialects by hand: `*.sql` (mssql) + `*.postgres.sql` (Postgres). `scripts/migrate.js` picks by `DB_TYPE`.
- `fullstack-app/render.yaml` — Render blueprint (Postgres + web service, healthCheck `/api/config`).
- `api/index.js` — re-exports backend app for Vercel; `vercel.json` rewrites `/api/*` → `/api`, rest → SPA.
- `fullstack-app/.continuation.md` — session log, not source of truth.

## Env & DB

- `fullstack-app/backend/.env` REQUIRED even for unit tests — tests import `models` → `config/db` → `config/env.js` which throws if `DB_*` + `JWT_SECRET` + `EMAIL_FROM`/`EMAIL_PASSWORD`/`EMAIL_HOST` missing. Copy from `.env.example`. Exception: `npm run migrate` only needs DB creds (`env.js` skips JWT/email when argv contains `migrate`).
- **Dual-dialect.** Write every query as T-SQL (`@params`, `[idents]`, `GETDATE()`/`SYSUTCDATETIME()`, `OUTPUT INSERTED.*`); `convertPgSql()` in `config/db.js:56` rewrites at runtime for Postgres (`$n`, `"quoted"`, `NOW()`, `RETURNING`, `1/0`→`true/false`, `OFFSET/FETCH`→`LIMIT/OFFSET`). Bracketed idents `[col]` are case-preserving in Postgres — must match schema case.
- New columns: add to BOTH schema files + BOTH migration files. Use `isMissingColumnError` probe pattern in models (see `models/user.js:20`, `models/assignment.js:64`) to degrade on partially-migrated DBs.
- `config/db.js` exposes `query(sql, params)`, `withTransaction(fn)` (fn receives `{exec}` bound to tx), `isConnectionError`/`isDuplicateKeyError` (retry only on connection errors, never on duplicate-key).
- Dates: `utils/dates.js` — DB stores naive UTC wall-clock (`DATETIME2`/`TIMESTAMP` without zone, written via `toStoredUtc()` stripping `Z`), API emits ISO `Z` via `toIsoUtc()`. Comparisons use `SYSUTCDATETIME()`/`NOW()` (both UTC). Treat bare `YYYY-MM-DDTHH:mm` inputs as UTC.

## Ops & Storage

- Bootstrap admin (seeded admin has placeholder hash): `cd fullstack-app/backend && $env:ADMIN_EMAIL="..."; $env:ADMIN_PASSWORD="..."; npm run create-admin` (idempotent, resets password/role).
- `scripts/migrate.js` — schema files are authoritative + idempotent (re-run every time). Migrations are journaled in `SchemaMigrations` and skipped if applied. Postgres runs `schema.postgres.sql` + `*.postgres.sql` 008–022; mssql runs `schema.sql` + 001–022. New migration must be appended to the hardcoded arrays in `migrate.js` or it never runs. CI workflow `.github/workflows/migrate.yml` runs on `database/**` changes.
- Prod serves `frontend/dist` from backend (`backend/index.js:94`). `VERCEL !== '1'` guard skips cron (`reminderService`) + `emailQueue` on Vercel.
- Uploads: `backend/uploads/assignments/:id/` is gitignored and NEVER served statically (`/uploads/*` → 404 in `index.js:54`). Files stream only via `GET /api/submissions/:submissionId/file` (auth: own/group or lecturer's assignment). Multer uses memory storage.
- `services/storage.js` — if `S3_BUCKET` set, files go to S3/R2 (`S3_ENDPOINT`, `S3_FORCE_PATH_STYLE`); else persisted in `StorageBlobs` (`BYTEA`/`VARBINARY`) with best-effort dual-write to local `uploads/`. Never read submissions from disk directly — use `storage.createReadStream`/`storeFile`.

## Frontend & API Conventions

- `src/services/api.ts` — axios with 60s GET cache (`readApiCache`/`writeApiCache`); every `POST/PUT/PATCH/DELETE` clears entire cache; 401 clears auth and redirects to `/login` (except `/auth/login`). Reuse cache helpers for new list pages.
- `GET /api/admin/users` is paginated+searchable (`?limit&offset&search`, limit cap 200) → `{ items, total, limit, offset }` not bare array. New admin lists must follow this shape.
- Error shape: `{ error: <Name>, details: <message> }`; global handler `index.js:102` caps details at 500 chars, hides 5xx in production.
- CORS: `CORS_ORIGINS` (comma-separated) + `FRONTEND_URL` + `NGROK_URL` + localhost dev ports; if empty, permissive (warns). `RATE_LIMIT_TRUST_PROXY=true` behind proxy.
