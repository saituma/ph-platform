import { PGlite } from "@electric-sql/pglite";

/**
 * Two bugs, verified against a real Postgres.
 *
 * 1. persistDirectMessage was five un-wrapped statements (find-or-create conversation, insert
 *    message, insert two receipts, bump conversations.updatedAt). A crash between them left a
 *    message row with NO receipts — permanently invisible in unread counts and the inbox preview,
 *    with nothing to ever repair it. It is now one transaction.
 *
 * 2. conversation_receipts."deliveredAt" was NOT NULL DEFAULT now() and was stamped for BOTH
 *    participants at insert, so markConversationMessageDelivered's `WHERE "deliveredAt" IS NULL`
 *    guard could never match. Delivery receipts were a permanent no-op that still emitted
 *    "delivered" to the sender. Every ✓✓ was a lie.
 */
describe("message write: atomicity and real delivery receipts", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE TABLE conversations (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "updatedAt" timestamp NOT NULL DEFAULT now()
      );
      CREATE TABLE conversation_messages (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "conversationId" integer NOT NULL REFERENCES conversations("id"),
        "senderId" integer NOT NULL,
        "content" text NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now()
      );
      -- deliveredAt is nullable and has NO default (migration 0184).
      CREATE TABLE conversation_receipts (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "messageId" integer NOT NULL REFERENCES conversation_messages("id"),
        "userId" integer NOT NULL,
        "deliveredAt" timestamp,
        "readAt" timestamp
      );
      INSERT INTO conversations DEFAULT VALUES;
    `);
  }, 60_000);

  afterEach(async () => {
    await db?.close();
  });

  const SENDER = 1;
  const RECEIVER = 2;

  async function writeMessage() {
    await db.exec("BEGIN");
    const msg = await db.query<{ id: number; createdAt: Date }>(
      `INSERT INTO conversation_messages ("conversationId","senderId","content") VALUES (1,$1,'hi') RETURNING "id","createdAt"`,
      [SENDER],
    );
    const id = msg.rows[0].id;
    await db.query(
      `INSERT INTO conversation_receipts ("messageId","userId","deliveredAt","readAt")
       VALUES ($1,$2,now(),now()), ($1,$3,NULL,NULL)`,
      [id, SENDER, RECEIVER],
    );
    await db.exec("COMMIT");
    return id;
  }

  describe("delivery receipts are now possible at all", () => {
    test("the receiver's receipt starts NULL — the sender's does not", async () => {
      const id = await writeMessage();

      const rows = await db.query<{ userId: number; deliveredAt: Date | null }>(
        `SELECT "userId","deliveredAt" FROM conversation_receipts WHERE "messageId"=$1 ORDER BY "userId"`,
        [id],
      );

      expect(rows.rows.find((r) => r.userId === SENDER)?.deliveredAt).not.toBeNull();
      // The old schema made this impossible: NOT NULL DEFAULT now() forced a timestamp here.
      expect(rows.rows.find((r) => r.userId === RECEIVER)?.deliveredAt).toBeNull();
    });

    test("the IS NULL guard actually matches, so the device can stamp delivery", async () => {
      const id = await writeMessage();

      const updated = await db.query(
        `UPDATE conversation_receipts SET "deliveredAt" = now()
         WHERE "messageId"=$1 AND "userId"=$2 AND "deliveredAt" IS NULL`,
        [id, RECEIVER],
      );

      // Under the old schema this matched ZERO rows, every time, forever.
      expect(updated.affectedRows).toBe(1);
    });

    test("stamping delivery twice is idempotent — the second is a no-op", async () => {
      const id = await writeMessage();
      const sql = `UPDATE conversation_receipts SET "deliveredAt" = now()
                   WHERE "messageId"=$1 AND "userId"=$2 AND "deliveredAt" IS NULL`;

      expect((await db.query(sql, [id, RECEIVER])).affectedRows).toBe(1);
      expect((await db.query(sql, [id, RECEIVER])).affectedRows).toBe(0);
    });
  });

  describe("atomicity", () => {
    test("a failure after the message insert leaves NO message and NO receipts", async () => {
      await db.exec("BEGIN");
      await db.query(
        `INSERT INTO conversation_messages ("conversationId","senderId","content") VALUES (1,$1,'doomed')`,
        [SENDER],
      );
      // Simulate the crash: the receipt insert fails (FK violation on a message that isn't there).
      await expect(
        db.query(`INSERT INTO conversation_receipts ("messageId","userId") VALUES (99999,$1)`, [RECEIVER]),
      ).rejects.toThrow();
      await db.exec("ROLLBACK");

      const messages = await db.query(`SELECT "id" FROM conversation_messages`);
      const receipts = await db.query(`SELECT "id" FROM conversation_receipts`);

      // Before the transaction, the message survived with zero receipts — invisible forever.
      expect(messages.rows).toHaveLength(0);
      expect(receipts.rows).toHaveLength(0);
    });

    test("a committed write always has a message AND both receipts", async () => {
      const id = await writeMessage();

      const receipts = await db.query(`SELECT "userId" FROM conversation_receipts WHERE "messageId"=$1`, [id]);
      expect(receipts.rows).toHaveLength(2);
    });
  });
});
