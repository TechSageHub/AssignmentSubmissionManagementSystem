# Grade Appeals — Design

Date: 2026-09-21

Feature 1 of a 6-feature roadmap. Adds a single-round, post-release appeal loop on top of the existing one-shot grading flow.

## Decisions

- **Re-open grading on resolve**: accepted appeals are resolved through the existing grade page (rubric / score / feedback). Saving the re-grade closes the appeal in a transaction and records old/new scores.
- **Single-round, post-release**: one appeal per submission, filable only once the grade is `released_at` is set; lecturer resolution is final.
- **Dedicated `GradeAppeals` table** (recommended over extending `Grades` or a generic workflow table — keeps the one-shot upsert clean; `Unique(submission_id)` makes single-appeal a DB guarantee).

## Data model

New migration 022: `migration_022_add_grade_appeals.sql` (mssql) + `migration_022_add_grade_appeals.postgres.sql` (Postgres twin). Also added to `database/schema.sql`, `database/schema.postgres.sql`, and appended to BOTH `migrations` arrays in `fullstack-app/backend/scripts/migrate.js`.

```
GradeAppeals (
  id                INT IDENTITY(1,1) / SERIAL PRIMARY KEY,
  submission_id     INT NOT NULL UNIQUE  FK -> Submissions(id) ON DELETE CASCADE,
  student_id        INT NOT NULL         FK -> Users(id),
  reason            NVARCHAR(MAX)/TEXT NOT NULL,
  status            NVARCHAR(20)/VARCHAR(20) NOT NULL DEFAULT 'open',  -- open | accepted | rejected
  lecturer_comment  NVARCHAR(MAX)/TEXT,
  old_score         DECIMAL(5,2),
  new_score         DECIMAL(5,2),
  requested_at      DATETIME2/TIMESTAMP DEFAULT GETDATE()/NOW(),
  resolved_at       DATETIME2/TIMESTAMP
)
```

Postgres twin follows the existing migration conventions (guarded `CREATE TABLE IF NOT EXISTS`, `id BIGSERIAL`, `TIMESTAMP`, `REFERENCES`).

## API

New `routes/appeals.js` mounted at `/api/appeals`, `controllers/appealController.js`, `models/gradeAppeal.js`. Total authenticated; student/lecturer role checks.

| Method / path | Role | Behavior |
|---|---|---|
| `POST /api/appeals` | student | `{ submissionId, reason }`. 404 if submission not theirs; 409 if grade not released or an appeal already exists; 400 validation. |
| `GET /api/appeals?status=` | lecturer | Own assignments only. Joins assignment title + student name. Optional `status` filter; same `{ items, total, limit, offset }` shape (cap 200). |
| `GET /api/appeals/mine` | student | Own appeals with assignment title + outcome, newest first. |
| `POST /api/appeals/:id/resolve` | lecturer (assignment owner) | `{ status: 'rejected', lecturerComment }` closes the appeal as rejected. |

- **Accepted path drives through the existing grade endpoint**: `POST /api/grades` (existing grading route) accepts an optional `appealId`. When present, after the `Grades` upsert succeeds the appeal is resolved inside `withTransaction` — `status='accepted'`, `lecturer_comment` from the request, `old_score` captured from the current `Grades.score`, `new_score` from the upsert, `resolved_at=GETDATE()`. Invalid/foreign `appealId` → 403; appeal not in `open` state → 409.
- Audit log entries on: file-appeal, resolve-accepted (old→new), resolve-rejected.

## Frontend

- Student: "Appeal grade" button on their graded submission (visible only when released and no prior appeal) → dialog with reason textarea → status cards in a "My appeals" list.
- Lecturer: open-appeal badge on `AssignmentSubmissionsPage`; appeals list page (`/appeals` route); each open item links to `GradeSubmissionPage`; that page shows the appeal reason banner and, on save of an accepted appeal, closes the loop.

## Notifications & email

- On file: in-app notification + durable email to the assignment's lecturer.
- On resolution (accepted/rejected): in-app notification + durable email to the student.
- Reuse `emailQueue`/`emailHelper` and the existing notification model patterns.

## Error handling

- 404s for unknown submissions/appeals; 400 validation (missing reason, bad status); 409 for duplicate/not-released attempts; 403 for non-owner lecturers / students appealing others' submissions.
- Consistent `{ error, details }` envelope.

## Testing

- Backend `node --test`: unit tests for the new model (query building + edge cases like duplicate appeal, release check), mirroring `tests/grade`-style suites. No DB required beyond `.env` loading.
- Frontend `vitest` for any pure helpers introduced.
- Verify with `npm run build` (frontend) and `node --test` (backend). `npm run lint` is not a merge gate.

## Migration steps (ops)

1. Add columns/tables to `schema.sql` + `schema.postgres.sql` (idempotent baseline).
2. Create `migration_022_add_grade_appeals.sql` + `.postgres.sql`.
3. Append both filenames to the arrays in `scripts/migrate.js` (both dialects).
4. Run `cd fullstack-app/backend && npm run migrate`.