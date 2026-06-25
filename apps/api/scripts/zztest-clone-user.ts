/**
 * Clone an existing user into a ZZTEST shadow account with the same athlete
 * stats, plan, and program assignments so you can log in and see exactly what
 * that user sees.
 *
 * Usage:
 *   tsx scripts/zztest-clone-user.ts <sourceUserId>
 *
 * Example:
 *   tsx scripts/zztest-clone-user.ts 19330
 */
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db, pool } from "../src/db";
import { athleteTable, programAssignmentTable, subscriptionRequestTable, userTable } from "../src/db/schema";
import { hashLocalProvisionPassword } from "../src/services/admin/user.service";

const SOURCE_ID = Number(process.argv[2]);

if (!SOURCE_ID || isNaN(SOURCE_ID)) {
  console.error("Usage: tsx scripts/zztest-clone-user.ts <sourceUserId>");
  process.exit(1);
}

function generatePassword(len = 14): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function main() {
  // 1. Load source user
  const [sourceUser] = await db.select().from(userTable).where(eq(userTable.id, SOURCE_ID)).limit(1);
  if (!sourceUser) {
    console.error(`User ${SOURCE_ID} not found`);
    process.exit(1);
  }

  // 2. Load source athlete profile
  const [sourceAthlete] = await db
    .select()
    .from(athleteTable)
    .where(eq(athleteTable.userId, SOURCE_ID))
    .limit(1);

  // 3. Create shadow user
  const STAMP = Date.now();
  const email = `zztest.shadow.${STAMP}@example.com`;
  const password = generatePassword();
  const { hash, salt } = hashLocalProvisionPassword(password);

  const [newUser] = await db
    .insert(userTable)
    .values({
      cognitoSub: `local:${crypto.randomUUID()}`,
      name: `ZZTEST ${sourceUser.name}`,
      email,
      role: sourceUser.role,
      emailVerified: true,
      passwordHash: hash,
      passwordSalt: salt,
      updatedAt: new Date(),
    })
    .returning({ id: userTable.id });

  console.log(`Created user #${newUser.id} (${email})`);

  // 4. Clone athlete profile if it exists
  let newAthleteId: number | null = null;
  if (sourceAthlete) {
    const [newAthlete] = await db
      .insert(athleteTable)
      .values({
        userId: newUser.id,
        guardianId: null,
        athleteType: sourceAthlete.athleteType,
        name: `ZZTEST ${sourceAthlete.name}`,
        age: sourceAthlete.age,
        birthDate: sourceAthlete.birthDate,
        teamId: null,
        team: sourceAthlete.team,
        trainingPerWeek: sourceAthlete.trainingPerWeek,
        preferredTrainingDays: sourceAthlete.preferredTrainingDays,
        phoneNumber: sourceAthlete.phoneNumber,
        injuries: sourceAthlete.injuries,
        performanceGoals: sourceAthlete.performanceGoals,
        equipmentAccess: sourceAthlete.equipmentAccess,
        currentProgramTier: sourceAthlete.currentProgramTier,
        currentPlanId: sourceAthlete.currentPlanId,
        planPaymentType: sourceAthlete.planPaymentType,
        planCommitmentMonths: sourceAthlete.planCommitmentMonths,
        planExpiresAt: sourceAthlete.planExpiresAt,
        isSponsored: sourceAthlete.isSponsored,
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: athleteTable.id });

    newAthleteId = newAthlete.id;
    console.log(`Cloned athlete profile #${newAthleteId} (tier: ${sourceAthlete.currentProgramTier})`);

    // 5. Clone approved subscription request so the user shows a valid plan
    const [sourceSub] = await db
      .select()
      .from(subscriptionRequestTable)
      .where(eq(subscriptionRequestTable.athleteId, sourceAthlete.id))
      .orderBy(subscriptionRequestTable.createdAt)
      .limit(1);

    if (sourceSub) {
      await db.insert(subscriptionRequestTable).values({
        userId: newUser.id,
        athleteId: newAthleteId,
        planId: sourceSub.planId,
        planBillingCycle: sourceSub.planBillingCycle,
        paymentAmountCents: sourceSub.paymentAmountCents,
        paymentCurrency: sourceSub.paymentCurrency,
        paymentStatus: "paid",
        receiptPublicId: crypto.randomUUID(),
        status: "approved",
        updatedAt: new Date(),
      });
      console.log(`Cloned subscription (plan #${sourceSub.planId})`);
    }

    // 6. Clone program assignments
    const assignments = await db
      .select()
      .from(programAssignmentTable)
      .where(eq(programAssignmentTable.athleteId, sourceAthlete.id));

    for (const asgn of assignments) {
      try {
        await db.insert(programAssignmentTable).values({
          athleteId: newAthleteId,
          programId: asgn.programId,
          assignedBy: asgn.assignedBy,
          status: asgn.status,
          scheduledDate: asgn.scheduledDate,
          startedAt: asgn.startedAt,
          updatedAt: new Date(),
        });
      } catch {
        // skip if duplicate
      }
    }
    console.log(`Cloned ${assignments.length} program assignment(s)`);
  }

  console.log("\n--- LOGIN ---");
  console.log(JSON.stringify({ email, password, userId: newUser.id, athleteId: newAthleteId }, null, 2));

  await pool.end();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch {}
  process.exit(1);
});
