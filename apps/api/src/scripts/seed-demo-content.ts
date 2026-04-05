/**
 * Resets demo scheduling data and program section content, then seeds a realistic
 * Lift Lab–style library aligned with the current architecture:
 * - weekNumber / sessionNumber / sessionLabel for structured Program sessions
 * - metadata fields the API and mobile expect: sets, reps, duration (seconds), restSeconds,
 *   progression, regression, cues, steps, category, equipment
 *
 * Destructive phase runs only when CONFIRM_SEED_DEMO=yes.
 *
 * Usage (needs DATABASE_URL in apps/api/.env; full JWT/Stripe keys are not required):
 *   CONFIRM_SEED_DEMO=yes pnpm --filter api seed:demo
 *
 * The package script sets PH_API_SCRIPT=1 so only DATABASE_URL is validated strictly.
 */

import { db, pool } from "../db";
import {
  availabilityBlockTable,
  bookingTable,
  programSectionCompletionTable,
  programSectionContentTable,
  programTable,
  serviceTypeTable,
  userTable,
} from "../db/schema";
import { eq, sql } from "drizzle-orm";

type Tier = "PHP" | "PHP_Premium" | "PHP_Premium_Plus" | "PHP_Pro";

type SessionSection =
  | "program"
  | "warmup"
  | "cooldown"
  | "stretching"
  | "screening"
  | "mobility"
  | "recovery"
  | "offseason"
  | "inseason"
  | "nutrition";

type ExerciseSeed = {
  title: string;
  body: string;
  sectionType: SessionSection;
  order: number;
  metadata: Record<string, unknown>;
  ageList?: number[] | null;
  allowVideoUpload?: boolean;
  videoUrl?: string | null;
};

async function resolveAdminId(): Promise<number> {
  const admin = await db.select().from(userTable).where(eq(userTable.role, "admin")).limit(1);
  if (admin[0]) return admin[0].id;
  const superAdmin = await db.select().from(userTable).where(eq(userTable.role, "superAdmin")).limit(1);
  if (superAdmin[0]) return superAdmin[0].id;
  throw new Error("No admin or superAdmin user found. Run seed:admin first.");
}

function tierTag(tier: Tier): string {
  if (tier === "PHP") return "Foundation block — own every rep before adding load.";
  if (tier === "PHP_Premium_Plus") return "Development phase — progressive overload with technical non‑negotiables.";
  return "Performance phase — train like you compete, recover like a pro.";
}

async function ensurePrograms(adminId: number) {
  const tiers: Tier[] = ["PHP", "PHP_Premium", "PHP_Premium_Plus", "PHP_Pro"];
  const copy: Record<Tier, { name: string; description: string; minAge: number; maxAge: number }> = {
    PHP: {
      name: "PHP — Foundation",
      description:
        "Entry strength & movement curriculum: squat, hinge, push, pull, and core patterns using dumbbells and bodyweight. Built for athletes newer to structured S&C or returning from a break.",
      minAge: 11,
      maxAge: 15,
    },
    PHP_Premium_Plus: {
      name: "PHP Premium Plus — Development",
      description:
        "Progressive loading and single-leg work with intro to explosive prep and higher training density. Assumes consistent attendance and competent lifting basics.",
      minAge: 12,
      maxAge: 17,
    },
    PHP_Premium: {
      name: "PHP Premium — Performance",
      description:
        "Full microcycle planning with screening, mobility, recovery protocols, and in-season maintenance options. Best for committed athletes preparing for higher-level competition.",
      minAge: 14,
      maxAge: 19,
    },
    PHP_Pro: {
      name: "PHP Pro — Elite",
      description:
        "Highest-touch program with advanced periodization, close feedback loops, and competition-focused planning for athletes operating at elite standards.",
      minAge: 15,
      maxAge: 21,
    },
  };
  for (const tier of tiers) {
    const existing = await db.select().from(programTable).where(eq(programTable.type, tier)).limit(1);
    if (existing[0]) continue;
    const c = copy[tier];
    await db.insert(programTable).values({
      name: c.name,
      type: tier,
      description: c.description,
      minAge: c.minAge,
      maxAge: c.maxAge,
      createdBy: adminId,
    });
  }
}

async function resetDemoSchedulingAndContent() {
  await db.delete(bookingTable);
  await db.delete(availabilityBlockTable);
  await db.delete(serviceTypeTable);
  await db.delete(programSectionCompletionTable);
  await db.delete(programSectionContentTable);
  console.log("Cleared bookings, availability, service types, completions, and program section content.");
}

