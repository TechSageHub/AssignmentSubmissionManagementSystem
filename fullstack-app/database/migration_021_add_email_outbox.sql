-- EmailOutbox: durable outbound email queue with retry + backoff.
-- One row per message. Worker claims 'pending' rows whose next_attempt_at has passed,
-- sends, then marks 'sent'; on failure it bumps attempts and backs off. Rows stuck in
-- 'sending' after a crash are requeued to 'pending' on boot.
IF OBJECT_ID('dbo.EmailOutbox', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.EmailOutbox (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    recipient_email NVARCHAR(255)  NOT NULL,
    recipient_name  NVARCHAR(120)  NULL,
    subject         NVARCHAR(255)  NOT NULL,
    body_html       NVARCHAR(MAX)  NOT NULL,
    status          NVARCHAR(20)   NOT NULL DEFAULT 'pending', -- pending|sending|sent|failed
    attempts        INT            NOT NULL DEFAULT 0,
    max_attempts    INT            NOT NULL DEFAULT 5,
    next_attempt_at DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(), -- when the worker may try next
    claimed_at      DATETIME2      NULL,                            -- when a worker locked the row
    last_error      NVARCHAR(500)  NULL,
    sent_at         DATETIME2      NULL,
    created_at      DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME()
  );

  CREATE INDEX IX_EmailOutbox_due ON dbo.EmailOutbox (status, next_attempt_at);
  CREATE INDEX IX_EmailOutbox_created ON dbo.EmailOutbox (created_at);
END
GO
