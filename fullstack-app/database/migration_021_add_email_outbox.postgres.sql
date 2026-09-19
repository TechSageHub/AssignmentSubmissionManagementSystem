-- EmailOutbox: durable outbound email queue with retry + backoff (Postgres twin).
-- One row per message. Worker claims 'pending' rows whose next_attempt_at has passed,
-- sends, then marks 'sent'; on failure it bumps attempts and backs off. Rows stuck in
-- 'sending' after a crash are requeued to 'pending' on boot.
CREATE TABLE IF NOT EXISTS "EmailOutbox" (
  "id"              BIGSERIAL PRIMARY KEY,
  "recipient_email" VARCHAR(255)  NOT NULL,
  "recipient_name"  VARCHAR(120)  NULL,
  "subject"         VARCHAR(255)  NOT NULL,
  "body_html"       TEXT          NOT NULL,
  "status"          VARCHAR(20)   NOT NULL DEFAULT 'pending',
  "attempts"        INTEGER       NOT NULL DEFAULT 0,
  "max_attempts"    INTEGER       NOT NULL DEFAULT 5,
  "next_attempt_at" TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "claimed_at"      TIMESTAMPTZ   NULL,
  "last_error"      VARCHAR(500)  NULL,
  "sent_at"         TIMESTAMPTZ   NULL,
  "created_at"      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "IX_EmailOutbox_due" ON "EmailOutbox" ("status", "next_attempt_at");
CREATE INDEX IF NOT EXISTS "IX_EmailOutbox_created" ON "EmailOutbox" ("created_at");