/** Scale main-lift prescription by tier (realistic progression). */
function rx(
  tier: Tier,
  base: { sets: number; reps: number; restSeconds: number },
): { sets: number; reps: number; restSeconds: number } {
  if (tier === "PHP") {
    return {
      sets: Math.max(2, base.sets - 1),
      reps: Math.min(12, base.reps + 2),
      restSeconds: Math.max(60, base.restSeconds - 20),
    };
  }
  if (tier === "PHP_Premium_Plus") {
    return base;
  }
  return {
    sets: Math.min(5, base.sets + 1),
    reps: Math.max(4, base.reps - 2),
    restSeconds: Math.min(150, base.restSeconds + 25),
  };
}

function programBlocks(tier: Tier): ExerciseSeed[] {
  const t = tierTag(tier);
  const rows: ExerciseSeed[] = [];
  let order = 0;

  const add = (row: Omit<ExerciseSeed, "order"> & { order?: number }) => {
    order += 1;
    rows.push({ ...row, order: row.order ?? order });
  };

  // Week 1 — Session A — squat & hinge emphasis
  const w1a = rx(tier, { sets: 3, reps: 8, restSeconds: 90 });
  add({
    sectionType: "program",
    title: "Tempo goblet squat",
    body: `### Tempo goblet squat\n\n**Setup:** Heels hip-width, kettlebell or DB at chest.\n**eccentric:** 3 s down, pause 1 s in bottom, drive up fast.\n\n${t}\n\n**Why:** Teaches bracing and depth without loading the spine heavy.`,
    metadata: {
      weekNumber: 1,
      sessionNumber: 1,
      sessionLabel: "Total body — squat & hinge",
      sets: w1a.sets,
      reps: w1a.reps,
      restSeconds: w1a.restSeconds,
      category: "Strength — lower",
      equipment: "Kettlebell or dumbbell",
      cues: "Ribs down, breathe out on the way up.",
      steps: "1) Brace. 2) Sit between hips. 3) Drive floor away.",
      progression: "Add 2.5–5 lb when all reps are smooth with same tempo.",
      regression: "Box squat to consistent depth; slower tempo only.",
    },
    allowVideoUpload: true,
  });
  add({
    sectionType: "program",
    title: "Romanian deadlift — trap bar or DB",
    body: `### Romanian deadlift\n\n**Setup:** Soft knees, bar close.\n**Move:** Push hips back until hamstrings tension, then squeeze glutes to finish tall.\n\nStop before the low back rounds — that's your end range.\n\n${t}`,
    metadata: {
      weekNumber: 1,
      sessionNumber: 1,
      sessionLabel: "Total body — squat & hinge",
      sets: w1a.sets,
      reps: w1a.reps,
      restSeconds: w1a.restSeconds,
      category: "Strength — posterior chain",
      equipment: "Trap bar, dumbbells, or kettlebells",
      cues: "Long neck, lats on, bar grazes legs.",
      progression: "Pause 2 s just off the floor on the last rep of each set.",
      regression: "Elevate handles or reduce peg height to stay in range.",
    },
    allowVideoUpload: true,
  });
  add({
    sectionType: "program",
    title: "Half-kneeling single-arm press",
    body: `### Half-kneeling single-arm press\n\n**Setup:** One knee down, ribs over hips.\n**Press:** Straight up, biceps to ear — no arching.\n\nAnti-extension core work disguised as an upper-body lift.`,
    metadata: {
      weekNumber: 1,
      sessionNumber: 1,
      sessionLabel: "Total body — squat & hinge",
      sets: 3,
      reps: tier === "PHP_Premium" ? 8 : 10,
      restSeconds: 75,
      category: "Strength — upper / core",
      equipment: "Dumbbell",
      cues: "Exhale as you clear the sticking point.",
      progression: "Half-kneeling → standing split stance → full standing.",
      regression: "Both knees down tall kneeling press.",
    },
  });

  // Week 1 — Session B — single leg & horizontal pull
  const w1b = rx(tier, { sets: 3, reps: 8, restSeconds: 75 });
  add({
    sectionType: "program",
    title: "Rear-foot elevated split squat",
    body: `### Rear-foot elevated split squat\n\n**Setup:** Back foot laces on bench, short stride so torso can stay vertical.\n**Move:** Drop straight down — knee tracks over mid-foot.\n\n${t}`,
    metadata: {
      weekNumber: 1,
      sessionNumber: 2,
      sessionLabel: "Unilateral & pull",
      sets: w1b.sets,
      reps: w1b.reps,
      restSeconds: w1b.restSeconds,
      category: "Strength — single leg",
      equipment: "Bench, dumbbells optional",
      cues: "Front heel glued; control the bounce out of the bottom.",
      progression: "Add load in the front-rack or goblet position.",
      regression: "Split squat, foot on floor instead of elevated.",
    },
    allowVideoUpload: true,
  });
  add({
    sectionType: "program",
    title: "Chest-supported row",
    body: `### Chest-supported row\n\n**Setup:** Incline bench ~30°, chest supported, dumbbells hanging.\n**Pull:** Elbows brush ribs; pause with scap retracted.\n\nNo torso kip — if you need momentum, the weight's too heavy.`,
    metadata: {
      weekNumber: 1,
      sessionNumber: 2,
      sessionLabel: "Unilateral & pull",
      sets: w1b.sets,
      reps: tier === "PHP_Premium" ? 8 : 12,
      restSeconds: w1b.restSeconds,
      category: "Strength — upper pull",
      equipment: "Adjustable bench, dumbbells",
      cues: "Think \"elbows to back pockets.\"",
      progression: "1.5 reps: full row, half way down, full row = one rep.",
      regression: "Cable or band row on feet with same torso angle.",
    },
  });
  add({
    sectionType: "program",
    title: "Dead bug — anti-extension",
    body: `### Dead bug\n\n**Setup:** Low back pressed to floor, arms to ceiling, hips and knees at 90°.\n**Move:** Extend opposite arm & leg slowly; return without losing back contact.\n\n${t}`,
    metadata: {
      weekNumber: 1,
      sessionNumber: 2,
      sessionLabel: "Unilateral & pull",
      sets: 3,
      reps: 8,
      restSeconds: 45,
      category: "Core",
      equipment: "Mat",
      cues: "Exhale fully as the limb reaches away.",
      progression: "Light band resisted at wrists.",
      regression: "Keep knees bent 90° — move arms only.",
    },
  });

  // Week 2 — Session A — main hinge + carry
  const w2a = rx(tier, { sets: 3, reps: 6, restSeconds: 120 });
  add({
    sectionType: "program",
    title: "Trap-bar deadlift — concentric emphasis",
    body: `### Trap-bar deadlift\n\n**Setup:** Mid-foot under handles, hinge to grab, brace lats.\n**Lift:** \"Push the floor away\" — stand tall; hips and knees finish together.\n\n${t}`,
    metadata: {
      weekNumber: 2,
      sessionNumber: 1,
      sessionLabel: "Hinge & carry",
      sets: w2a.sets,
      reps: w2a.reps,
      restSeconds: w2a.restSeconds,
      category: "Strength — lower",
      equipment: "Trap bar, plates",
      cues: "Armpits over the bar until the pass-the-knee break.",
      progression: "Add one rep per set when bar speed stays identical.",
      regression: "Elevated start or hex-bar RDL pattern.",
    },
    allowVideoUpload: true,
  });
  add({
    sectionType: "program",
    title: "Farmer carry — heavy",
    body: `### Farmer carry\n\n**Setup:** Tall walk, short steps, shoulders packed.\n**Distance:** 20–30 m down and back = one set.\n\nIf you can't breathe or you lean, drop weight — that's the feedback loop.`,
    metadata: {
      weekNumber: 2,
      sessionNumber: 1,
      sessionLabel: "Hinge & carry",
      sets: w2a.sets,
      reps: 1,
      restSeconds: 90,
      category: "Conditioning / grip",
      equipment: "Dumbbells, kettlebells, or farmer handles",
      cues: "Eyes up, walk like you own the hallway.",
      progression: "Increase distance before increasing load.",
      regression: "Suitcase carry (one side) for shorter distance.",
    },
  });
  add({
    sectionType: "program",
    title: "Landmine press — half-kneeling",
    body: `### Landmine half-kneeling press\n\n**Setup:** Bar in landmine or corner, inside hand at sleeve.\n**Press:** Arc up and slightly out — finish biceps near ear.\n\nGreat shoulder-friendly vertical push.`,
    metadata: {
      weekNumber: 2,
      sessionNumber: 1,
      sessionLabel: "Hinge & carry",
      sets: 3,
      reps: tier === "PHP" ? 10 : 8,
      restSeconds: 75,
      category: "Strength — upper push",
      equipment: "Barbell landmine or corner anchor",
      cues: "Opposite glute of the down knee squeezes hard.",
      progression: "Stand in staggered stance.",
      regression: "Two-hand landmine press from tall kneeling.",
    },
  });

  // Week 2 — Session B — athletic + upper
  const w2b = rx(tier, { sets: 3, reps: 6, restSeconds: 90 });
  add({
    sectionType: "program",
    title: "Low-box drop to stick landing",
    body: `### Low-box drop to vertical jump (stick)\n\n**Setup:** 12–18\" box, step off (don't jump off), land in athletic stance.\n**Stick:** No extra steps — absorb quietly.\n\nLow amplitude today; we're grading landing quality not height.\n\n${t}`,
    metadata: {
      weekNumber: 2,
      sessionNumber: 2,
      sessionLabel: "Power & horizontal push",
      sets: 3,
      reps: 5,
      restSeconds: 60,
      category: "Power / plyometric",
      equipment: "Plyo box",
      cues: "Quiet feet beat loud feet.",
      progression: "Raise box 2\" when 5/5 landings are perfect.",
      regression: "Snap down from flat ground — no box.",
    },
    allowVideoUpload: true,
  });
  add({
    sectionType: "program",
    title: "Grip-width push-up",
    body: `### Grip-width push-up\n\n**Setup:** Hands under shoulders, body plank.\n**Move:** Chest between hands, full lockout without sagging hips.\n\n${t}`,
    metadata: {
      weekNumber: 2,
      sessionNumber: 2,
      sessionLabel: "Power & horizontal push",
      sets: w2b.sets,
      reps: tier === "PHP" ? 12 : w2b.reps,
      restSeconds: w2b.restSeconds,
      category: "Strength — upper push",
      equipment: "None — optional weighted vest for Plus/Premium",
      cues: "Pull yourself into the bottom with shoulder blades.",
      progression: "Pause 2 s in bottom.",
      regression: "Hands on bench or rack at hip height.",
    },
  });
  add({
    sectionType: "program",
    title: "3-point DB row",
    body: `### 3-point dumbbell row\n\n**Setup:** One hand on bench, flat back, neutral neck.\n**Row:** Drive elbow to ceiling; no torso rotation.\n\n${t}`,
    metadata: {
      weekNumber: 2,
      sessionNumber: 2,
      sessionLabel: "Power & horizontal push",
      sets: w2b.sets,
      reps: w2b.reps,
      restSeconds: w2b.restSeconds,
      category: "Strength — upper pull",
      equipment: "Bench, dumbbell",
      cues: "Imagine squeezing an orange in your armpit.",
      progression: "Stricter tempo on lowering phase.",
      regression: "Cable single-arm row with chest support.",
    },
  });

  return rows;
}

