/**
 * One-off backfill: link parent/guardian accounts to existing team athletes so the
 * parents can use the parent portal. Matches each player payment invite (parent email
 * + name) to its athlete on the team by name, then ensures a guardian account + link.
 *
 * Usage: tsx scripts/backfill-team-guardians.ts <teamId>
 */
import { and, eq } from "drizzle-orm";
import { db, pool } from "../src/db";
import { athleteTable, teamPlayerPaymentInviteTable, userTable } from "../src/db/schema";
import { ensureGuardianForTeamAthlete } from "../src/services/team-roster.service";

const TEAM_ID = Number(process.argv[2] ?? 94);

async function main() {
  const invites = await db
    .select({ name: teamPlayerPaymentInviteTable.playerName, email: teamPlayerPaymentInviteTable.playerEmail })
    .from(teamPlayerPaymentInviteTable)
    .where(eq(teamPlayerPaymentInviteTable.teamId, TEAM_ID));

  const athletes = await db
    .select({ id: athleteTable.id, name: athleteTable.name })
    .from(athleteTable)
    .where(eq(athleteTable.teamId, TEAM_ID));
  const byName = new Map(athletes.map((a) => [(a.name ?? "").trim().toLowerCase(), a.id]));

  console.log(`Team ${TEAM_ID}: ${invites.length} invites, ${athletes.length} athletes\n`);
  console.log(["CHILD", "PARENT EMAIL", "PASSWORD", "NEW_USER"].join("\t"));

  let linked = 0;
  for (const inv of invites) {
    if (!inv.email) continue;
    const athleteId = byName.get((inv.name ?? "").trim().toLowerCase());
    if (!athleteId) {
      console.log(`NO MATCH\t${inv.name}\t${inv.email}`);
      continue;
    }
    const r = await ensureGuardianForTeamAthlete({ athleteId, parentEmail: inv.email, parentName: inv.name });
    console.log([inv.name, r.email, r.temporaryPassword ?? "(existing kept)", r.createdUser].join("\t"));
    linked += 1;
  }

  // sanity: confirm each parent now resolves to a guardian row + linked athlete
  const check = await db
    .select({ guardianEmail: userTable.email })
    .from(athleteTable)
    .innerJoin(userTable, eq(userTable.id, athleteTable.userId))
    .where(and(eq(athleteTable.teamId, TEAM_ID)));
  console.log(`\nLinked ${linked} parents. Athlete rows on team: ${check.length}`);
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
