import * as SQLite from "expo-sqlite";

import type { MessagesControllerCache } from "@/hooks/messages/useChatCache";

const DB_NAME = "ph_messages_v1.db";
const MAX_MESSAGES = 500;

// Single DB handle — supports both sync and async methods (expo-sqlite SDK 55).
// Opened lazily on first access so startup time is not affected.
let _db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase {
  if (_db) return _db;
  _db = SQLite.openDatabaseSync(DB_NAME);
  _db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS message_threads (
      id         TEXT    NOT NULL,
      profile_id INTEGER NOT NULL,
      raw_json   TEXT    NOT NULL,
      sort_key   INTEGER DEFAULT 0,
      PRIMARY KEY (id, profile_id)
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id         TEXT    NOT NULL,
      profile_id INTEGER NOT NULL,
      thread_id  TEXT    NOT NULL,
      raw_json   TEXT    NOT NULL,
      created_ts INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (id, profile_id)
    );

    CREATE INDEX IF NOT EXISTS idx_chat_msgs_thread
      ON chat_messages (profile_id, thread_id, created_ts DESC);

    CREATE TABLE IF NOT EXISTS group_member_snapshots (
      profile_id INTEGER NOT NULL,
      group_id   INTEGER NOT NULL,
      raw_json   TEXT    NOT NULL,
      PRIMARY KEY (profile_id, group_id)
    );

    CREATE TABLE IF NOT EXISTS deleted_message_ids (
      message_id  TEXT    NOT NULL,
      profile_id  INTEGER NOT NULL,
      deleted_at  INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (message_id, profile_id)
    );
  `);
  return _db;
}

type CacheData = Pick<MessagesControllerCache, "threads" | "messages" | "groupMembers">;

/**
 * Synchronous read called during React initialization.
 * Runs on the JS thread — fast for small datasets (<10 ms on modern devices).
 */
export function loadCacheSync(profileId: number): CacheData | null {
  try {
    const db = getDb();

    const threadRows = db.getAllSync<{ raw_json: string }>(
      "SELECT raw_json FROM message_threads WHERE profile_id = ? ORDER BY sort_key DESC LIMIT 100",
      [profileId],
    );
    if (!threadRows.length) return null;

    const threads = threadRows.map((r) => JSON.parse(r.raw_json));

    const deletedIds = loadDeletedMessageIds(profileId);

    const msgRows = db.getAllSync<{ raw_json: string }>(
      `SELECT raw_json FROM chat_messages
       WHERE profile_id = ?
       ORDER BY created_ts DESC
       LIMIT ${MAX_MESSAGES}`,
      [profileId],
    );
    const messages = msgRows
      .map((r) => JSON.parse(r.raw_json))
      .filter((m: { id: string }) => !deletedIds.has(String(m.id)));

    const gmRows = db.getAllSync<{ group_id: number; raw_json: string }>(
      "SELECT group_id, raw_json FROM group_member_snapshots WHERE profile_id = ?",
      [profileId],
    );
    const groupMembers: Record<number, Record<number, { name: string; avatar?: string | null }>> = {};
    for (const row of gmRows) {
      groupMembers[row.group_id] = JSON.parse(row.raw_json);
    }

    return { threads, messages, groupMembers };
  } catch {
    return null;
  }
}

/**
 * Marks a message as permanently deleted and removes it from chat_messages.
 * Persists across app restarts so zombies from stale SQLite cache can't resurface.
 */
export function markMessageDeletedSync(profileId: number, messageId: string): void {
  try {
    const db = getDb();
    db.runSync(
      "INSERT OR IGNORE INTO deleted_message_ids (message_id, profile_id, deleted_at) VALUES (?, ?, ?)",
      [messageId, profileId, Date.now()],
    );
    db.runSync(
      "DELETE FROM chat_messages WHERE profile_id = ? AND id = ?",
      [profileId, messageId],
    );
  } catch (e) {
    if (__DEV__) console.warn("[messageDb] markMessageDeletedSync failed:", e);
  }
}

/** Returns the set of message IDs that were permanently deleted for this profile. */
export function loadDeletedMessageIds(profileId: number): Set<string> {
  try {
    const db = getDb();
    // Only keep the last 30 days to bound table size.
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    db.runSync(
      "DELETE FROM deleted_message_ids WHERE profile_id = ? AND deleted_at < ?",
      [profileId, cutoff],
    );
    const rows = db.getAllSync<{ message_id: string }>(
      "SELECT message_id FROM deleted_message_ids WHERE profile_id = ?",
      [profileId],
    );
    return new Set(rows.map((r) => r.message_id));
  } catch {
    return new Set();
  }
}

// Keep the old name as an alias so existing callers (useChatActions) don't break.
export const deleteMessageSync = markMessageDeletedSync;

/**
 * Async write — called after API sync or socket events.
 * Fire-and-forget; errors are swallowed to never block the UI.
 */
export async function saveCacheToDb(profileId: number, data: CacheData): Promise<void> {
  try {
    const db = getDb();

    await db.withTransactionAsync(async () => {
      for (const thread of data.threads) {
        await db.runAsync(
          "INSERT OR REPLACE INTO message_threads (id, profile_id, raw_json, sort_key) VALUES (?, ?, ?, ?)",
          [thread.id, profileId, JSON.stringify(thread), thread.unread ?? 0],
        );
      }

      for (const msg of data.messages) {
        const ts = msg.createdAt ? new Date(msg.createdAt).getTime() : 0;
        await db.runAsync(
          "INSERT OR REPLACE INTO chat_messages (id, profile_id, thread_id, raw_json, created_ts) VALUES (?, ?, ?, ?, ?)",
          [msg.id, profileId, msg.threadId, JSON.stringify(msg), ts],
        );
      }

      // Keep only the most recent MAX_MESSAGES entries per profile to bound disk usage.
      await db.runAsync(
        `DELETE FROM chat_messages
         WHERE profile_id = ?
           AND id NOT IN (
             SELECT id FROM chat_messages
             WHERE profile_id = ?
             ORDER BY created_ts DESC
             LIMIT ?
           )`,
        [profileId, profileId, MAX_MESSAGES],
      );

      for (const [groupId, members] of Object.entries(data.groupMembers)) {
        await db.runAsync(
          "INSERT OR REPLACE INTO group_member_snapshots (profile_id, group_id, raw_json) VALUES (?, ?, ?)",
          [profileId, Number(groupId), JSON.stringify(members)],
        );
      }
    });
  } catch (e) {
    if (__DEV__) console.warn("[messageDb] save failed:", e);
  }
}