function warmupBlock(): ExerciseSeed[] {
  const metaBase = {
    weekNumber: 1,
    sessionNumber: 1,
    sessionLabel: "Team warm-up",
  } as const;
  return [
    {
      sectionType: "warmup",
      title: "Aerobic primer — bike or light jog",
      body: `### Aerobic primer\n\nEasy effort — you should speak in full sentences. Gradually raise breathing rate without burning legs.\n\nThis is not conditioning; it's tissue warmth and rhythm.`,
      order: 1,
      metadata: {
        ...metaBase,
        duration: 300,
        category: "General warm-up",
        cues: "Nose-breathe as long as you can; switch to mouth when needed.",
      },
    },
    {
      sectionType: "warmup",
      title: "Dynamic movement series",
      body: `### Dynamic series\n\n**Flow:** Leg swings ×10 each, walking lunge + reach ×6 each leg, lateral lunge ×6 each, inchworm + push-up ×5.\n\nMove through positions you’ll use under load later.`,
      order: 2,
      metadata: {
        ...metaBase,
        duration: 420,
        category: "Mobility / movement prep",
        steps: "Complete continuously with minimal rest between moves.",
      },
    },
    {
      sectionType: "warmup",
      title: "Plyo primer — pogo hops",
      body: `### Pogo hops\n\n**Low amplitude** — ankles stiff, minimal knee bend. 2 sets × 15 contacts on forgiving surface.\n\nPrepares tendons for jumps or sprints later in the week.`,
      order: 3,
      metadata: {
        ...metaBase,
        sets: 2,
        reps: 15,
        restSeconds: 45,
        category: "Elasticity",
        cues: "Think \"bounce ball,\" not \"squat jump.\"",
      },
    },
  ];
}

