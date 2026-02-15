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
    "Nutrition & Food Diaries",
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

const defaultExercises: ExerciseItem[] = [
  {
    id: "accel",
    name: "Acceleration Mechanics",
    sets: 3,
    reps: 6,
    rest: "60s",
    notes: "Drive knee, stay tall, focus on explosive first step.",
    videoUrl: "https://youtu.be/2qN_98tEG_k?si=lgfTWXRrKlZ2HhhS",
    progressions: "Add resistance band or sled.",
    regressions: "Reduce distance to 10m.",
  },
  {
    id: "strength",
    name: "Bodyweight Strength Circuit",
    sets: 2,
    reps: 10,
    rest: "45s",
    notes: "Control tempo and full range of motion.",
  },
  {
    id: "core",
    name: "Core Stability",
    sets: 3,
    time: "30s",
    rest: "30s",
    notes: "Maintain neutral spine and breathe steadily.",
  },
];

const defaultSessions: SessionItem[] = [
  {
    id: "session-a",
    name: "Session A",
    exercises: defaultExercises,
  },
  {
    id: "session-b",
    name: "Session B",
    exercises: [
      {
        id: "warmup",
        name: "Dynamic Warmup",
        time: "8 min",
        rest: "",
        notes: "Leg swings, high knees, and hip openers.",
      },
      {
        id: "speed",
        name: "Speed Endurance",
        sets: 4,
        reps: 4,
        rest: "90s",
        notes: "Maintain form through the last rep.",
        progressions: "Add 1 extra rep.",
      },
    ],
  },
];

export function getSessionsForTab(_programId: ProgramId, tab: string) {
  return defaultSessions.map((session) => ({
    ...session,
    name: `${tab} ${session.name}`,
  }));
}
