import { and, asc, eq } from "drizzle-orm";

import { db } from "../db";
import { teamManagersTable, teamTable, userTable } from "../db/schema";
import { createTeamManagerUser } from "./admin/user.service";
import { ensureManagedTeamInboxMemberships } from "./chat.service";
import { getUserByEmail } from "./user.service";

const PRESERVED_ROLES = new Set(["team_coach", "program_coach", "coach", "admin", "superAdmin"]);

function generateProvisionPassword() {
  const base = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  let out = "";
  for (let i = 0; i < 16; i += 1) {
    out += base[Math.floor(Math.random() * base.length)];
  }
  return out;
}

async function loadTeam(teamId: number) {
  const [team] = await db.select().from(teamTable).where(eq(teamTable.id, teamId)).limit(1);
  if (!team) throw { status: 404, message: "Team not found." };
  return team;
}

export type TeamManagerSummary = {
  userId: number;
  name: string | null;
  email: string;
  role: string | null;
  createdAt: Date | null;
};

export async function listTeamManagers(teamId: number): Promise<{
  primary: TeamManagerSummary | null;
  coManagers: TeamManagerSummary[];
}> {
  const team = await loadTeam(teamId);

  let primary: TeamManagerSummary | null = null;
  if (team.adminId) {
    const [row] = await db
      .select({ userId: userTable.id, name: userTable.name, email: userTable.email, role: userTable.role })
      .from(userTable)
      .where(eq(userTable.id, team.adminId))
      .limit(1);
    if (row) primary = { ...row, createdAt: null };
  }

  const coManagers = await db
    .select({
      userId: userTable.id,
      name: userTable.name,
      email: userTable.email,
      role: userTable.role,
      createdAt: teamManagersTable.createdAt,
    })
    .from(teamManagersTable)
    .innerJoin(userTable, eq(teamManagersTable.userId, userTable.id))
    .where(eq(teamManagersTable.teamId, teamId))
    .orderBy(asc(teamManagersTable.createdAt));

  return { primary, coManagers };
}

export async function addCoManager(input: {
  teamId: number;
  email: string;
  name?: string | null;
  createdByUserId: number;
}): Promise<{ userId: number; email: string; created: boolean; temporaryPassword: string | null }> {
  const email = input.email.trim().toLowerCase();
  if (!email) throw { status: 400, message: "Email is required." };

  const team = await loadTeam(input.teamId);

  let temporaryPassword: string | null = null;
  let created = false;
  let userId: number;

  const existing = await getUserByEmail(email);
  if (existing) {
    userId = existing.id;
    if (userId === team.adminId) {
      throw { status: 409, message: "This person is already the team's primary manager." };
    }
    // Promote non-staff accounts so role-based route guards admit them.
    if (!PRESERVED_ROLES.has(existing.role || "")) {
      await db.update(userTable).set({ role: "team_coach" }).where(eq(userTable.id, userId));
    }
  } else {
    temporaryPassword = generateProvisionPassword();
    const manager = await createTeamManagerUser({
      email,
      password: temporaryPassword,
      name: input.name?.trim() || undefined,
    });
    userId = manager.id;
    created = true;
  }

  await db
    .insert(teamManagersTable)
    .values({ teamId: input.teamId, userId, createdBy: input.createdByUserId })
    .onConflictDoNothing({ target: [teamManagersTable.teamId, teamManagersTable.userId] });

  // Add the co-manager to the team's group chat right away (best-effort — also
  // backfilled lazily when they open their inbox).
  await ensureManagedTeamInboxMemberships(userId).catch(() => {});

  return { userId, email, created, temporaryPassword };
}

export async function removeCoManager(input: { teamId: number; userId: number }): Promise<{ removed: boolean }> {
  const result = await db
    .delete(teamManagersTable)
    .where(and(eq(teamManagersTable.teamId, input.teamId), eq(teamManagersTable.userId, input.userId)))
    .returning({ id: teamManagersTable.id });
  return { removed: result.length > 0 };
}

/** Co-managers (excluding the primary owner) for a team, shaped for getTeamDetailsAdmin. */
export async function listCoManagersForTeam(teamId: number): Promise<TeamManagerSummary[]> {
  const { coManagers } = await listTeamManagers(teamId);
  return coManagers;
}
