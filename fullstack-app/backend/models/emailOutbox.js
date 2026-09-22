const { query } = require('../config/db');

// Durable outbound email queue (EmailOutbox). Row claiming is done here via a
// single UPDATE … OUTPUT that claims exactly one due 'pending' row. The same
// file works on both dialects because config/db translates @named params and
// converts OUTPUT/SYSUTCDATETIME() to RETURNING/NOW() for Postgres.
async function enqueue({ recipientEmail, recipientName, subject, bodyHtml, maxAttempts = 5 }) {
  const result = await query(
    `INSERT INTO EmailOutbox (recipient_email, recipient_name, subject, body_html, max_attempts)
     OUTPUT INSERTED.id
     VALUES (@recipientEmail, @recipientName, @subject, @bodyHtml, @maxAttempts)`,
    { recipientEmail, recipientName, subject, bodyHtml, maxAttempts }
  );
  return result.recordset[0].id;
}

// Claim the next due 'pending' row and flip it to 'sending' atomically.
// Postgres path uses RETURNING; mssql path uses OUTPUT + SYSUTCDATETIME().
async function claimNext() {
  const result = await query(
    `UPDATE EmailOutbox
        SET status = 'sending',
            claimed_at = SYSUTCDATETIME(),
            attempts = attempts + 1
      OUTPUT INSERTED.id, INSERTED.recipient_email, INSERTED.recipient_name,
             INSERTED.subject, INSERTED.body_html, INSERTED.attempts,
             INSERTED.max_attempts
      WHERE status = 'pending'
        AND next_attempt_at <= SYSUTCDATETIME()
        AND id = (SELECT MIN(id) FROM (
                    SELECT TOP (@claimBatch) id
                      FROM EmailOutbox
                     WHERE status = 'pending'
                       AND next_attempt_at <= SYSUTCDATETIME()
                     ORDER BY next_attempt_at
                  ) claim)`,
    { claimBatch: 1 }
  );
  return result.recordset[0] || null;
}

async function markSent(id) {
  await query(
    `UPDATE EmailOutbox
        SET status = 'sent',
            sent_at = SYSUTCDATETIME(),
            claimed_at = NULL
      WHERE id = @id
        AND status = 'sending'`,
    { id }
  );
}

// Backoff is exponential: next retry after 2^(attempts) seconds, capped, until
// max_attempts.  The next_attempt_at is passed in as a JS Date (UTC) so the
// same statement runs on both dialects without dialect-specific DATEADD.
async function markFailed(id, attempts, maxAttempts, errorText) {
  const failed = attempts >= maxAttempts;
  const backoffSec = failed ? 0 : Math.min(Math.pow(2, attempts), 86400);
  const nextAttemptAt = new Date(Date.now() + backoffSec * 1000);
  await query(
    `UPDATE EmailOutbox
        SET status = @status,
            last_error = @errorText,
            next_attempt_at = @nextAttemptAt,
            claimed_at = NULL
      WHERE id = @id
        AND status = 'sending'`,
    {
      id,
      status: failed ? 'failed' : 'pending',
      errorText: String(errorText).slice(0, 500),
      nextAttemptAt,
    }
  );
}

// Called on worker boot: rows left in 'sending' by a crashed worker are returned
// to 'pending' so nothing is lost across restarts.
async function requeueStale() {
  await query(
    `UPDATE EmailOutbox
        SET status = 'pending',
            next_attempt_at = SYSUTCDATETIME(),
            claimed_at = NULL
      WHERE status = 'sending'`
  );
}

async function retryById(id) {
  await query(
    `UPDATE EmailOutbox
        SET status = 'pending',
            next_attempt_at = SYSUTCDATETIME(),
            claimed_at = NULL,
            last_error = NULL
      WHERE id = @id AND status IN ('failed', 'sending', 'pending')`,
    { id }
  );
}

async function countByStatus() {
  const result = await query(
    `SELECT status, COUNT(*) AS cnt
       FROM EmailOutbox
      GROUP BY status`
  );
  const counts = { pending: 0, sending: 0, sent: 0, failed: 0 };
  for (const row of result.recordset) counts[row.status] = row.cnt;
  return counts;
}

async function listRecent(limit = 50) {
  const result = await query(
    `SELECT id, recipient_email, recipient_name, subject, status, attempts,
            max_attempts, last_error, sent_at, created_at
       FROM EmailOutbox
      ORDER BY id DESC
     OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY`,
    { limit }
  );
  return result.recordset;
}

module.exports = { enqueue, claimNext, markSent, markFailed, requeueStale, retryById, countByStatus, listRecent };
