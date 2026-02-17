export type ExerciseItem = {
  id: string;
  name: string;
  sets?: number;
  reps?: number;
  time?: string;
  rest?: string;
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

export const PROGRAM_TABS: Record<ProgramId, string[]> = {
  php: ["Program", "Warm Ups", "Cooldown", "Book In", "Physio Referral"],
  plus: [
    "Program",
    "Warm Up",
    "Cool Down",
    "Stretching & Foam Rolling",
    "Off Season Program",
    "Parent Education",
    "Submit Diary",
    "Physio Referrals",
  ],
  premium: [
    "Program",
    "Warmups",
    "Cool Downs",
    "Mobility",
    "Recovery",
    "In-Season Program",
    "Off-Season Program",
    "Video Upload",
    "Education",
    "Submit Diary",
    "Bookings",
  ],
};

export const TRAINING_TABS = new Set([
  "Program",
  "Warm Ups",
  "Warmups",
  "Warm Up",
  "Cooldown",
  "Cool Down",
  "Cool Downs",
  "Stretching & Foam Rolling",
  "Off Season Program",
  "Off-Season Program",
  "In-Season Program",
  "Mobility",
  "Recovery",
]);
const TAB_SESSION_TYPES: Record<string, string[]> = {
  Program: ["program"],
  "Warm Ups": ["warmup"],
  Warmups: ["warmup"],
  "Warm Up": ["warmup"],
  Cooldown: ["cooldown"],
  "Cool Down": ["cooldown"],
  "Cool Downs": ["cooldown"],
  "Stretching & Foam Rolling": ["stretching"],
  Mobility: ["mobility"],
  Recovery: ["recovery"],
  "Off Season Program": ["offseason"],
  "Off-Season Program": ["offseason"],
  "In-Season Program": ["inseason"],
  Education: ["education"],
  "Parent Education": ["education"],
  "Nutrition & Food Diaries": ["nutrition"],
  "Submit Diary": ["nutrition"],
};

export function getSessionTypesForTab(tab: string): string[] {
  return TAB_SESSION_TYPES[tab] ?? [];
}