function cooldownBlock(): ExerciseSeed[] {
  const metaBase = {
    weekNumber: 1,
    sessionNumber: 1,
    sessionLabel: "Post-session flush",
  } as const;
  return [
    {
      sectionType: "cooldown",
      title: "Easy spin or walk",
      body: `### Active recovery\n\n3–5 minutes easy. Heart rate should drift down before static stretching.\n\nOptional: chat through the session wins with a coach or parent.`,
      order: 1,
      metadata: {
        ...metaBase,
        duration: 240,
        category: "Recovery",
      },
    },
    {
      sectionType: "cooldown",
      title: "Hip flexor & T-spine openers",
      body: `### Static openers\n\n**Hip flexor:** Half-kneeling, tuck pelvis, 45 s each side.\n**T-spine:** Side-lying open books ×8 each.\n\nBreathe slow; this is down-regulation, not mobility PRs.`,
      order: 2,
      metadata: {
        ...metaBase,
        duration: 360,
        category: "Mobility",
        cues: "Exhale longer than inhale on every rep.",
      },
    },
  ];
}

function stretchingPlus(): ExerciseSeed[] {
  const b = { weekNumber: 1, sessionNumber: 1, sessionLabel: "Foam & static" };
  return [
    {
      sectionType: "stretching",
      title: "Posterior chain — hamstring sliders",
      body: `### Hamstring sliders\n\nHeels on sliders or socks on floor — bridge up, extend knees under control, return with hamstrings.\n\n2 × 8 — stop before cramp.`,
      order: 1,
      metadata: {
        ...b,
        sets: 2,
        reps: 8,
        restSeconds: 60,
        category: "Tissue length — posterior",
        equipment: "Sliders or smooth floor + socks",
      },
    },
    {
      sectionType: "stretching",
      title: "Adductor rock-back",
      body: `### Adductor rock-back\n\nHands and knees, kick one leg out to side, sit hips back toward that heel in small rocks.\n\n10 slow rocks each side — no pain in front of hip.`,
      order: 2,
      metadata: {
        ...b,
        sets: 2,
        reps: 10,
        restSeconds: 45,
        category: "Hip mobility",
        equipment: "Mat",
      },
    },
    {
      sectionType: "stretching",
      title: "Breathing + pec stretch on roller",
      body: `### Pec / anterior shoulder\n\nLying lengthwise on foam roller, arms \"W\" on floor — gentle chest opening. 6 breaths, growing exhale each time.\n\nKeeps shoulders happy after pressing days.`,
      order: 3,
      metadata: {
        ...b,
        duration: 120,
        category: "Upper body recovery",
        equipment: "Foam roller",
      },
    },
  ];
}

