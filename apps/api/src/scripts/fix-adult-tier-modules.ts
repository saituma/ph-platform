import { and, asc, eq } from "drizzle-orm";
import { db, pool } from "../db";
import {
  trainingModuleTable,
  trainingOtherContentTable,
  trainingOtherSettingTable,
  userTable,
  ProgramType,
} from "../db/schema";
import { ensureTrainingAudienceExists, normalizeAudienceLabel } from "../services/training-content-v2/audience.service";

type Tier = (typeof ProgramType.enumValues)[number];

const TIERS: Tier[] = ["PHP", "PHP_Premium", "PHP_Premium_Plus", "PHP_Pro"];
const ADULT_AUDIENCE_PREFIX = "adult::";

const TIER_LABELS: Record<Tier, string> = {
  PHP: "PHP Program",
  PHP_Premium: "PHP Premium",
  PHP_Premium_Plus: "PHP Premium Plus",
  PHP_Pro: "PHP Pro",
};

function toAdultAudienceLabel(tier: Tier) {
  return `${ADULT_AUDIENCE_PREFIX}${TIER_LABELS[tier]}`;
}

function parseArgs(argv: string[]) {
  const args = new Set(argv);
  return {
    confirm: args.has("--confirm") || process.env.CONFIRM_FIX_ADULT_TIER_MODULES === "yes",
    force: args.has("--force") || process.env.FORCE_FIX_ADULT_TIER_MODULES === "yes",
    renameTitles: args.has("--renameTitles") || process.env.RENAME_ADULT_TIER_TITLES === "yes",
  };
}

async function resolveAdminId(): Promise<number> {
  const admin = await db.select().from(userTable).where(eq(userTable.role, "admin")).limit(1);
  if (admin[0]) return admin[0].id;
  const superAdmin = await db.select().from(userTable).where(eq(userTable.role, "superAdmin")).limit(1);
  if (superAdmin[0]) return superAdmin[0].id;
  throw new Error("No admin or superAdmin user found. Run seed:admin first.");
}

function splitEvenly<T>(items: T[], buckets: number) {
  const base = Math.floor(items.length / buckets);
  const remainder = items.length % buckets;
  const slices: T[][] = [];
  let cursor = 0;
  for (let i = 0; i < buckets; i += 1) {
    const size = base + (i < remainder ? 1 : 0);
    slices.push(items.slice(cursor, cursor + size));
    cursor += size;
  }
  return slices;
}

function inferTierFromTitle(title: string): Tier | null {
  const cleaned = (title ?? "").trim();
  if (!cleaned) return null;
  if (/premium\s*plus/i.test(cleaned)) return "PHP_Premium_Plus";
  if (/\bpremium\b/i.test(cleaned)) return "PHP_Premium";
  if (/\bpro\b/i.test(cleaned)) return "PHP_Pro";
  if (/\bphp\b/i.test(cleaned)) return "PHP";
  return null;
}

function tierFromOtherMetadata(metadata: unknown): Tier | null {
  if (!metadata || typeof metadata !== "object") return null;
  const tier = (metadata as any).tier;
  if (typeof tier !== "string") return null;
  return (TIERS as string[]).includes(tier) ? (tier as Tier) : null;
}

async function countByAudienceLabel() {
  const rows = await Promise.all(
    TIERS.map(async (tier) => {
      const label = normalizeAudienceLabel(toAdultAudienceLabel(tier));
      const [modules, others] = await Promise.all([
        db
          .select({ id: trainingModuleTable.id })
          .from(trainingModuleTable)
          .where(eq(trainingModuleTable.audienceLabel, label)),
        db
          .select({ id: trainingOtherContentTable.id })
          .from(trainingOtherContentTable)
          .where(eq(trainingOtherContentTable.audienceLabel, label)),
      ]);
      return { tier, label, moduleCount: modules.length, otherCount: others.length };
    }),
  );
  return rows;
}

