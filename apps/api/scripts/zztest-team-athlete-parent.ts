/**
 * TEST: create a fresh team + an athlete WITH a parent email via the new
 * createTeamRosterAthlete(guardianEmail) path, then set the parent's password to the
 * child's (the "for now" behavior) and report logins. All rows are ZZTEST-prefixed for
 * easy cleanup. No emails are sent.
 *
 * Usage: tsx scripts/zztest-team-athlete-parent.ts [parentEmail]
 */
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db, pool } from "../src/db";
import { teamTable, userTable } from "../src/db/schema";
import { createTeamRosterAthlete } from "../src/services/team-roster.service";
import { hashLocalProvisionPassword } from "../src/services/admin/user.service";

const STAMP = Date.now();
const PARENT_EMAIL = (process.argv[2] ?? `zztest.parent.${STAMP}@example.com`).toLowerCase();

async function main() {
  // 1. test coach (becomes the team's adminId)
  const [coach] = await db
    .insert(userTable)
    .values({
      cognitoSub: `local:zztest:${crypto.randomUUID()}`,
      name: "ZZTEST Coach",
      email: `zztest.coach.${STAMP}@example.com`,
      role: "team_coach",
      emailVerified: true,
    })
    .returning({ id: userTable.id });

  // 2. a DIFFERENT team (not Mannor EJA) on the PHP Program plan (id 1)
  const teamName = `ZZTEST United ${STAMP}`;
  const [team] = await db
    .insert(teamTable)
    .values({
      name: teamName,
      athleteType: "youth",
      adminId: coach.id,
      planId: 1,
      maxAthletes: 10,
      emailSlug: `zztest-united-${STAMP}`,
      paymentMode: "coach_pays_all",
      subscriptionStatus: "active",
      updatedAt: new Date(),
    })
    .returning({ id: teamTable.id });

  // 3. create athlete WITH parent email through the NEW code path
  const result = await createTeamRosterAthlete(
    { id: coach.id, role: "admin" },
    { teamId: team.id, username: "zztestkid", name: "ZZTEST Kid", age: 12, guardianEmail: PARENT_EMAIL },
  );

  // 4. make the parent's password match the child's (the "for now" behavior)
  const childPw = result.temporaryPassword;
  const { hash, salt } = hashLocalProvisionPassword(childPw);
  await db
    .update(userTable)
    .set({ passwordHash: hash, passwordSalt: salt, emailVerified: true, updatedAt: new Date() })
    .where(eq(userTable.email, PARENT_EMAIL));

  console.log(JSON.stringify(
    {
      team: { id: team.id, name: teamName },
      athleteLogin: { email: result.email, password: childPw },
      parentPortalLogin: { email: PARENT_EMAIL, password: childPw },
      guardian: result.guardian,
    },
    null,
    2,
  ));

  await pool.end();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  try {
    await pool.end();
  } catch {}
  process.exit(1);
});