function offseasonBlock(tier: Tier): ExerciseSeed[] {
  const label = tier === "PHP_Premium_Plus" ? "GPP — volume" : "GPP — capacity";
  return [
    {
      sectionType: "offseason",
      title: "Aerobic capacity — tempo circuit",
      body: `### Tempo circuit (off-season)\n\n**Rotate:** row 250 m easy / bike 90 s moderate / walk 60 s — 4 rounds.\n\nAerobic base without pounding joints. HR ~130–150 if you track it.\n\n${tierTag(tier)}`,
      order: 1,
      metadata: {
        weekNumber: 1,
        sessionNumber: 1,
        sessionLabel: label,
        duration: 1680,
        category: "Energy systems",
        equipment: "Rower, bike, or any erg",
      },
    },
    {
      sectionType: "offseason",
      title: "Accessory density — KB swing + push + core",
      body: `### EMOM 12 — accessory density\n\nEvery minute on the minute for 12:\n- Min 1: 12 KB swings\n- Min 2: 8 DB push press\n- Min 3: 8 dead bug reps\n\nRepeat 4× through. Scale reps so you finish with ~15 s rest each minute.`,
      order: 2,
      metadata: {
        weekNumber: 1,
        sessionNumber: 2,
        sessionLabel: label,
        category: "Strength endurance",
        equipment: "Kettlebell, dumbbells, mat",
        cues: "If you miss a window twice, cut reps 20%.",
      },
    },
    {
      sectionType: "offseason",
      title: "Low-level hops — line hops",
      body: `### Line hops — stiffness\n\n2×30 s front-back over a line, 2×30 s lateral. Minimal knee bend.\n\nLow amplitude; quality contacts only. Skip if ankle or shin is cranky.`,
      order: 3,
      metadata: {
        weekNumber: 2,
        sessionNumber: 1,
        sessionLabel: label,
        sets: 4,
        reps: 30,
        restSeconds: 45,
        category: "Elasticity / foot speed",
        equipment: "Floor line or rope",
      },
    },
  ];
}

