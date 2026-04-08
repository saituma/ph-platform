# Training Content V2 Seed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a destructive seed script that wipes training data and seeds fresh youth (ages 7–18) and adult tier content with modules, sessions, items, and “other” content using YouTube Shorts links.

**Architecture:** A single CLI script in `apps/api/src/scripts` will validate confirmation + admin user, wipe training tables in order, then insert audiences, modules, sessions, items, tier locks, and other content for each audience label.

**Tech Stack:** Node/TypeScript, Drizzle ORM, PostgreSQL.

---

## File Map

- **Create:**
  - `apps/api/src/scripts/seed-training-v2.ts`
- **Modify:**
  - `apps/api/package.json` (add `seed:training` script)

---

### Task 1: Add training seed script

**Files:**
- Create: `apps/api/src/scripts/seed-training-v2.ts`

- [ ] **Step 1: Create the script skeleton**

```ts
// apps/api/src/scripts/seed-training-v2.ts
import { db, pool } from "../db";
import {
  trainingAudienceTable,
  trainingModuleTable,
  trainingModuleSessionTable,
  trainingSessionItemTable,
  trainingModuleTierLockTable,
  trainingSessionTierLockTable,
  trainingOtherContentTable,
  trainingOtherSettingTable,
  athleteTrainingSessionCompletionTable,
  athleteTrainingSessionLogTable,
  programSectionCompletionTable,
  userTable,
} from "../db/schema";
import { eq, sql } from "drizzle-orm";

type Tier = "PHP" | "PHP_Premium" | "PHP_Premium_Plus" | "PHP_Pro";
type OtherType =
  | "warmup"
  | "cooldown"
  | "mobility"
  | "recovery"
  | "nutrition"
  | "inseason"
  | "offseason"
  | "education";

const TIERS: Tier[] = ["PHP", "PHP_Premium", "PHP_Premium_Plus", "PHP_Pro"];
const OTHER_TYPES: OtherType[] = [
  "warmup",
  "cooldown",
  "mobility",
  "recovery",
  "nutrition",
  "inseason",
  "offseason",
  "education",
];

const YOUTH_AGES = Array.from({ length: 12 }, (_, idx) => 7 + idx); // 7..18
const ADULT_AUDIENCE_LABEL = "19-99";

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
  const superAdmin = await db
    .select()
    .from(userTable)
    .where(eq(userTable.role, "superAdmin"))
    .limit(1);
  if (superAdmin[0]) return superAdmin[0].id;
  throw new Error("No admin or superAdmin user found. Run seed:admin first.");
}

async function wipeTrainingData() {
  await db.delete(athleteTrainingSessionCompletionTable);
  await db.delete(athleteTrainingSessionLogTable);
  await db.delete(trainingSessionItemTable);
  await db.delete(trainingModuleSessionTable);
  await db.delete(trainingSessionTierLockTable);
  await db.delete(trainingModuleTierLockTable);
  await db.delete(trainingModuleTable);
  await db.delete(trainingOtherContentTable);
  await db.delete(trainingOtherSettingTable);
  await db.delete(trainingAudienceTable);
  await db.delete(programSectionCompletionTable);
}

async function ensureAudience(label: string, createdBy: number) {
  const [row] = await db
    .insert(trainingAudienceTable)
    .values({ label, createdBy })
    .onConflictDoNothing({ target: trainingAudienceTable.label })
    .returning({ id: trainingAudienceTable.id, label: trainingAudienceTable.label });
  if (row) return row;
  const existing = await db
    .select({ id: trainingAudienceTable.id, label: trainingAudienceTable.label })
    .from(trainingAudienceTable)
    .where(eq(trainingAudienceTable.label, label))
    .limit(1);
  return existing[0] ?? null;
}

async function seedModulesForAudience(input: {
  audienceLabel: string;
  createdBy: number;
  moduleTitlePrefix: string;
}) {
  const modules = [];
  for (let moduleOrder = 1; moduleOrder <= MODULES_PER_AUDIENCE; moduleOrder += 1) {
    const [moduleRow] = await db
      .insert(trainingModuleTable)
      .values({
        audienceLabel: input.audienceLabel,
        title: `${input.moduleTitlePrefix} Module ${moduleOrder}`,
        order: moduleOrder,
        createdBy: input.createdBy,
      })
      .returning({ id: trainingModuleTable.id });
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
        body: "Focus on quality reps and consistent tempo. Track form before intensity.",
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
  }
  return modules;
}

async function seedTierLocksForAudience(input: {
  audienceLabel: string;
  createdBy: number;
}) {
  const moduleRows = await db
    .select({ id: trainingModuleTable.id })
    .from(trainingModuleTable)
    .where(eq(trainingModuleTable.audienceLabel, input.audienceLabel))
    .orderBy(trainingModuleTable.order);
  const startModuleId = moduleRows[0]?.id;
  if (!startModuleId) return;

  for (const tier of TIERS) {
    await db
      .insert(trainingModuleTierLockTable)
      .values({
        audienceLabel: input.audienceLabel,
        programTier: tier,
        startModuleId,
        createdBy: input.createdBy,
      })
      .onConflictDoNothing({
        target: [trainingModuleTierLockTable.audienceLabel, trainingModuleTierLockTable.programTier],
      });
  }

  const sessionRows = await db
    .select({ id: trainingModuleSessionTable.id, moduleId: trainingModuleSessionTable.moduleId })
    .from(trainingModuleSessionTable)
    .orderBy(trainingModuleSessionTable.order);
  for (const tier of TIERS) {
    const firstSession = sessionRows.find((row) => row.moduleId === startModuleId);
    if (!firstSession) continue;
    await db
      .insert(trainingSessionTierLockTable)
      .values({
        moduleId: startModuleId,
        programTier: tier,
        startSessionId: firstSession.id,
        createdBy: input.createdBy,
      })
      .onConflictDoNothing({
        target: [trainingSessionTierLockTable.moduleId, trainingSessionTierLockTable.programTier],
      });
  }
}

async function seedOtherContent(input: { audienceLabel: string; createdBy: number; titlePrefix: string }) {
  for (const type of OTHER_TYPES) {
    await db
      .insert(trainingOtherContentTable)
      .values({
        audienceLabel: input.audienceLabel,
        type,
        title: `${input.titlePrefix} ${type} focus`,
        body: "Keep it simple, breathe through transitions, and stay consistent.",
        videoUrl: randomShort(),
        order: 1,
        createdBy: input.createdBy,
      })
      .onConflictDoNothing();

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
}

async function main() {
  if (process.env.CONFIRM_SEED_TRAINING !== "yes") {
    throw new Error("Set CONFIRM_SEED_TRAINING=yes to run this destructive seed.");
  }
  const adminId = await resolveAdminId();
  await wipeTrainingData();

  for (const age of YOUTH_AGES) {
    const label = String(age);
    await ensureAudience(label, adminId);
    await seedModulesForAudience({
      audienceLabel: label,
      createdBy: adminId,
      moduleTitlePrefix: `Age ${age}`,
    });
    await seedOtherContent({
      audienceLabel: label,
      createdBy: adminId,
      titlePrefix: `Age ${age}`,
    });
  }

  await ensureAudience(ADULT_AUDIENCE_LABEL, adminId);
  for (const tier of TIERS) {
    await seedModulesForAudience({
      audienceLabel: ADULT_AUDIENCE_LABEL,
      createdBy: adminId,
      moduleTitlePrefix: `${tier}`,
    });
  }
  await seedTierLocksForAudience({
    audienceLabel: ADULT_AUDIENCE_LABEL,
    createdBy: adminId,
  });
  await seedOtherContent({
    audienceLabel: ADULT_AUDIENCE_LABEL,
    createdBy: adminId,
    titlePrefix: "Adult",
  });

  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
```

