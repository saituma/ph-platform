import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";

import { db } from "../db";
import { adminSettingsTable, ProgramType, userTable } from "../db/schema";
import { withTransientDbRetryConfigured } from "../lib/db-connectivity";
import { ROLES_TRAINING_STAFF } from "../lib/user-roles";

const ALL_TIERS = ProgramType.enumValues;
const AI_COACH_EMAIL = "ai-coach@football-performance.ai";

async function getPrimaryCoachUser() {
  return withTransientDbRetryConfigured(
    "getPrimaryCoachUser",
    async () => {
      const users = await db
        .select()
        .from(userTable)
        .where(
          and(
            inArray(userTable.role, ROLES_TRAINING_STAFF),
            eq(userTable.isDeleted, false),
            eq(userTable.isBlocked, false),
            ne(userTable.email, AI_COACH_EMAIL),
          ),
        )
        .orderBy(
          desc(sql`length(trim(coalesce(${userTable.profilePicture}, ''))) > 0`),
          desc(sql`lower(trim(coalesce(${userTable.name}, ''))) not in ('admin', 'administrator')`),
          desc(userTable.updatedAt),
        );
      return users[0] ?? null;
    },
    { maxAttempts: 2 },
  );
}

export type ProgramTierValue = (typeof ALL_TIERS)[number];

export async function getMessagingAccessTiers(): Promise<ProgramTierValue[]> {
  const coach = await getPrimaryCoachUser();
  if (!coach) return [...ALL_TIERS];
  const existing = await withTransientDbRetryConfigured(
    "getMessagingAccessTiers:settings",
    () => db.select().from(adminSettingsTable).where(eq(adminSettingsTable.userId, coach.id)).limit(1),
    { maxAttempts: 2 },
  );
  const raw = existing[0]?.messagingEnabledTiers as unknown;
  if (raw === undefined || raw === null) return [...ALL_TIERS];
  if (!Array.isArray(raw)) return [...ALL_TIERS];
  if (raw.length === 0) return [];
  const allowed = new Set(ALL_TIERS);
  const out = raw.filter((t): t is ProgramTierValue => typeof t === "string" && allowed.has(t as ProgramTierValue));
  return out.length ? out : [];
}