function inseasonBlock(tier: Tier): ExerciseSeed[] {
  return [
    {
      sectionType: "inseason",
      title: "Maintenance strength — trap-bar 2×5",
      body: `### In-season hinge maintenance\n\nKeep exposures; drop fatigue. Two hard sets of five — last rep should still look crisp.\n\nDo not grind to failure in-season.\n\n${tierTag(tier)}`,
      order: 1,
      metadata: {
        weekNumber: 1,
        sessionNumber: 1,
        sessionLabel: "Game-week template",
        sets: 2,
        reps: 5,
        restSeconds: 150,
        category: "Strength maintenance",
        equipment: "Trap bar",
        regression: "Same pattern @ RPE 7 instead of 8.",
      },
    },
    {
      sectionType: "inseason",
      title: "Single-leg stability — reactive step",
      body: `### Reactive lateral step to stick\n\nPartner or coach points; you step and stick in one beat. 2×6 each direction.\n\nLow volume; nervous system sharpness for cutting sports.`,
      order: 2,
      metadata: {
        weekNumber: 1,
        sessionNumber: 1,
        sessionLabel: "Game-week template",
        sets: 2,
        reps: 6,
        restSeconds: 45,
        category: "Deceleration / agility",
        equipment: "Open space",
      },
    },
    {
      sectionType: "inseason",
      title: "Shoulder health — YWT face pull bias",
      body: `### YWT raises — band\n\nLight band anchored high. Y → W → T for 8 reps each, 2 rounds, no rest between letters.\n\nFinish sessions that include pressing or throwing.`,
      order: 3,
      metadata: {
        weekNumber: 1,
        sessionNumber: 2,
        sessionLabel: "Recovery session",
        sets: 2,
        reps: 8,
        restSeconds: 60,
        category: "Prehab — shoulder",
        equipment: "Resistance band",
      },
    },
  ];
}

function screeningPremium(): ExerciseSeed[] {
  return [
    {
      sectionType: "screening",
      title: "OH squat screen — bodyweight",
      body: `### Overhead squat screen\n\n**Film from front + side.** Hands shoulder-width overhead, controlled squat to parallel or best depth.\n\nCoach notes: torso angle, knee tracking, heel lift, arm fall.\n\nUse results to pick squat and ankle prep priorities for the month.`,
      order: 1,
      allowVideoUpload: true,
      metadata: {
        weekNumber: 1,
        sessionNumber: 1,
        sessionLabel: "Movement screen — lower quadrant",
        category: "Assessment",
        equipment: "None; phone camera",
      },
    },
    {
      sectionType: "screening",
      title: "Single-leg squat touch",
      body: `### Single-leg squat to touch\n\nStand on one leg; opposite hand touches cone at knee height without weight shift.\n\n3 reps each leg — compare side-to-side balance and knee control.`,
      order: 2,
      metadata: {
        weekNumber: 1,
        sessionNumber: 1,
        sessionLabel: "Movement screen — lower quadrant",
        category: "Assessment",
        equipment: "Cone or water bottle",
        cues: "Light finger touch only — don't load the hand.",
      },
    },
    {
      sectionType: "screening",
      title: "Shoulder mobility — reach combo",
      body: `### Shoulder reach combo\n\nBack to wall — slide arms from W → overhead without arching off wall. Then repeated wall angels ×10.\n\nFlag asymmetry or early low-back arch for upper-body programming tweaks.`,
      order: 3,
      metadata: {
        weekNumber: 1,
        sessionNumber: 2,
        sessionLabel: "Movement screen — upper quadrant",
        category: "Assessment",
        equipment: "Wall space",
      },
    },
    {
      sectionType: "screening",
      title: "CMJ — jump mat or Vertec (optional)",
      body: `### Countermovement jump\n\nWhen equipment allows: 3 submax practice reps, then 3 test reps — best score counts.\n\nLog height or flight time weekly during offload blocks only.\n\nSkip if fatigued from competition within 24 h.`,
      order: 4,
      metadata: {
        weekNumber: 2,
        sessionNumber: 1,
        sessionLabel: "Power profiling",
        category: "Performance test",
        equipment: "Jump mat, contact grid, or Vertec",
      },
    },
  ];
}

function mobilityPremium(): ExerciseSeed[] {
  const b = { weekNumber: 1, sessionNumber: 1, sessionLabel: "Daily mobility menu" };
  return [
    {
      sectionType: "mobility",
      title: "Ankle dorsiflexion — knee-to-wall",
      body: `### Knee-to-wall drill\n\nFront foot 10 cm from wall; drive knee to wall without heel lifting. 12 pulses × 2 each side.\n\nImproves ankle range for squats and running posture.`,
      order: 1,
      metadata: {
        ...b,
        sets: 2,
        reps: 12,
        restSeconds: 30,
        category: "Ankle",
        equipment: "Wall",
      },
    },
    {
      sectionType: "mobility",
      title: "90/90 hip transitions",
      body: `### 90/90 hip flow\n\nSit in 90/90 — rotate knees side to side with hands supported behind. 8 full cycles each direction.\n\nQuiet reps; explore outer hip without cramping.`,
      order: 2,
      metadata: {
        ...b,
        sets: 2,
        reps: 8,
        restSeconds: 30,
        category: "Hip internal / external rotation",
        equipment: "Mat",
      },
    },
    {
      sectionType: "mobility",
      title: "Thoracic CARs — seated",
      body: `### Thoracic controlled articular rotations\n\nSeated — slow biggest pain-free circle with head-shoulder block. 3 each way.\n\nPairs well before overhead pressing or throwing.`,
      order: 3,
      metadata: {
        ...b,
        sets: 1,
        reps: 3,
        restSeconds: 0,
        category: "T-spine",
        equipment: "Chair or box",
      },
    },
  ];
}

