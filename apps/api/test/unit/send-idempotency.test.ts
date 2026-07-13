import { PGlite } from "@electric-sql/pglite";

/**
 * The load-bearing guarantee behind the mobile send outbox.
 *
 * A message composed offline is now persisted to a local queue and re-sent on every reconnect.
 * That is only safe because the server upserts on (conversationId, senderId, clientMessageId):
 * re-sending a message that DID land must be a no-op, not a duplicate.
 *
 * It is also why clientId had to become a UUID. It used to be `client-${Date.now()}` — two sends
 * in the same millisecond collided, so the server treated the second, genuinely different message
 * as a replay of the first and silently dropped it.
 */
describe("send idempotency (clientMessageId)", () => {
  let db: PGlite;

  const send = (senderId: number, clientMessageId: string | null, content: string) =>
    db.query<{ id: number }>(
      `INSERT INTO conversation_messages ("conversationId","senderId","content","clientMessageId")
       VALUES (1, $1, $2, $3)
       ON CONFLICT ("conversationId","senderId","clientMessageId") DO NOTHING
       RETURNING "id"`,
      [senderId, content, clientMessageId],
    );

  const count = async () => (await db.query(`SELECT "id" FROM conversation_messages`)).rows.length;

  beforeEach(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE TABLE conversation_messages (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "conversationId" integer NOT NULL,
        "senderId" integer NOT NULL,
        "content" text NOT NULL,
        "clientMessageId" varchar(96)
      );
      CREATE UNIQUE INDEX "conversation_messages_conversation_sender_client_unique"
        ON "conversation_messages" ("conversationId","senderId","clientMessageId");
    `);
  }, 60_000);

  afterEach(async () => {
    await db?.close();
  });

  test("the outbox can re-send the same message forever and it lands exactly once", async () => {
    const clientId = "b3f1c2a4-0000-4000-8000-000000000001";

    const first = await send(7, clientId, "hello");
    expect(first.rows).toHaveLength(1); // inserted

    // Every subsequent reconnect drains the outbox and re-sends. None may duplicate.
    for (let i = 0; i < 5; i++) {
      const replay = await send(7, clientId, "hello");
      expect(replay.rows).toHaveLength(0); // DO NOTHING — no new row
    }

    expect(await count()).toBe(1);
  });

  test("two DIFFERENT messages both land — the guard keys on the id, not the content", async () => {
    await send(7, "uuid-a", "first");
    await send(7, "uuid-b", "second");

    expect(await count()).toBe(2);
  });

  test("the old `client-${Date.now()}` collision silently DROPPED a real message", async () => {
    // Two genuinely different messages composed in the same millisecond got the same id.
    const collidingId = "client-1700000000000";

    await send(7, collidingId, "are you free tomorrow?");
    const second = await send(7, collidingId, "actually make it Friday");

    expect(second.rows).toHaveLength(0);
    expect(await count()).toBe(1);

    // The surviving row is the FIRST message. The second was lost, with the client showing it as
    // sent. A UUID makes this collision impossible.
    const rows = await db.query<{ content: string }>(`SELECT "content" FROM conversation_messages`);
    expect(rows.rows[0].content).toBe("are you free tomorrow?");
  });

  test("different senders with the same clientId do not collide", async () => {
    await send(7, "same-uuid", "from user 7");
    await send(8, "same-uuid", "from user 8");

    expect(await count()).toBe(2);
  });
});
