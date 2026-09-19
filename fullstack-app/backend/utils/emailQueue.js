const outbox = require('../models/emailOutbox');
const { sendEmail } = require('../config/email');

const INTERVAL_MS = 5000;
let timer = null;
let runningLoop = false    // single-flight guard so overlapping ticks can't double-claim

// Claim one due row (row-locked claim inside emailOutbox.claimNext), send it,
// then mark sent / failed with backoff handled by the model. Returns true if a
// row was handled so the drain loop can keep going without waiting a tick.
async function handleOne() {
  const row = await outbox.claimNext();
  if (!row) return false;
  try {
    await sendEmail({
      to: row.recipient_email,
      subject: row.subject,
      html: row.body_html,
    });
    await outbox.markSent(row.id);
  } catch (err) {
    await outbox.markFailed(
      row.id,
      row.attempts,
      row.max_attempts,
      String((err && err.message) || err).slice(0, 500)
    );
  }
  return true;
}

async function drain() {
  if (runningLoop) return;
  runningLoop = true;
  try {
    while (await handleOne()) {
      // keep draining until no due row is left this pass
    }
  } catch (err) {
    console.error('emailQueue drain error:', err && err.message || err);
  } finally {
    runningLoop = false;
  }
}

function start() {
  if (timer) return;
  outbox.requeueStale().catch(() => {}); // resume rows stuck 'sending' by a crash
  drain();
  timer = setInterval(drain, INTERVAL_MS);
  if (timer.unref) timer.unref();
}

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = { start, stop, drain };