function recoveryPremium(): ExerciseSeed[] {
  return [
    {
      sectionType: "recovery",
      title: "Flush ride — Zone 2",
      body: `### Easy bike 20–30 min\n\nSmooth cadence; conversational pace. Hydrate; electrolytes if training in heat.\n\nPurpose is circulation, not calories — save hard intervals for off days.`,
      order: 1,
      metadata: {
        weekNumber: 1,
        sessionNumber: 1,
        sessionLabel: "Active recovery day",
        duration: 1500,
        category: "Cardiac output",
        equipment: "Bike, rower, or brisk walk",
      },
    },
    {
      sectionType: "recovery",
      title: "Breath-down + legs-up-the-wall",
      body: `### Parasympathetic stack\n\n4 min box breathing (4-4-4-4), then 6 min legs elevated 90° on wall or couch.\n\nUse after late games or double sessions when sleep is the real recovery lever.`,
      order: 2,
      metadata: {
        weekNumber: 1,
        sessionNumber: 1,
        sessionLabel: "Active recovery day",
        duration: 600,
        category: "Down-regulation",
        equipment: "Wall or couch",
      },
    },
  ];
}

function nutritionPremium(): ExerciseSeed[] {
  return [
    {
      sectionType: "nutrition",
      title: "Game-day fueling — timeline",
      body: `### Game-day template\n\n**3–4 h pre:** Mixed meal — lean protein + rice or potato + modest fat + fruit.\n**60–90 min pre:** Easy carb + low fiber (banana, rice cake + jam).\n**Halftime:** Carb + fluid (sport drink ok); avoid new foods.\n**Post:** 25–40 g protein + carb within 2 h — real food first.\n\nAdjust portions to appetite and digestsion — this is a starting point, not dogma.`,
      order: 1,
      metadata: {
        weekNumber: 1,
        sessionNumber: 1,
        sessionLabel: "Performance nutrition basics",
        category: "Fueling",
      },
    },
    {
      sectionType: "nutrition",
      title: "Hydration & electrolytes (heat)",
      body: `### Heat protocol\n\n**Before:** bottle on waking; pale urine by mid-morning.\n**During:** sip every 15 min in hard sessions; add sodium if you cramp or sweat heavily.\n**After:** weigh before/after once — ~16–24 oz per lb lost, with food.\n\nPair with food diary notes so coaches see patterns.`,
      order: 2,
      metadata: {
        weekNumber: 1,
        sessionNumber: 2,
        sessionLabel: "Hydration",
        category: "Fluids",
      },
    },
  ];
}

function catalogForTier(tier: Tier): ExerciseSeed[] {
  const core = [...programBlocks(tier), ...warmupBlock(), ...cooldownBlock()];
  if (tier === "PHP") {
    return core;
  }
  if (tier === "PHP_Premium_Plus") {
    return [...core, ...stretchingPlus(), ...offseasonBlock(tier)];
  }
  return [
    ...core,
    ...stretchingPlus(),
    ...offseasonBlock(tier),
    ...inseasonBlock(tier),
    ...screeningPremium(),
    ...mobilityPremium(),
    ...recoveryPremium(),
    ...nutritionPremium(),
  ];
}

async function seedCanonicalServiceTypes(adminId: number) {
  await db.insert(serviceTypeTable).values([
    {
      name: "Lift Lab — 1:1 session",
      type: "lift_lab_1on1",
      durationMinutes: 60,
      capacity: 1,
      attendeeVisibility: true,
      defaultLocation: "Lift Lab — main floor",
      defaultMeetingLink: null,
      createdBy: adminId,
      isActive: true,
    },
    {
      name: "Remote coaching check-in",
      type: "one_on_one",
      durationMinutes: 25,
      capacity: 1,
      attendeeVisibility: true,
      defaultLocation: null,
      defaultMeetingLink: null,
      createdBy: adminId,
      isActive: true,
    },
    {
      name: "Team lift — small group",
      type: "group_call",
      durationMinutes: 75,
      capacity: 6,
      attendeeVisibility: true,
      defaultLocation: "Lift Lab — platform area",
      createdBy: adminId,
      isActive: true,
    },
  ]);
  console.log("Seeded canonical service types (no availability — add in admin when ready).");
}

