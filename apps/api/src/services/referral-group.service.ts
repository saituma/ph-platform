import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../db";
import { athleteTable, referralGroupMemberTable, referralGroupTable } from "../db/schema";

let referralGroupTablesEnsured = false;

async function ensureReferralGroupTables() {
  if (referralGroupTablesEnsured) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "referral_groups" (
      "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      "name" varchar(255) NOT NULL,
      "expectedSize" integer NOT NULL DEFAULT 0,
      "createdBy" integer NOT NULL REFERENCES "users"("id"),
      "createdAt" timestamp NOT NULL DEFAULT now(),
      "updatedAt" timestamp NOT NULL DEFAULT now()
    );
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "referral_group_members" (
      "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      "groupId" integer NOT NULL REFERENCES "referral_groups"("id"),
      "athleteId" integer NOT NULL REFERENCES "athletes"("id"),
      "createdAt" timestamp NOT NULL DEFAULT now()
    );
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "referral_group_members_group_athlete_unique"
    ON "referral_group_members" ("groupId", "athleteId");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "referral_group_members_group_idx"
    ON "referral_group_members" ("groupId");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "referral_group_members_athlete_idx"
    ON "referral_group_members" ("athleteId");
  `);
  referralGroupTablesEnsured = true;
}

export async function listReferralGroups() {
  await ensureReferralGroupTables();
  const groups = await db.select().from(referralGroupTable);

  if (!groups.length) return [];

  const members = await db
    .select({
      groupId: referralGroupMemberTable.groupId,
      athleteId: referralGroupMemberTable.athleteId,
      athleteName: athleteTable.name,
      athleteAge: athleteTable.age,
      programTier: athleteTable.currentProgramTier,
    })
    .from(referralGroupMemberTable)
    .innerJoin(athleteTable, eq(referralGroupMemberTable.athleteId, athleteTable.id))
    .where(
      inArray(
        referralGroupMemberTable.groupId,
        groups.map((group) => group.id),
      ),
    );

  const membersByGroupId = new Map<number, typeof members>();
  members.forEach((member) => {
    const existing = membersByGroupId.get(member.groupId) ?? [];
    existing.push(member);
    membersByGroupId.set(member.groupId, existing);
  });

  return groups.map((group) => ({
    ...group,
    members: membersByGroupId.get(group.id) ?? [],
  }));
}

export async function createReferralGroup(input: {
  name: string;
  expectedSize: number;
  athleteIds: number[];
  createdBy: number;
}) {
  await ensureReferralGroupTables();
  const [group] = await db
    .insert(referralGroupTable)
    .values({
      name: input.name,
      expectedSize: input.expectedSize,
      createdBy: input.createdBy,
    })
    .returning();

  if (input.athleteIds.length) {
    await db.insert(referralGroupMemberTable).values(
      input.athleteIds.map((athleteId) => ({
        groupId: group.id,
        athleteId,
      })),
    );
  }

  const [created] = await listReferralGroups().then((groups) => groups.filter((item) => item.id === group.id));
  return created ?? { ...group, members: [] };
}

export async function getReferralGroupAthletes(groupId: number) {
  await ensureReferralGroupTables();
  return db
    .select({
      athleteId: athleteTable.id,
      athleteName: athleteTable.name,
      athleteAge: athleteTable.age,
      programTier: athleteTable.currentProgramTier,
    })
    .from(referralGroupMemberTable)
    .innerJoin(athleteTable, eq(referralGroupMemberTable.athleteId, athleteTable.id))
    .where(eq(referralGroupMemberTable.groupId, groupId));
}
