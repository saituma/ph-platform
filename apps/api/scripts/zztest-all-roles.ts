/**
 * TEST: create one of each test persona:
 *   1. Adult athlete (PHP_Pro, active 6-month plan) — standalone, like Julian
 *   2. Youth athlete + guardian (PHP Program, standalone)
 *   3. Team (ZZTEST Mannor FC) + youth team athlete
 *
 * All rows are ZZTEST-prefixed. No emails sent. Passwords printed at the end.
 *
 * Usage: tsx scripts/zztest-all-roles.ts
 */
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db, pool } from "../src/db";
import {
  athleteTable,
  guardianTable,
  legalAcceptanceTable,
  teamTable,
  userTable,
} from "../src/db/schema";
import {
  hashLocalProvisionPassword,
} from "../src/services/admin/user.service";
import { createTeamRosterAthlete } from "../src/services/team-roster.service";

const STAMP = Date.now();
const PW = "Test1234!";

function now() { return new Date(); }

function sixMonthsFromNow() {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  return d;
}

async function createUser(email: string, name: string, role: string) {
  const { hash, salt } = hashLocalProvisionPassword(PW);
  const [u] = await db
    .insert(userTable)
    .values({
      cognitoSub: `local:zztest:${crypto.randomUUID()}`,
      name,
      email,
      role: role as any,
      passwordHash: hash,
      passwordSalt: salt,
      emailVerified: true,
      verificationCode: null,
      verificationExpiresAt: null,
      verificationAttempts: 0,
    })
    .returning({ id: userTable.id });
  return u.id;
}

async function main() {
  // ─── 1. Adult athlete ─────────────────────────────────────────────────────
  const adultEmail = `zztest.adult.${STAMP}@example.com`;
  const adultUserId = await createUser(adultEmail, "ZZTEST Adult Athlete", "adult_athlete");

  const [adultAthlete] = await db
    .insert(athleteTable)
    .values({
      userId: adultUserId,
      athleteType: "adult" as any,
      name: "ZZTEST Adult Athlete",
      age: 24,
      birthDate: "2000-01-15",
      team: "",
      trainingPerWeek: 4,
      preferredTrainingDays: ["mon", "wed", "fri", "sat"],
      currentProgramTier: "PHP_Pro" as any,
      currentPlanId: 4,
      planPaymentType: "upfront" as any,
      planCommitmentMonths: 6,
      planExpiresAt: sixMonthsFromNow(),
      onboardingCompleted: true,
      onboardingCompletedAt: now(),
    })
    .returning({ id: athleteTable.id });

  await db.insert(legalAcceptanceTable).values({
    athleteId: adultAthlete.id,
    termsAcceptedAt: now(),
    termsVersion: "1.0",
    privacyAcceptedAt: now(),
    privacyVersion: "1.0",
    appVersion: "1.0.0",
  });

  // ─── 2. Youth athlete + guardian ──────────────────────────────────────────
  const guardianEmail = `zztest.guardian.${STAMP}@example.com`;
  const guardianUserId = await createUser(guardianEmail, "ZZTEST Guardian Parent", "guardian");

  const [guardian] = await db
    .insert(guardianTable)
    .values({
      userId: guardianUserId,
      email: guardianEmail,
      relationToAthlete: "parent",
      currentProgramTier: "PHP" as any,
      currentPlanId: 1,
    })
    .returning({ id: guardianTable.id });

  const [youthAthlete] = await db
    .insert(athleteTable)
    .values({
      userId: guardianUserId,
      guardianId: guardian.id,
      athleteType: "youth" as any,
      name: "ZZTEST Youth Athlete",
      age: 14,
      birthDate: "2010-03-20",
      team: "",
      trainingPerWeek: 3,
      preferredTrainingDays: ["tue", "thu", "sat"],
      currentProgramTier: "PHP" as any,
      currentPlanId: 1,
      planPaymentType: "upfront" as any,
      planCommitmentMonths: 12,
      planExpiresAt: sixMonthsFromNow(),
      onboardingCompleted: true,
      onboardingCompletedAt: now(),
    })
    .returning({ id: athleteTable.id });

  await db
    .update(guardianTable)
    .set({ activeAthleteId: youthAthlete.id, updatedAt: now() })
    .where(eq(guardianTable.id, guardian.id));

  await db.insert(legalAcceptanceTable).values({
    athleteId: youthAthlete.id,
    termsAcceptedAt: now(),
    termsVersion: "1.0",
    privacyAcceptedAt: now(),
    privacyVersion: "1.0",
    appVersion: "1.0.0",
  });

  // ─── 3. Team + Mannor athlete ──────────────────────────────────────────────
  const coachEmail = `zztest.coach.${STAMP}@example.com`;
  const coachUserId = await createUser(coachEmail, "ZZTEST Coach", "team_coach");

  const teamName = `ZZTEST Mannor FC ${STAMP}`;
  const [team] = await db
    .insert(teamTable)
    .values({
      name: teamName,
      athleteType: "youth" as any,
      adminId: coachUserId,
      planId: 1,
      maxAthletes: 20,
      emailSlug: `zztest-mannor-${STAMP}`,
      paymentMode: "coach_pays_all" as any,
      subscriptionStatus: "active",
      updatedAt: now(),
    })
    .returning({ id: teamTable.id });

  const mannor = await createTeamRosterAthlete(
    { id: coachUserId, role: "admin" },
    { teamId: team.id, username: `zztestmannor${STAMP}`.slice(0, 24), name: "ZZTEST Mannor", age: 15 },
  );

  // ─── Print logins ──────────────────────────────────────────────────────────
  console.log(JSON.stringify({
    password_all: PW,
    adult_athlete: {
      email: adultEmail,
      password: PW,
      plan: "PHP_Pro (active, expires 6 months)",
      athleteId: adultAthlete.id,
    },
    youth_athlete_guardian: {
      email: guardianEmail,
      password: PW,
      role: "guardian (logs in as guardian, sees youth athlete)",
      plan: "PHP Program",
      athleteId: youthAthlete.id,
    },
    team_mannor: {
      team: { id: team.id, name: teamName },
      coach: { email: coachEmail, password: PW },
      athlete_mannor: {
        email: mannor.email,
        password: mannor.temporaryPassword,
        athleteId: mannor.athleteId,
      },
    },
  }, null, 2));

  await pool.end();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch {}
  process.exit(1);
});
