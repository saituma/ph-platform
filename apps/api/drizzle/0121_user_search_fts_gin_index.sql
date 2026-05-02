-- FTS helper: immutable wrapper so it can be used in index expressions in the future.
-- The GIN index is created separately after the function exists outside a transaction.
CREATE OR REPLACE FUNCTION immutable_tsvector_english(text) RETURNS tsvector
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
'SELECT to_tsvector(''english'', $1)';
