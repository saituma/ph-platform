import { db, pool } from "../db";
import {
  athleteTrainingSessionCompletionTable,
  athleteTrainingSessionLogTable,
  programSectionCompletionTable,
  trainingAudienceTable,
  trainingModuleSessionTable,
  trainingModuleTable,
  trainingModuleTierLockTable,
  trainingOtherContentTable,
  trainingOtherSettingTable,
  trainingSessionItemTable,
  trainingSessionTierLockTable,
  userTable,
} from "../db/schema";
import { eq } from "drizzle-orm";
import { ensureTrainingAudienceExists, normalizeAudienceLabel } from "../services/training-content-v2/audience.service";

type Tier = "PHP" | "PHP_Premium" | "PHP_Premium_Plus" | "PHP_Pro";
type OtherType =
  | "warmup"
  | "cooldown"
  | "mobility"
  | "recovery"
  | "inseason"
  | "offseason"
  | "education";

const TIERS: Tier[] = ["PHP", "PHP_Premium", "PHP_Premium_Plus", "PHP_Pro"];
const OTHER_TYPES: OtherType[] = [
  "warmup",
  "cooldown",
  "mobility",
  "recovery",
  "inseason",
  "offseason",
  "education",
];

const YOUTH_AGES = Array.from({ length: 12 }, (_, idx) => 7 + idx);
const ADULT_AGE = 19;
const ADULT_AUDIENCE_PREFIX = "adult::";

const TIER_LABELS: Record<Tier, string> = {
  PHP: "PHP Program",
  PHP_Premium: "PHP Premium",
  PHP_Premium_Plus: "PHP Premium Plus",
  PHP_Pro: "PHP Pro",
};

const MODULES_PER_AUDIENCE = 12;
const SESSIONS_PER_MODULE = 5;

const SHORTS = [
  "https://www.youtube.com/shorts/9bZkp7q19f0",
  "https://www.youtube.com/shorts/3JZ_D3ELwOQ",
  "https://www.youtube.com/shorts/kJQP7kiw5Fk",
  "https://www.youtube.com/shorts/OPf0YbXqDm0",
  "https://www.youtube.com/shorts/L_jWHffIx5E",
  "https://www.youtube.com/shorts/2Vv-BfVoq4g",
  "https://www.youtube.com/shorts/hT_nvWreIhg",
  "https://www.youtube.com/shorts/fRh_vgS2dFE",
  "https://www.youtube.com/shorts/09R8_2nJtjg",
  "https://www.youtube.com/shorts/tVj0ZTS4WF4",
];

function randomShort() {
  return SHORTS[Math.floor(Math.random() * SHORTS.length)];
}

async function resolveAdminId(): Promise<number> {
  const admin = await db.select().from(userTable).where(eq(userTable.role, "admin")).limit(1);
  if (admin[0]) return admin[0].id;
  const superAdmin = await db.select().from(userTable).where(eq(userTable.role, "superAdmin")).limit(1);
  if (superAdmin[0]) return superAdmin[0].id;
  throw new Error("No admin or superAdmin user found. Run seed:admin first.");
}

async function wipeTrainingData() {
  console.log("Wiping training data...");
  await db.delete(athleteTrainingSessionCompletionTable);
  await db.delete(athleteTrainingSessionLogTable);
  await db.delete(trainingSessionItemTable);
  await db.delete(trainingSessionTierLockTable);
  await db.delete(trainingModuleSessionTable);
  await db.delete(trainingModuleTierLockTable);
  await db.delete(trainingModuleTable);
  await db.delete(trainingOtherContentTable);
  await db.delete(trainingOtherSettingTable);
  await db.delete(trainingAudienceTable);
  await db.delete(programSectionCompletionTable);
  console.log("Wipe complete.");
}

async function seedModulesForAudience(input: {
  audienceLabel: string;
  age: number;
  createdBy: number;
  moduleTitlePrefix: string;
  startOrder?: number;
}) {
  const modules: Array<{ id: number; order: number }> = [];
  let order = input.startOrder ?? 1;
  console.log(`Seeding modules for ${input.moduleTitlePrefix} (${input.audienceLabel})...`);
  for (let moduleIndex = 1; moduleIndex <= MODULES_PER_AUDIENCE; moduleIndex += 1) {
    const [moduleRow] = await db
      .insert(trainingModuleTable)
      .values({
        age: input.age,
        audienceLabel: input.audienceLabel,
        title: `${input.moduleTitlePrefix} Module ${moduleIndex}`,
        order,
        createdBy: input.createdBy,
      })
      .returning({ id: trainingModuleTable.id, order: trainingModuleTable.order });
    modules.push(moduleRow);

    for (let sessionOrder = 1; sessionOrder <= SESSIONS_PER_MODULE; sessionOrder += 1) {
      const [sessionRow] = await db
        .insert(trainingModuleSessionTable)
        .values({
          moduleId: moduleRow.id,
          title: `Session ${sessionOrder}`,
          order: sessionOrder,
          dayLength: 7,
        })
        .returning({ id: trainingModuleSessionTable.id });

      await db.insert(trainingSessionItemTable).values({
        sessionId: sessionRow.id,
        blockType: "main",
        title: `Primary Block ${sessionOrder}`,
        body: "Focus on quality reps, clean tempo, and controlled breathing.",
        videoUrl: randomShort(),
        allowVideoUpload: false,
        metadata: {
          sets: 3,
          reps: 8,
          restSeconds: 75,
        },
        order: 1,
        createdBy: input.createdBy,
      });
    }

    order += 1;
  }
  console.log(`Seeded ${modules.length} modules for ${input.moduleTitlePrefix}.`);
  return modules;
}

