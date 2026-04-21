import { eq, inArray, sql } from "drizzle-orm";
import { db, pool } from "../db";
import {
  trainingAudienceTable,
  trainingModuleTable,
  trainingOtherContentTable,
  trainingOtherSettingTable,
  userTable,
} from "../db/schema";
import { ensureTrainingAudienceExists, normalizeAudienceLabel } from "../services/training-content-v2/audience.service";

type Tier = "PHP" | "PHP_Premium" | "PHP_Premium_Plus" | "PHP_Pro";

const SOURCE_AUDIENCE_LABEL = "19-99";
const ADULT_AUDIENCE_PREFIX = "adult::";

const TIER_LABELS: Record<Tier, string> = {
  PHP: "PHP Program",
  PHP_Premium: "PHP Premium",
  PHP_Premium_Plus: "PHP Premium Plus",
  PHP_Pro: "PHP Pro",
};

function parseArgs(argv: string[]) {
  const args = new Set(argv);
  const defaultTierIndex = argv.findIndex((a) => a === "--defaultTier");
  const defaultTierRaw = defaultTierIndex >= 0 ? argv[defaultTierIndex + 1] : undefined;
  const defaultTier = (defaultTierRaw ? String(defaultTierRaw) : undefined) as Tier | undefined;

  return {
    confirm: args.has("--confirm") || process.env.CONFIRM_MIGRATE_19_99 === "yes",
    defaultTier: defaultTier ?? (process.env.DEFAULT_TIER as Tier | undefined) ?? "PHP",
  };
}

function inferTierFromTitle(title: string): Tier | null {
  const cleaned = (title ?? "").trim();
  if (!cleaned) return null;

  // Prefer more-specific matches first.
  if (/premium\s*plus/i.test(cleaned)) return "PHP_Premium_Plus";
  if (/\bpremium\b/i.test(cleaned)) return "PHP_Premium";
  if (/\bpro\b/i.test(cleaned)) return "PHP_Pro";
  if (/\bphp\b/i.test(cleaned)) return "PHP";

  return null;
}

function toAdultAudienceLabel(tier: Tier) {
  return `${ADULT_AUDIENCE_PREFIX}${TIER_LABELS[tier]}`;
}

async function resolveAdminId(): Promise<number> {
  const admin = await db.select().from(userTable).where(eq(userTable.role, "admin")).limit(1);
  if (admin[0]) return admin[0].id;
  const superAdmin = await db.select().from(userTable).where(eq(userTable.role, "superAdmin")).limit(1);
  if (superAdmin[0]) return superAdmin[0].id;
  throw new Error("No admin or superAdmin user found.");
}

