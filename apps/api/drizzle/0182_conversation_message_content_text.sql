-- conversation_messages.content was varchar(500) while the socket schema allowed 2000
-- and the REST schema had no max at all. Any DM over 500 chars raised Postgres 22001
-- and surfaced as an unhandled 500. Replies made it worse: the [reply:<id>:<preview>]
-- prefix is prepended AFTER validation and a URI-encoded 160-char preview can consume
-- ~495 of the 500-char budget on its own.
--
-- text has no storage penalty over varchar in Postgres; the limit now lives at the
-- request boundary (MAX_MESSAGE_LENGTH) where it can be enforced consistently.
ALTER TABLE "conversation_messages" ALTER COLUMN "content" SET DATA TYPE text;
