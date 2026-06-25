/**
 * TEST: build a full team account: primary manager + co-manager + 2 athletes
 * on the team "ZZTEST United 1780410676710" (created if missing). Exercises the
 * co-manager feature end to end. All rows ZZTEST-prefixed. No emails sent.
 *
 * Usage: tsx scripts/zztest-full-team.ts
 */
import { count, eq } from "drizzle-orm";
import { db, pool } from "../src/db";
import { athleteTable, teamManagersTable, teamTable, userTable } from "../src/db/schema";
import { createTeamManagerUser } from "../src/services/admin/user.service";
import { addCoManager, listTeamManagers } from "../src/services/team-managers.service";
import { createTeamRosterAthlete } from "../src/services/team-roster.service";

const TEAM_NAME = "ZZTEST United 1780410676710";
const STAMP = Date.now();

function pw() {
  const base = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  let out = "";
  for (let i = 0; i < 16; i += 1) out += base[Math.floor(Math.random() * base.length)];
  return out;
}

async function main() {
  // 1. Resolve or create the team + its primary manager (adminId).
  let [team] = await db
    .select({ id: teamTable.id, adminId: teamTable.adminId, slug: teamTable.emailSlug })
    .from(teamTable)
    .where(eq(teamTable.name, TEAM_NAME))
    .limit(1);

  const managerPw = pw();
  let manager: { id: number; email: string };
  let managerPassword: string | null = null;

  if (team) {
    // Reuse existing team; ensure it has a primary manager.
    if (team.adminId) {
      const [u] = await db
        .select({ id: userTable.id, email: userTable.email })
        .from(userTable)
        .where(eq(userTable.id, team.adminId))
        .limit(1);
      if (!u) throw new Error(`Team ${team.id} points at missing adminId ${team.adminId}`);
      manager = { id: u.id, email: u.email };
    } else {
      const created = await createTeamManagerUser({ email: `zztest.mgr.${STAMP}@example.com`, password: managerPw, name: "ZZTEST Manager" });
      await db.update(teamTable).set({ adminId: created.id, updatedAt: new Date() }).where(eq(teamTable.id, team.id));
      manager = { id: created.id, email: created.email };
      managerPassword = managerPw;
    }
  } else {
    const created = await createTeamManagerUser({ email: `zztest.mgr.${STAMP}@example.com`, password: managerPw, name: "ZZTEST Manager" });
    manager = { id: created.id, email: created.email };
    managerPassword = managerPw;
    const [inserted] = await db
      .insert(teamTable)
      .values({
        name: TEAM_NAME,
        athleteType: "youth",
        adminId: created.id,
        planId: 1,
        maxAthletes: 10,
        emailSlug: `zztest-united-${STAMP}`,
        paymentMode: "coach_pays_all",
        subscriptionStatus: "active",
        updatedAt: new Date(),
      })
      .returning({ id: teamTable.id, adminId: teamTable.adminId, slug: teamTable.emailSlug });
    team = inserted;
  }

  // 2. Co-manager (creates a team_coach user + team_managers row + team group membership).
  const coManager = await addCoManager({
    teamId: team.id,
    email: `zztest.comgr.${STAMP}@example.com`,
    name: "ZZTEST Co-Manager",
    createdByUserId: manager.id,
  });

  // 3. Two athletes (acting as admin so teamId is honoured).
  const actor = { id: manager.id, role: "admin" };
  const a1 = await createTeamRosterAthlete(actor, { teamId: team.id, username: `zza1${STAMP}`.slice(0, 24), name: "ZZTEST Athlete One", age: 13 });
  const a2 = await createTeamRosterAthlete(actor, { teamId: team.id, username: `zza2${STAMP}`.slice(0, 24), name: "ZZTEST Athlete Two", age: 15 });

  const managers = await listTeamManagers(team.id);
  const [athleteCount] = await db
    .select({ count: count() })
    .from(athleteTable)
    .where(eq(athleteTable.teamId, team.id));
  const [coManagerCount] = await db
    .select({ count: count() })
    .from(teamManagersTable)
    .where(eq(teamManagersTable.teamId, team.id));

  console.log(
    JSON.stringify(
      {
        team: { id: team.id, name: TEAM_NAME },
        primaryManager: { userId: manager.id, email: manager.email, password: managerPassword ?? "(existing - unchanged)" },
        coManager: { userId: coManager.userId, email: coManager.email, password: coManager.temporaryPassword, created: coManager.created },
        athletes: [
          { userId: a1.userId, athleteId: a1.athleteId, email: a1.email, password: a1.temporaryPassword },
          { userId: a2.userId, athleteId: a2.athleteId, email: a2.email, password: a2.temporaryPassword },
        ],
        verification: {
          primaryManager: managers.primary,
          coManagers: managers.coManagers,
          totalCoManagers: Number(coManagerCount?.count ?? 0),
          totalAthletesOnTeam: Number(athleteCount?.count ?? 0),
        },
      },
      null,
      2,
    ),
  );

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
