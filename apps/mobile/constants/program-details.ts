export type ExerciseItem = {
  id: string;
  name: string;
  sets?: number;
  reps?: number;
  time?: string;
  rest?: string;
  /** Seconds — used by session runner when `rest` label is missing. */
  restSeconds?: number;
  notes?: string;
  videoUrl?: string;
  progressions?: string;
  regressions?: string;
};

export type SessionItem = {
  id: string;
  name: string;
  weekNumber?: number;
  type?: string;
  exercises: ExerciseItem[];
};

export type ProgramId = "php" | "plus" | "premium";

/** Single labels for warm-up / cool-down across all tiers (KISS). */
export const WARM_UP_TAB = "Warm-up";
export const COOL_DOWN_TAB = "Cool-down";

/** Map admin/API tab strings to canonical in-app labels. */
export function normalizeProgramTabLabel(tab: string): string {
  const key = tab.trim();
  const map: Record<string, string> = {
    "Warm Ups": WARM_UP_TAB,
    "Warm Up": WARM_UP_TAB,
    Warmups: WARM_UP_TAB,
    Cooldown: COOL_DOWN_TAB,
    "Cool Down": COOL_DOWN_TAB,
    "Cool Downs": COOL_DOWN_TAB,
  };
  return map[key] ?? key;
}

export const PROGRAM_TABS: Record<ProgramId, string[]> = {
  php: ["Program", WARM_UP_TAB, COOL_DOWN_TAB, "Book In", "Physio Referral"],
  plus: [
    "Program",
    WARM_UP_TAB,
    COOL_DOWN_TAB,
    "Stretching & Foam Rolling",
    "Off Season Program",
    "Nutrition & Food Diaries",
    "Physio Referrals",
  ],
  premium: [
    "Program",
    WARM_UP_TAB,
    COOL_DOWN_TAB,
    "Movement Screening",
    "Mobility",
    "Recovery",
    "In-Season Program",
    "Off-Season Program",
    "Submit Diary",
    "Bookings",
  ],
};

export const TRAINING_TABS = new Set([
  "Program",
  WARM_UP_TAB,
  COOL_DOWN_TAB,
  "Warm Ups",
  "Warmups",
  "Warm Up",
  "Cooldown",
  "Cool Down",
  "Cool Downs",
  "Stretching & Foam Rolling",
  "Movement Screening",
  "Off Season Program",
  "Off-Season Program",
  "In-Season Program",
  "Mobility",
  "Recovery",
]);
const TAB_SESSION_TYPES: Record<string, string[]> = {
  Program: ["program"],
  [WARM_UP_TAB]: ["warmup"],
  "Warm Ups": ["warmup"],
  Warmups: ["warmup"],
  "Warm Up": ["warmup"],
  [COOL_DOWN_TAB]: ["cooldown"],
  Cooldown: ["cooldown"],
  "Cool Down": ["cooldown"],
  "Cool Downs": ["cooldown"],
  "Stretching & Foam Rolling": ["stretching"],
  "Movement Screening": ["screening"],
  Mobility: ["mobility"],
  Recovery: ["recovery"],
  "Off Season Program": ["offseason"],
  "Off-Season Program": ["offseason"],
  "In-Season Program": ["inseason"],
  "Nutrition & Food Diaries": ["nutrition"],
  "Submit Diary": ["nutrition"],
};

export function getSessionTypesForTab(tab: string): string[] {
  return TAB_SESSION_TYPES[tab] ?? [];
}

/** Ordered training steps available in the current tab list (for “today’s training” flow). */
export function pickTrainingFlowSteps(visibleTabs: string[]): string[] {
  const warm = visibleTabs.find(
    (t) => t !== "Program" && (/warm/i.test(t) || t === WARM_UP_TAB),
  );
  const cool = visibleTabs.find((t) => /cool/i.test(t) || t === COOL_DOWN_TAB);
  const hasProgram = visibleTabs.includes("Program");
  const steps: string[] = [];
  if (warm) steps.push(warm);
  if (hasProgram) steps.push("Program");
  if (cool) steps.push(cool);
  return steps;
}
