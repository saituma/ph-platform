WITH missing AS (
  SELECT a.id, a.name
  FROM athletes a
  JOIN users u ON u.id = a."userId"
  WHERE u.role <> 'athlete'
),
inserted AS (
  INSERT INTO users ("cognitoSub","name","email","role","emailVerified","createdAt","updatedAt")
  SELECT
    'local:athlete:' || missing.id,
    missing.name,
    'athlete-' || missing.id || '@athlete.local',
    'athlete',
    true,
    now(),
    now()
  FROM missing
  WHERE NOT EXISTS (
    SELECT 1 FROM users u WHERE u."cognitoSub" = 'local:athlete:' || missing.id
  )
  RETURNING id, "cognitoSub"
)
UPDATE athletes a
SET "userId" = u.id,
    "updatedAt" = now()
FROM users u
WHERE u."cognitoSub" = 'local:athlete:' || a.id
  AND a."userId" <> u.id;

WITH admin_users AS (
  SELECT id FROM users WHERE role IN ('admin','coach','superAdmin')
),
athlete_map AS (
  SELECT
    a.id AS athlete_id,
    a."userId" AS athlete_user_id,
    g."userId" AS guardian_user_id,
    COALESCE(a."onboardingCompletedAt", a."createdAt") AS cutoff
  FROM athletes a
  JOIN guardians g ON g.id = a."guardianId"
)
UPDATE messages m
SET "senderId" = am.athlete_user_id,
    "updatedAt" = now()
FROM athlete_map am
WHERE m."senderId" = am.guardian_user_id
  AND m."receiverId" IN (SELECT id FROM admin_users)
  AND m."createdAt" >= am.cutoff;

WITH admin_users AS (
  SELECT id FROM users WHERE role IN ('admin','coach','superAdmin')
),
athlete_map AS (
  SELECT
    a.id AS athlete_id,
    a."userId" AS athlete_user_id,
    g."userId" AS guardian_user_id,
    COALESCE(a."onboardingCompletedAt", a."createdAt") AS cutoff
  FROM athletes a
  JOIN guardians g ON g.id = a."guardianId"
)
UPDATE messages m
SET "receiverId" = am.athlete_user_id,
    "updatedAt" = now()
FROM athlete_map am
WHERE m."receiverId" = am.guardian_user_id
  AND m."senderId" IN (SELECT id FROM admin_users)
  AND m."createdAt" >= am.cutoff;
