import { PGlite } from "@electric-sql/pglite";

import { formatBatchedTitle } from "../../src/lib/notification-batcher";

/**
 * Push notifications used to be coalesced by an in-memory setTimeout: the intent did not reach
 * the durable outbox until 3 seconds AFTER the message was written, and the write failure was
 * swallowed. A restart, deploy or crash in that window silently lost the notification.
 *
 * The window now lives in Postgres. The intent is written immediately with next_run_at = now()+3s;
 * a further message in the same thread UPDATES that pending row (bumping messageCount and pushing
 * next_run_at out) rather than inserting a second push.
 *
 * The upsert relies on a PARTIAL unique index and ON CONFLICT ... WHERE — verified here against a
 * real Postgres, because that is the sort of SQL that fails quietly.
 */
describe("durable coalescing push intents", () => {
  let db: PGlite;

  const insert = (dedupeKey: string, title: string, threadId: string) =>
    db.query(
      `
      INSERT INTO notification_outbox ("channel","payload","dedupe_key","next_run_at")
      VALUES ('push', $1::jsonb, $2, now() + interval '3 seconds')
      ON CONFLICT ("dedupe_key") WHERE "status" = 'pending' AND "dedupe_key" IS NOT NULL
      DO UPDATE SET
        "payload" = jsonb_set(
          EXCLUDED."payload",
          '{data,messageCount}',
          to_jsonb(COALESCE((notification_outbox."payload" -> 'data' ->> 'messageCount')::int, 1) + 1)
        ),
        "next_run_at" = now() + interval '3 seconds',
        "updated_at" = now()
      `,
      [JSON.stringify({ userId: 1, title, body: "hi", data: { threadId, messageCount: 1 } }), dedupeKey],
    );

  const rows = () =>
    db.query<{ id: number; status: string; payload: { title: string; data: { messageCount: number } } }>(
      `SELECT "id","status","payload" FROM notification_outbox ORDER BY "id"`,
    );

  beforeEach(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE TABLE notification_outbox (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "channel" text NOT NULL,
        "status" text NOT NULL DEFAULT 'pending',
        "payload" jsonb NOT NULL,
        "attempts" integer NOT NULL DEFAULT 0,
        "dedupe_key" varchar(160),
        "next_run_at" timestamp NOT NULL DEFAULT now(),
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX "notification_outbox_pending_dedupe_key_unique"
        ON "notification_outbox" ("dedupe_key")
        WHERE "status" = 'pending' AND "dedupe_key" IS NOT NULL;
    `);
  }, 60_000);

  afterEach(async () => {
    await db?.close();
  });

  test("a single message writes one durable pending intent — immediately, not after 3s", async () => {
    await insert("push:msg:1:42", "New message from John", "42");

    const result = await rows();
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].status).toBe("pending");
    expect(result.rows[0].payload.data.messageCount).toBe(1);
  });

  test("a burst in one thread collapses into ONE row with a running count", async () => {
    await insert("push:msg:1:42", "New message from John", "42");
    await insert("push:msg:1:42", "New message from John", "42");
    await insert("push:msg:1:42", "New message from John", "42");

    const result = await rows();
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].payload.data.messageCount).toBe(3);
  });

  test("different threads never collapse into each other", async () => {
    await insert("push:msg:1:42", "New message from John", "42");
    await insert("push:msg:1:99", "New message from Sara", "99");

    const result = await rows();
    expect(result.rows).toHaveLength(2);
    expect(result.rows.map((r) => r.payload.data.messageCount)).toEqual([1, 1]);
  });

  test("once a push is sent, the next message starts a NEW intent (partial index only binds pending)", async () => {
    await insert("push:msg:1:42", "New message from John", "42");
    await db.query(`UPDATE notification_outbox SET "status" = 'sent'`);

    await insert("push:msg:1:42", "New message from John", "42");

    const result = await rows();
    expect(result.rows).toHaveLength(2);
    // The new one must be a fresh count, not a continuation of the delivered push.
    expect(result.rows[1].status).toBe("pending");
    expect(result.rows[1].payload.data.messageCount).toBe(1);
  });

  test("the intent survives a process restart — it is a row, not a setTimeout", async () => {
    await insert("push:msg:1:42", "New message from John", "42");
    // Nothing to simulate: the intent is already committed. Under the old code it lived only in
    // an in-process timer and would be gone.
    const result = await rows();
    expect(result.rows[0].status).toBe("pending");
  });

  describe("title is composed at delivery, from the final count", () => {
    test.each([
      [1, "New message from John", "New message from John"],
      [3, "New message from John", "3 messages from John"],
    ])("count %i", (count, base, expected) => {
      expect(formatBatchedTitle(base, count)).toBe(expected);
    });
  });
});
