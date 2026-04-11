UPDATE "athletes"
SET "team" = ''
WHERE lower(trim("team")) = 'unknown';