async function main() {
  const { confirm, force, renameTitles } = parseArgs(process.argv.slice(2));
  const adminId = await resolveAdminId();

  const labels = new Map<Tier, string>();
  for (const tier of TIERS) labels.set(tier, normalizeAudienceLabel(toAdultAudienceLabel(tier)));

  // Ensure the audiences exist even if empty (keeps the web UI consistent).
  for (const label of labels.values()) {
    await ensureTrainingAudienceExists(label, adminId);
  }

  const counts = await countByAudienceLabel();
  console.log("Adult tier counts (before):");
  for (const row of counts) {
    console.log(`- ${row.tier} (${row.label}): ${row.moduleCount} modules, ${row.otherCount} other items`);
  }

  const phpLabel = labels.get("PHP")!;
  const nonPhpHasContent = counts.some((row) => row.tier !== "PHP" && (row.moduleCount > 0 || row.otherCount > 0));
  if (nonPhpHasContent && !force) {
    throw new Error(
      "Refusing to reshuffle adult tiers because non-PHP tiers already have content. Re-run with --force to override.",
    );
  }

  const sourceModules = await db
    .select({ id: trainingModuleTable.id, order: trainingModuleTable.order })
    .from(trainingModuleTable)
    .where(eq(trainingModuleTable.audienceLabel, phpLabel))
    .orderBy(asc(trainingModuleTable.order), asc(trainingModuleTable.id));

  const sourceOthers = await db
    .select({
      id: trainingOtherContentTable.id,
      title: trainingOtherContentTable.title,
      type: trainingOtherContentTable.type,
      order: trainingOtherContentTable.order,
      metadata: trainingOtherContentTable.metadata,
    })
    .from(trainingOtherContentTable)
    .where(eq(trainingOtherContentTable.audienceLabel, phpLabel))
    .orderBy(asc(trainingOtherContentTable.type), asc(trainingOtherContentTable.order), asc(trainingOtherContentTable.id));

  if (sourceModules.length === 0 && sourceOthers.length === 0) {
    console.log("No adult PHP content found to redistribute. Exiting.");
    return;
  }

  // Prefer inferring tier from titles when possible, then balance the remainder evenly.
  const modulesByTier = new Map<Tier, Array<{ id: number; order: number }>>(TIERS.map((tier) => [tier, []]));
  const ambiguousModules: Array<{ id: number; order: number }> = [];
  // Need titles for inference.
  const moduleTitles = await db
    .select({ id: trainingModuleTable.id, title: trainingModuleTable.title })
    .from(trainingModuleTable)
    .where(eq(trainingModuleTable.audienceLabel, phpLabel));
  const titleById = new Map(moduleTitles.map((row) => [row.id, row.title]));

  for (const row of sourceModules) {
    const inferred = inferTierFromTitle(titleById.get(row.id) ?? "");
    if (inferred) {
      modulesByTier.get(inferred)!.push(row);
    } else {
      ambiguousModules.push(row);
    }
  }

  for (const row of ambiguousModules) {
    const tier = TIERS.reduce((best, current) => {
      const bestCount = modulesByTier.get(best)!.length;
      const currentCount = modulesByTier.get(current)!.length;
      return currentCount < bestCount ? current : best;
    }, TIERS[0]);
    modulesByTier.get(tier)!.push(row);
  }

  // Others: distribute per type to keep each tier having similar "other items" coverage.
  const othersByTier = new Map<Tier, Array<{ id: number; type: string; order: number }>>(TIERS.map((tier) => [tier, []]));
  const othersByType = new Map<string, Array<{ id: number; title: string; type: string; order: number; metadata: unknown }>>();
  for (const row of sourceOthers) {
    const type = String(row.type);
    othersByType.set(type, [...(othersByType.get(type) ?? []), { id: row.id, title: row.title, type, order: row.order ?? 1, metadata: row.metadata }]);
  }

  for (const rows of othersByType.values()) {
    const inferredBuckets = new Map<Tier, Array<{ id: number; type: string; order: number }>>(TIERS.map((tier) => [tier, []]));
    const ambiguous: Array<{ id: number; type: string; order: number }> = [];

    for (const row of rows) {
      const inferred = tierFromOtherMetadata(row.metadata) ?? inferTierFromTitle(row.title);
      if (inferred) inferredBuckets.get(inferred)!.push({ id: row.id, type: row.type, order: row.order });
      else ambiguous.push({ id: row.id, type: row.type, order: row.order });
    }

    for (const row of ambiguous) {
      const tier = TIERS.reduce((best, current) => {
        const bestCount = inferredBuckets.get(best)!.length;
        const currentCount = inferredBuckets.get(current)!.length;
        return currentCount < bestCount ? current : best;
      }, TIERS[0]);
      inferredBuckets.get(tier)!.push(row);
    }

    for (const tier of TIERS) {
      othersByTier.set(tier, [...(othersByTier.get(tier) ?? []), ...inferredBuckets.get(tier)!]);
    }
  }

  console.log("\nPlanned redistribution (modules):");
  for (const tier of TIERS) {
    console.log(`- ${tier} -> ${labels.get(tier)}: ${modulesByTier.get(tier)?.length ?? 0}`);
  }
  console.log("\nPlanned redistribution (other items):");
  for (const tier of TIERS) {
    console.log(`- ${tier} -> ${labels.get(tier)}: ${othersByTier.get(tier)?.length ?? 0}`);
  }

  if (!confirm) {
    console.log("\nDry-run only. Re-run with `--confirm` or set CONFIRM_FIX_ADULT_TIER_MODULES=yes to apply changes.");
    return;
  }

  await db.transaction(async (tx) => {
    // Copy other settings from PHP to all tiers (upsert).
    const sourceSettings = await tx
      .select({ type: trainingOtherSettingTable.type, enabled: trainingOtherSettingTable.enabled })
      .from(trainingOtherSettingTable)
      .where(eq(trainingOtherSettingTable.audienceLabel, phpLabel));

    for (const tier of TIERS) {
      const label = labels.get(tier)!;
      for (const row of sourceSettings) {
        await tx
          .insert(trainingOtherSettingTable)
          .values({
            audienceLabel: label,
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

    // Move + re-number modules per tier so each tier starts at order 1.
    for (const tier of TIERS) {
      const label = labels.get(tier)!;
      const rows = (modulesByTier.get(tier) ?? []).sort((a, b) => (a.order ?? 1) - (b.order ?? 1) || a.id - b.id);
      for (let i = 0; i < rows.length; i += 1) {
        await tx
          .update(trainingModuleTable)
          .set({
            audienceLabel: label,
            order: i + 1,
            ...(renameTitles ? { title: `${TIER_LABELS[tier]} Module ${i + 1}` } : {}),
            updatedAt: new Date(),
          })
          .where(eq(trainingModuleTable.id, rows[i].id));
      }
    }

    // Move other content. Keep ordering stable inside (tier,type) groups.
    for (const tier of TIERS) {
      const label = labels.get(tier)!;
      const rows = (othersByTier.get(tier) ?? []).sort((a, b) => a.type.localeCompare(b.type) || a.order - b.order || a.id - b.id);
      let currentType = "";
      let typeOrder = 0;
      for (const row of rows) {
        if (row.type !== currentType) {
          currentType = row.type;
          typeOrder = 0;
        }
        typeOrder += 1;
        await tx
          .update(trainingOtherContentTable)
          .set({ audienceLabel: label, order: typeOrder, updatedAt: new Date() })
          .where(and(eq(trainingOtherContentTable.id, row.id), eq(trainingOtherContentTable.type, row.type as any)));
      }
    }
  });

  const after = await countByAudienceLabel();
  console.log("\nAdult tier counts (after):");
  for (const row of after) {
    console.log(`- ${row.tier} (${row.label}): ${row.moduleCount} modules, ${row.otherCount} other items`);
  }

  console.log("\nDone.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