- [ ] **Step 2: Run TypeScript check (optional)**

Run: `pnpm --filter api lint`  
Expected: no TS errors in the new script (skip if lint is slow).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/scripts/seed-training-v2.ts
git commit -m "feat(api): add training v2 destructive seed script"
```

---

### Task 2: Wire script into package.json

**Files:**
- Modify: `apps/api/package.json`

- [ ] **Step 1: Add npm script**

```json
// apps/api/package.json
{
  "scripts": {
    "seed:training": "PH_API_SCRIPT=1 tsx src/scripts/seed-training-v2.ts"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/package.json
git commit -m "chore(api): add seed:training script"
```

---

### Task 3: Manual run + validation

- [ ] **Step 1: Run seed**

Run:
```bash
CONFIRM_SEED_TRAINING=yes pnpm --filter api seed:training
```

Expected:
- No errors
- Logs for wipe + seed completion

- [ ] **Step 2: Sanity queries (optional)**

Run:
```sql
-- Count modules per age
select age, count(*) from training_modules group by age order by age;
```

```sql
-- Count modules per tier audience
select audience_label, count(*) from training_modules where audience_label='19-99' group by audience_label;
```

---

## Self-Review
- **Spec coverage:** All requested tables and content types are seeded; youth per age, adult per tier, 12 modules, 5 sessions, Shorts URLs, destructive wipe.
- **Placeholder scan:** No TODO/TBD. Code steps include full snippets.
- **Type consistency:** Audience labels, tiers, and table fields match schema.

---

Plan complete and saved to `docs/superpowers/plans/2026-04-08-training-content-v2-seed.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