async function main() {
  const { confirm, defaultTier } = parseArgs(process.argv.slice(2));

  const adminId = await resolveAdminId();
  const sourceLabel = normalizeAudienceLabel(SOURCE_AUDIENCE_LABEL);

  const [modules, others, settings, audienceRows] = await Promise.all([
    db
      .select({ id: trainingModuleTable.id, title: trainingModuleTable.title })
      .from(trainingModuleTable)
      .where(eq(trainingModuleTable.audienceLabel, sourceLabel)),
    db
      .select({ id: trainingOtherContentTable.id, title: trainingOtherContentTable.title })
      .from(trainingOtherContentTable)
      .where(eq(trainingOtherContentTable.audienceLabel, sourceLabel)),
    db
      .select({
        id: trainingOtherSettingTable.id,
        type: trainingOtherSettingTable.type,
        enabled: trainingOtherSettingTable.enabled,
      })
      .from(trainingOtherSettingTable)
      .where(eq(trainingOtherSettingTable.audienceLabel, sourceLabel)),
    db
      .select({ id: trainingAudienceTable.id })
      .from(trainingAudienceTable)
      .where(eq(trainingAudienceTable.label, sourceLabel)),
  ]);

  const audienceExists = audienceRows.length > 0;
  if (modules.length === 0 && others.length === 0 && settings.length === 0) {
    if (!audienceExists) {
      console.log(`Nothing found for audienceLabel=${sourceLabel}. Exiting.`);
      return;
    }

    console.log(`No items found under audienceLabel=${sourceLabel}, but audience is registered.`);
    if (!confirm) {
      console.log(
        "Dry-run only. Re-run with `--confirm` (or set CONFIRM_MIGRATE_19_99=yes) to delete the empty audience registration.",
      );
      return;
    }

    await db.delete(trainingAudienceTable).where(eq(trainingAudienceTable.label, sourceLabel));
    console.log(`Deleted empty audience registration: ${sourceLabel}`);
    return;
  }

  const moduleMoves = new Map<Tier, number[]>();
  const otherMoves = new Map<Tier, number[]>();
  const unmappedModules: Array<{ id: number; title: string }> = [];
  const unmappedOthers: Array<{ id: number; title: string }> = [];

  for (const row of modules) {
    const inferred = inferTierFromTitle(row.title);
    const tier = inferred ?? defaultTier;
    if (!inferred) unmappedModules.push({ id: row.id, title: row.title });
    moduleMoves.set(tier, [...(moduleMoves.get(tier) ?? []), row.id]);
  }

  for (const row of others) {
    const inferred = inferTierFromTitle(row.title);
    const tier = inferred ?? defaultTier;
    if (!inferred) unmappedOthers.push({ id: row.id, title: row.title });
    otherMoves.set(tier, [...(otherMoves.get(tier) ?? []), row.id]);
  }

  const tiersUsed = new Set<Tier>([...moduleMoves.keys(), ...otherMoves.keys()]);
  if (tiersUsed.size === 0) tiersUsed.add(defaultTier);
  const targetAudienceLabels = [...tiersUsed].map((tier) => toAdultAudienceLabel(tier));

  console.log("Planned migration:");
  console.log(`- Source audience: ${sourceLabel}`);
  console.log(`- Default tier (when title is ambiguous): ${defaultTier}`);
  for (const tier of [...tiersUsed].sort()) {
    console.log(
      `- ${tier} -> ${toAdultAudienceLabel(tier)}: ${moduleMoves.get(tier)?.length ?? 0} modules, ${otherMoves.get(tier)?.length ?? 0} others`,
    );
  }

  if (unmappedModules.length > 0 || unmappedOthers.length > 0) {
    console.log("Ambiguous title warnings (will use default tier):");
    if (unmappedModules.length > 0) console.log(`- Modules without clear tier in title: ${unmappedModules.length}`);
    if (unmappedOthers.length > 0) console.log(`- Other items without clear tier in title: ${unmappedOthers.length}`);
  }

  if (!confirm) {
    console.log("\nDry-run only. Re-run with `--confirm` or set CONFIRM_MIGRATE_19_99=yes to apply changes.");
    return;
  }

  for (const label of targetAudienceLabels) {
    await ensureTrainingAudienceExists(label, adminId);
  }

  console.log("\nApplying updates...");

  for (const [tier, ids] of moduleMoves.entries()) {
    if (ids.length === 0) continue;
    await db
      .update(trainingModuleTable)
      .set({ audienceLabel: toAdultAudienceLabel(tier) })
      .where(inArray(trainingModuleTable.id, ids));
  }

  for (const [tier, ids] of otherMoves.entries()) {
    if (ids.length === 0) continue;
    await db
      .update(trainingOtherContentTable)
      .set({ audienceLabel: toAdultAudienceLabel(tier) })
      .where(inArray(trainingOtherContentTable.id, ids));
  }

  // Copy other-settings to each used tier (upsert), then delete source settings.
  for (const tier of tiersUsed) {
    const audienceLabel = toAdultAudienceLabel(tier);
    for (const row of settings) {
      await db
        .insert(trainingOtherSettingTable)
        .values({
          audienceLabel,
          type: row.type,
          enabled: row.enabled,
          createdBy: adminId,
        })
        .onConflictDoUpdate({
          target: [trainingOtherSettingTable.audienceLabel, trainingOtherSettingTable.type],
          set: { enabled: row.enabled },
        });
    }
  }

  if (settings.length > 0) {
    await db.delete(trainingOtherSettingTable).where(eq(trainingOtherSettingTable.audienceLabel, sourceLabel));
  }

  // If source audience is now empty, remove it from the registered audiences table so it stops showing up.
  const [{ remainingModules }, { remainingOthers }] = await Promise.all([
    db
      .select({ remainingModules: sql<number>`count(*)` })
      .from(trainingModuleTable)
      .where(eq(trainingModuleTable.audienceLabel, sourceLabel))
      .then((rows) => rows[0] ?? { remainingModules: 0 }),
    db
      .select({ remainingOthers: sql<number>`count(*)` })
      .from(trainingOtherContentTable)
      .where(eq(trainingOtherContentTable.audienceLabel, sourceLabel))
      .then((rows) => rows[0] ?? { remainingOthers: 0 }),
  ]);

  const remainingModulesNumber = Number(remainingModules ?? 0);
  const remainingOthersNumber = Number(remainingOthers ?? 0);

  if (remainingModulesNumber === 0 && remainingOthersNumber === 0) {
    await db.delete(trainingAudienceTable).where(eq(trainingAudienceTable.label, sourceLabel));
    console.log(`Deleted empty audience registration: ${sourceLabel}`);
  } else {
    console.log(`Source audience still has items; leaving training_audiences row intact: ${sourceLabel}`);
  }

  console.log("Migration complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
