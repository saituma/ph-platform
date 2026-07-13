-- Delivery receipts were structurally impossible.
--
-- conversation_receipts."deliveredAt" was NOT NULL DEFAULT now(), and persistDirectMessage set it
-- to the message's createdAt for BOTH participants at insert. markConversationMessageDelivered
-- then tried to stamp it with:
--
--     UPDATE ... SET "deliveredAt" = now() WHERE ... AND "deliveredAt" IS NULL
--
-- ...a condition that could never be true. It was a permanent no-op that still emitted
-- "message:status: delivered" to the sender. Combined with the hardcoded deliveredCount:2 in
-- emitDirectMessageNew, every double-tick the app has ever shown was a lie: it meant "the server
-- stored this", not "the recipient's device received it".
--
-- Relaxing the column is safe and reversible. Existing rows keep their timestamps (those messages
-- were in fact delivered long ago). New receiver rows are NULL until the device actually says so.
ALTER TABLE "conversation_receipts" ALTER COLUMN "deliveredAt" DROP NOT NULL;
ALTER TABLE "conversation_receipts" ALTER COLUMN "deliveredAt" DROP DEFAULT;