async function seedTierLocksForAdultModules(input: {
  audienceLabel: string;
  createdBy: number;
  tierStartMap: Map<Tier, number>;
}) {
  const lockTargets: Array<{ tier: Tier; startModuleId: number | null }> = [
    { tier: "PHP", startModuleId: input.tierStartMap.get("PHP_Premium") ?? null },
    { tier: "PHP_Premium", startModuleId: input.tierStartMap.get("PHP_Premium_Plus") ?? null },
    { tier: "PHP_Premium_Plus", startModuleId: input.tierStartMap.get("PHP_Pro") ?? null },
  ];

  console.log("Seeding tier locks for adult modules...");
  for (const lock of lockTargets) {
    if (!lock.startModuleId) continue;
    await db
      .insert(trainingModuleTierLockTable)
      .values({
        audienceLabel: input.audienceLabel,
        programTier: lock.tier,
        startModuleId: lock.startModuleId,
        createdBy: input.createdBy,
      })
      .onConflictDoNothing({
        target: [trainingModuleTierLockTable.audienceLabel, trainingModuleTierLockTable.programTier],
      });
  }
  console.log("Tier locks seeded.");
}

async function seedOtherContent(input: {
  audienceLabel: string;
  age: number;
  createdBy: number;
  titlePrefix: string;
  tier?: Tier;
}) {
  const label = input.tier ? `${input.titlePrefix} ${input.tier}` : input.titlePrefix;
  console.log(`Seeding other content for ${label} (${input.audienceLabel})...`);
  for (const type of OTHER_TYPES) {
    await db.insert(trainingOtherContentTable).values({
      age: input.age,
      audienceLabel: input.audienceLabel,
      type,
      title: `${label} ${type} focus`,
      body: "Keep the session short, consistent, and quality-focused.",
      videoUrl: randomShort(),
      order: 1,
      createdBy: input.createdBy,
      metadata: input.tier ? { tier: input.tier } : undefined,
    });
  }
  for (const type of OTHER_TYPES) {
    await db
      .insert(trainingOtherSettingTable)
      .values({
        audienceLabel: input.audienceLabel,
        type,
        enabled: true,
        createdBy: input.createdBy,
      })
      .onConflictDoNothing({
        target: [trainingOtherSettingTable.audienceLabel, trainingOtherSettingTable.type],
      });
  }
  console.log(`Other content seeded for ${label}.`);
}

async function main() {
  if (process.env.CONFIRM_SEED_TRAINING !== "yes") {
    throw new Error("Set CONFIRM_SEED_TRAINING=yes to run this destructive seed.");
  }

  const adminId = await resolveAdminId();
  console.log("Starting training seed (destructive)...");
  await wipeTrainingData();

  for (const age of YOUTH_AGES) {
    const label = normalizeAudienceLabel(String(age));
    await ensureTrainingAudienceExists(label, adminId);
    await seedModulesForAudience({
      audienceLabel: label,
      age,
      createdBy: adminId,
      moduleTitlePrefix: `Age ${age}`,
    });
    await seedOtherContent({
      audienceLabel: label,
      age,
      createdBy: adminId,
      titlePrefix: `Age ${age}`,
    });
  }

  console.log("Seeding adult tiers...");
  for (const tier of TIERS) {
    const audienceLabel = `${ADULT_AUDIENCE_PREFIX}${TIER_LABELS[tier]}`;
    await ensureTrainingAudienceExists(audienceLabel, adminId);
    await seedModulesForAudience({
      audienceLabel,
      age: ADULT_AGE,
      createdBy: adminId,
      moduleTitlePrefix: TIER_LABELS[tier],
    });
    await seedOtherContent({
      audienceLabel,
      age: ADULT_AGE,
      createdBy: adminId,
      titlePrefix: "Adult",
      tier,
    });
  }

  console.log("Training seed complete.");
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