async function seedSectionContent(adminId: number) {
  const tiers: Tier[] = ["PHP", "PHP_Premium", "PHP_Premium_Plus", "PHP_Pro"];
  for (const tier of tiers) {
    const catalog = catalogForTier(tier);
    const rows = catalog.map((row) => ({
      sectionType: row.sectionType,
      programTier: tier,
      ageList: row.ageList ?? null,
      title: row.title,
      body: row.body,
      order: row.order,
      createdBy: adminId,
      metadata: row.metadata,
      allowVideoUpload: row.allowVideoUpload ?? false,
      videoUrl: row.videoUrl ?? null,
    }));
    await db.insert(programSectionContentTable).values(rows);
    console.log(`Seeded ${rows.length} program section rows for ${tier}.`);
  }
}

async function main() {
  const adminId = await resolveAdminId();
  await ensurePrograms(adminId);

  const confirm = process.env.CONFIRM_SEED_DEMO === "yes";

  const [{ contentCount }] = await db
    .select({ contentCount: sql<number>`count(*)::int` })
    .from(programSectionContentTable);

  if (confirm) {
    await resetDemoSchedulingAndContent();
    await seedCanonicalServiceTypes(adminId);
    await seedSectionContent(adminId);
  } else if (contentCount === 0) {
    console.log("No program section content yet — seeding demo library (bookings unchanged).");
    const [{ stCount }] = await db.select({ stCount: sql<number>`count(*)::int` }).from(serviceTypeTable);
    if (stCount === 0) {
      await seedCanonicalServiceTypes(adminId);
    } else {
      console.log("Service types already exist; skipping service seed.");
    }
    await seedSectionContent(adminId);
  } else {
    console.log(
      "Demo content already present. Set CONFIRM_SEED_DEMO=yes to wipe bookings, availability, service types, completions, and all program section content, then reseed.",
    );
  }

  console.log("Done.");
}

function walkErrorChain(err: unknown): unknown[] {
  const out: unknown[] = [];
  let cur: unknown = err;
  const seen = new Set<unknown>();
  while (cur && typeof cur === "object" && !seen.has(cur)) {
    seen.add(cur);
    out.push(cur);
    cur = (cur as { cause?: unknown }).cause;
  }
  return out;
}

function getErrorCode(err: unknown): string | undefined {
  for (const e of walkErrorChain(err)) {
    if (!e || typeof e !== "object") continue;
    const o = e as Record<string, unknown>;
    if ("code" in o && o.code != null) return String(o.code);
  }
  return undefined;
}

function errorChainText(err: unknown): string {
  return walkErrorChain(err)
    .map((e) => (e instanceof Error ? e.message : String(e)))
    .join(" | ");
}

function isTransientDbError(err: unknown): boolean {
  const c = getErrorCode(err);
  if (c === "ECONNRESET" || c === "ETIMEDOUT" || c === "EPIPE" || c === "ECONNREFUSED") return true;
  const msg = errorChainText(err).toLowerCase();
  return (
    msg.includes("connection timeout") ||
    msg.includes("terminated unexpectedly") ||
    msg.includes("connection terminated") ||
    msg.includes("socket hang up")
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function mainWithRetries() {
  const max = 4;
  for (let attempt = 1; attempt <= max; attempt += 1) {
    try {
      await main();
      return;
    } catch (err) {
      const transient = isTransientDbError(err);
      if (!transient || attempt === max) {
        if (transient) {
          console.error(
            "\nDatabase connection failed after retries (e.g. ECONNRESET). Check:\n" +
              "  • DATABASE_URL is reachable from this machine (VPN, firewall, IP allowlist)\n" +
              "  • Use your host’s **pooled** connection string for long-lived apps (e.g. Neon pooler / Supabase pooler)\n" +
              "  • Set DATABASE_SSL=true in apps/api/.env if the provider requires explicit TLS\n" +
              "  • Run migrations against the same DATABASE_URL you use here\n",
          );
        }
        throw err;
      }
      const wait = 1500 * attempt;
      const detail = getErrorCode(err) ?? errorChainText(err).slice(0, 120);
      console.warn(`Transient DB error (${detail}), retry ${attempt}/${max - 1} in ${wait}ms…`);
      await sleep(wait);
    }
  }
}

mainWithRetries()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(err);
    await pool.end().catch(() => undefined);
    process.exit(1);
  });
