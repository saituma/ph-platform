import { PGlite } from "@electric-sql/pglite";

/**
 * The inbox's "last message per conversation" lookup used to run:
 *
 *   SELECT ... FROM conversation_messages
 *   WHERE "conversationId" IN (...)
 *   ORDER BY "id" DESC          -- no LIMIT
 *
 * ...and then pick the head of each group in JavaScript. Opening the inbox therefore loaded
 * every message the user had ever exchanged; for a platform admin, whose conversation set is
 * every conversation they participate in, it was effectively a full scan of the table — on the
 * app's hottest endpoint, against a 5-connection pool.
 *
 * This runs both forms against a real Postgres (pglite) and asserts the new one returns the
 * same answer while reading a bounded number of rows.
 */
describe("inbox last-message-per-conversation", () => {
  const CONVERSATIONS = [101, 102, 103];
  const PER_CONVERSATION = 200;
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE TABLE conversation_messages (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "conversationId" integer NOT NULL,
        "senderId" integer NOT NULL,
        "content" text NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now()
      );
      CREATE INDEX "conversation_messages_conversation_id_desc_idx"
        ON "conversation_messages" ("conversationId", "id" DESC);
    `);

    for (const conversationId of CONVERSATIONS) {
      for (let i = 1; i <= PER_CONVERSATION; i++) {
        await db.query(`INSERT INTO conversation_messages ("conversationId","senderId","content") VALUES ($1,$2,$3)`, [
          conversationId,
          1,
          `conv ${conversationId} msg ${i}`,
        ]);
      }
    }
  }, 60_000);

  afterAll(async () => {
    await db?.close();
  });

  const ids = () => `(${CONVERSATIONS.join(",")})`;

  const latestPerConversation = () =>
    db.query<{ conversationId: number; id: number; content: string }>(`
      SELECT DISTINCT ON ("conversationId") "conversationId", "id", "content"
      FROM conversation_messages
      WHERE "conversationId" IN ${ids()}
      ORDER BY "conversationId", "id" DESC
    `);

  test("returns exactly one row per conversation, not every message", async () => {
    const result = await latestPerConversation();

    expect(result.rows).toHaveLength(CONVERSATIONS.length);
    // The regression this guards: the old query returned CONVERSATIONS * PER_CONVERSATION rows.
    expect(result.rows.length).toBeLessThan(CONVERSATIONS.length * PER_CONVERSATION);
  });

  test("picks the same last message the old JS head-per-group did", async () => {
    const unbounded = await db.query<{ conversationId: number; id: number; content: string }>(`
      SELECT "conversationId", "id", "content"
      FROM conversation_messages
      WHERE "conversationId" IN ${ids()}
      ORDER BY "id" DESC
    `);

    const expected = new Map<number, { id: number; content: string }>();
    for (const row of unbounded.rows) {
      if (!expected.has(row.conversationId)) expected.set(row.conversationId, row);
    }

    const result = await latestPerConversation();
    for (const row of result.rows) {
      expect(row).toMatchObject(expected.get(row.conversationId)!);
    }
  });

  test("the last message really is the newest one in each conversation", async () => {
    const result = await latestPerConversation();
    for (const row of result.rows) {
      expect(row.content).toBe(`conv ${row.conversationId} msg ${PER_CONVERSATION}`);
    }
  });

  test("uses the (conversationId, id DESC) index rather than scanning the table", async () => {
    const plan = await db.query<{ "QUERY PLAN": string }>(`
      EXPLAIN SELECT DISTINCT ON ("conversationId") "conversationId", "id", "content"
      FROM conversation_messages
      WHERE "conversationId" IN ${ids()}
      ORDER BY "conversationId", "id" DESC
    `);
    const text = plan.rows.map((r) => r["QUERY PLAN"]).join("\n");

    expect(text).toContain("conversation_messages_conversation_id_desc_idx");
    expect(text).not.toContain("Seq Scan");
  });
});
