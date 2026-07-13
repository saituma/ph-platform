import * as SQLite from "expo-sqlite";

/**
 * Durable send queue.
 *
 * Composing a message offline used to lose it outright: the HTTP POST threw, the optimistic
 * bubble flipped to `failed`, and nothing ever retried it. `failed` had no resend affordance and
 * the bubble lived only in React state, so backgrounding the app dropped it entirely. The user
 * saw a message they believed they had sent.
 *
 * Every send is now written here BEFORE it goes out, and only removed once the server has
 * acknowledged it. Retrying is safe: clientId is a UUID and the server has a unique index on
 * (conversationId, senderId, clientMessageId) with ON CONFLICT DO NOTHING, so a message can be
 * re-sent any number of times and still land exactly once.
 */

const DB_NAME = "ph_messages_v1.db";

/** Give up after this many attempts so a permanently-rejected send (e.g. blocked user) can't loop. */
export const MAX_SEND_ATTEMPTS = 8;

export type OutboxEntry = {
  clientId: string;
  threadId: string;
  payloadJson: string;
  attempts: number;
  createdAt: number;
};

let _db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase {
  if (_db) return _db;
  _db = SQLite.openDatabaseSync(DB_NAME);
  _db.execSync(`
    CREATE TABLE IF NOT EXISTS send_outbox (
      client_id    TEXT    NOT NULL,
      profile_id   INTEGER NOT NULL,
      thread_id    TEXT    NOT NULL,
      payload_json TEXT    NOT NULL,
      attempts     INTEGER NOT NULL DEFAULT 0,
      created_at   INTEGER NOT NULL,
      last_error   TEXT,
      PRIMARY KEY (client_id, profile_id)
    );

    CREATE INDEX IF NOT EXISTS idx_send_outbox_drain
      ON send_outbox (profile_id, created_at);
  `);
  return _db;
}

/** Record a send before it leaves the device. Idempotent on clientId. */
export function enqueueSend(profileId: number, entry: { clientId: string; threadId: string; payload: unknown }): void {
  try {
    getDb().runSync(
      `INSERT OR IGNORE INTO send_outbox (client_id, profile_id, thread_id, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [entry.clientId, profileId, entry.threadId, JSON.stringify(entry.payload), Date.now()],
    );
  } catch {
    // A failed enqueue must never block the send itself — worst case we lose the retry, which is
    // exactly the old behaviour, not worse than it.
  }
}

/** The server has it. Stop trying. */
export function removeSend(profileId: number, clientId: string): void {
  try {
    getDb().runSync(`DELETE FROM send_outbox WHERE client_id = ? AND profile_id = ?`, [clientId, profileId]);
  } catch {
    /* best effort */
  }
}

/** A send failed. Count it, so a permanently-rejected message eventually stops retrying. */
export function recordFailure(profileId: number, clientId: string, error: string): void {
  try {
    getDb().runSync(
      `UPDATE send_outbox SET attempts = attempts + 1, last_error = ? WHERE client_id = ? AND profile_id = ?`,
      [error.slice(0, 500), clientId, profileId],
    );
    getDb().runSync(`DELETE FROM send_outbox WHERE client_id = ? AND profile_id = ? AND attempts >= ?`, [
      clientId,
      profileId,
      MAX_SEND_ATTEMPTS,
    ]);
  } catch {
    /* best effort */
  }
}

/** Everything still waiting to reach the server, oldest first — so a thread's messages keep their order. */
export function listPendingSends(profileId: number): OutboxEntry[] {
  try {
    const rows = getDb().getAllSync<{
      client_id: string;
      thread_id: string;
      payload_json: string;
      attempts: number;
      created_at: number;
    }>(
      `SELECT client_id, thread_id, payload_json, attempts, created_at
       FROM send_outbox WHERE profile_id = ? ORDER BY created_at ASC`,
      [profileId],
    );
    return rows.map((r) => ({
      clientId: r.client_id,
      threadId: r.thread_id,
      payloadJson: r.payload_json,
      attempts: r.attempts,
      createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
}

export function pendingSendCount(profileId: number): number {
  try {
    const row = getDb().getFirstSync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM send_outbox WHERE profile_id = ?`,
      [profileId],
    );
    return row?.n ?? 0;
  } catch {
    return 0;
  }
}
