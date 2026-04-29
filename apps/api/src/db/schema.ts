import {
  boolean,
  date,
  doublePrecision,
  integer,
  jsonb,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const Role = pgEnum("role", [
  "guardian",
  "athlete",
  "coach",
  "admin",
  "superAdmin",
  "team_coach",
  "program_coach",
  "team_athlete",
  "adult_athlete",
  "youth_athlete",
]);
export const ProgramType = pgEnum("program_type", ["PHP", "PHP_Premium", "PHP_Premium_Plus", "PHP_Pro"]);
export const EnrollmentStatus = pgEnum("enrollment_status", ["pending", "active", "completed", "failed"]);
export const AthleteType = pgEnum("athlete_type", ["youth", "adult"]);
export const PlanPaymentType = pgEnum("plan_payment_type", ["monthly", "upfront"]);
export const bookingStatus = pgEnum("booking_status", ["pending", "confirmed", "declined", "cancelled"]);
export const bookingType = pgEnum("booking_type", ["one_to_one", "semi_private", "in_person"]);
export const contentType = pgEnum("content_type", [
  "article",
  "video",
  "image",
  "audio",
  "document",
  "link",
  "pdf",
  "faq",
]);
export const storyMediaType = pgEnum("story_media_type", ["image", "video"]);
export const contentSurface = pgEnum("content_surface", [
  "home",
  "parent_platform",
  "legal",
  "announcements",
  "testimonial_submissions",
]);
export const messageType = pgEnum("message_type", ["text", "image", "video"]);
export const chatGroupCategory = pgEnum("chat_group_category", ["announcement", "coach_group", "team"]);
export const subscriptionStatus = pgEnum("subscription_status", [
  "pending_payment",
  "pending_approval",
  "approved",
  "rejected",
]);
export const sessionType = pgEnum("session_type", [
  "program",
  "warmup",
  "cooldown",
  "stretching",
  "screening",
  "mobility",
  "recovery",
  "offseason",
  "inseason",
  "education",
  "nutrition",
]);
export const trainingOtherType = pgEnum("training_other_type", [
  "warmup",
  "cooldown",
  "mobility",
  "recovery",
  "inseason",
  "offseason",
  "education",
]);
export const trainingSessionBlockType = pgEnum("training_session_block_type", ["warmup", "main", "cooldown"]);

export const trainingAudienceTable = pgTable(
  "training_audiences",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    label: varchar({ length: 64 }).notNull(),
    createdBy: integer()
      .notNull()
      .references(() => userTable.id),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    labelUnique: uniqueIndex("training_audiences_label_unique").on(table.label),
  }),
);

export const userTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  cognitoSub: varchar({ length: 255 }).notNull(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull(),
  role: Role().default("guardian").notNull(),
  profilePicture: text(),
  passwordHash: varchar({ length: 255 }),
  passwordSalt: varchar({ length: 255 }),
  emailVerified: boolean().notNull().default(false),
  verificationCode: varchar({ length: 10 }),
  verificationExpiresAt: timestamp(),
  verificationAttempts: integer().notNull().default(0),
  isBlocked: boolean().notNull().default(false),
  isDeleted: boolean().notNull().default(false),
  tokenVersion: integer().notNull().default(0),
  expoPushToken: varchar({ length: 255 }),
  devicePushToken: text(),
  devicePushTokenType: varchar({ length: 20 }),

  nutritionReminderEnabled: boolean("nutrition_reminder_enabled").notNull().default(false),
  nutritionReminderTimeLocal: varchar("nutrition_reminder_time_local", { length: 5 }), // 'HH:MM'
  nutritionReminderTimezone: varchar("nutrition_reminder_timezone", { length: 100 }),
  lastNutritionReminderDateKey: varchar("last_nutrition_reminder_date_key", { length: 10 }), // 'YYYY-MM-DD'
  lastNutritionReminderSentAt: timestamp("last_nutrition_reminder_sent_at"),

  lastSeenAt: timestamp("last_seen_at"),

  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const userDeviceTokensTable = pgTable(
  "user_device_tokens",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer().notNull().references(() => userTable.id, { onDelete: "cascade" }),
    deviceId: varchar({ length: 255 }).notNull(),
    expoPushToken: varchar({ length: 255 }),
    devicePushToken: text(),
    devicePushTokenType: varchar({ length: 20 }),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (t) => [
    index("user_device_tokens_user_id_idx").on(t.userId),
    unique("user_device_tokens_user_id_device_id_unique").on(t.userId, t.deviceId),
  ],
);

export const userLocationTable = pgTable("user_locations", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer()
    .notNull()
    .references(() => userTable.id),
  latitude: doublePrecision().notNull(),
  longitude: doublePrecision().notNull(),
  accuracy: integer(),
  recordedAt: timestamp().notNull().defaultNow(),
  routePoints: jsonb("route_points").$type<Array<{ lat: number; lng: number }>>(),
});

export const adminSettingsTable = pgTable(
  "admin_settings",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer()
      .notNull()
      .references(() => userTable.id),
    title: varchar({ length: 255 }),
    bio: varchar({ length: 500 }),
    timezone: varchar({ length: 100 }).notNull().default("Europe/London"),
    notificationSummary: varchar({ length: 32 }).notNull().default("Weekly"),
    workStartHour: integer().notNull().default(8),
    workStartMinute: integer().notNull().default(0),
    workEndHour: integer().notNull().default(18),
    workEndMinute: integer().notNull().default(0),
    /** Which program tiers may message the coach (coach-editable). Null = all tiers. */
    messagingEnabledTiers: jsonb(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    userIdUnique: uniqueIndex("admin_settings_user_id_unique").on(table.userId),
  }),
);
export const guardianTable = pgTable("guardians", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer()
    .notNull()
    .references(() => userTable.id),
  email: varchar({ length: 255 }),
  phoneNumber: varchar({ length: 255 }),
  relationToAthlete: varchar({ length: 255 }),
  activeAthleteId: integer(),
  currentProgramTier: ProgramType(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const teamTable = pgTable(
  "teams",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 255 }).notNull(),
    athleteType: AthleteType().notNull().default("youth"),
    minAge: integer(),
    maxAge: integer(),
    adminId: integer().references(() => userTable.id),
    planId: integer().references(() => subscriptionPlanTable.id),
    maxAthletes: integer().notNull().default(0),
    subscriptionStatus: text().default("pending_payment"),
    planPaymentType: PlanPaymentType().default("monthly"),
    planCommitmentMonths: integer(),
    planExpiresAt: timestamp(),
    stripeSubscriptionId: varchar({ length: 255 }),
    /** Lowercase slug for athlete emails: `{username}.{emailSlug}@domain` (editable by coach). DB column: email_slug (see 0088_team_email_slug.sql). */
    emailSlug: varchar("email_slug", { length: 80 }),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    nameUnique: uniqueIndex("teams_name_unique").on(table.name),
    emailSlugUnique: uniqueIndex("teams_email_slug_unique").on(table.emailSlug),
  }),
);

export const athleteTable = pgTable("athletes", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer()
    .notNull()
    .references(() => userTable.id),
  guardianId: integer().references(() => guardianTable.id),
  athleteType: AthleteType().notNull().default("youth"),
  name: varchar({ length: 255 }).notNull(),
  age: integer().notNull(),
  birthDate: date(),
  teamId: integer().references(() => teamTable.id),
  team: varchar({ length: 255 }).notNull(),
  trainingPerWeek: integer().notNull(),
  injuries: jsonb(),
  growthNotes: varchar({ length: 255 }),
  performanceGoals: varchar({ length: 255 }),
  equipmentAccess: varchar({ length: 255 }),
  profilePicture: text(),
  extraResponses: jsonb(),
  currentProgramTier: ProgramType(),
  planPaymentType: PlanPaymentType(),
  planCommitmentMonths: integer(),
  /** When paid access ends (monthly/yearly plans). Null = no auto-expiry (e.g. one_time). */
  planExpiresAt: timestamp(),
  /** Set when a renewal reminder email/push was sent for the current period. */
  planRenewalReminderSentAt: timestamp(),
  onboardingCompleted: boolean().notNull().default(false),
  onboardingCompletedAt: timestamp(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const onboardingConfigTable = pgTable("onboarding_configs", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  version: integer().notNull().default(1),
  fields: jsonb().notNull(),
  requiredDocuments: jsonb().notNull(),
  welcomeMessage: varchar({ length: 500 }),
  coachMessage: varchar({ length: 500 }),
  defaultProgramTier: ProgramType().notNull().default("PHP"),
  approvalWorkflow: varchar({ length: 50 }).notNull().default("manual"),
  notes: varchar({ length: 1000 }),
  phpPlusProgramTabs: jsonb(),
  termsVersion: varchar({ length: 50 }).notNull().default("1.0"),
  privacyVersion: varchar({ length: 50 }).notNull().default("1.0"),
  createdBy: integer().references(() => userTable.id),
  updatedBy: integer().references(() => userTable.id),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const portalConfigTable = pgTable("portal_configs", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  nav: jsonb(),
  hero: jsonb(),
  ceoIntro: jsonb(),
  features: jsonb(),
  testimonials: jsonb(),
  cta: jsonb(),
  footer: jsonb(),
  updatedBy: integer().references(() => userTable.id),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const ageExperienceTable = pgTable("age_experience_rules", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: varchar({ length: 255 }).notNull(),
  minAge: integer(),
  maxAge: integer(),
  isDefault: boolean().notNull().default(false),
  uiPreset: varchar({ length: 32 }).notNull().default("standard"),
  fontSizeOption: varchar({ length: 16 }).notNull().default("default"),
  density: varchar({ length: 16 }).notNull().default("default"),
  hiddenSections: jsonb(),
  createdBy: integer().references(() => userTable.id),
  updatedBy: integer().references(() => userTable.id),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const enrollmentTable = pgTable("enrollments", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  athleteId: integer()
    .notNull()
    .references(() => athleteTable.id),
  programType: ProgramType(),
  status: EnrollmentStatus(),
  assignedByCoach: integer().references(() => userTable.id),
  programTemplateId: integer(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const programTable = pgTable("programs", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  type: ProgramType(),
  description: varchar({ length: 255 }),
  minAge: integer(),
  maxAge: integer(),
  isTemplate: boolean().notNull().default(true),
  createdBy: integer()
    .notNull()
    .references(() => userTable.id),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const exerciseTable = pgTable("exercises", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  category: varchar({ length: 100 }),
  cues: varchar({ length: 500 }),
  howTo: varchar({ length: 500 }),
  progression: varchar({ length: 500 }),
  regression: varchar({ length: 500 }),
  sets: integer(),
  reps: integer(),
  duration: integer(),
  restSeconds: integer(),
  notes: varchar({ length: 500 }),
  videoUrl: varchar({ length: 500 }),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const sessionTable = pgTable("sessions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  programId: integer()
    .notNull()
    .references(() => programTable.id),
  weekNumber: integer().notNull(),
  sessionNumber: integer().notNull(),
  type: sessionType().notNull().default("program"),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const trainingModuleTable = pgTable(
  "training_modules",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    age: integer().notNull(),
    audienceLabel: varchar({ length: 64 }).notNull().default("All"),
    title: varchar({ length: 255 }).notNull(),
    order: integer().notNull().default(1),
    createdBy: integer()
      .notNull()
      .references(() => userTable.id),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    ageIdx: index("training_modules_age_idx").on(table.age),
    ageOrderIdx: index("training_modules_age_order_idx").on(table.age, table.order),
  }),
);

export const trainingModuleTierLockTable = pgTable(
  "training_module_tier_locks",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    audienceLabel: varchar({ length: 64 }).notNull(),
    programTier: ProgramType().notNull(),
    startModuleId: integer()
      .notNull()
      .references(() => trainingModuleTable.id),
    createdBy: integer()
      .notNull()
      .references(() => userTable.id),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    audienceTierUnique: uniqueIndex("training_module_tier_locks_audience_tier_unique").on(
      table.audienceLabel,
      table.programTier,
    ),
    audienceTierIdx: index("training_module_tier_locks_audience_tier_idx").on(table.audienceLabel, table.programTier),
    moduleIdx: index("training_module_tier_locks_module_idx").on(table.startModuleId),
  }),
);

export const trainingModuleSessionTable = pgTable(
  "training_module_sessions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    moduleId: integer()
      .notNull()
      .references(() => trainingModuleTable.id),
    title: varchar({ length: 255 }).notNull(),
    dayLength: integer().notNull().default(7),
    order: integer().notNull().default(1),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    moduleIdx: index("training_module_sessions_module_idx").on(table.moduleId),
    moduleOrderIdx: index("training_module_sessions_module_order_idx").on(table.moduleId, table.order),
  }),
);

export const trainingSessionTierLockTable = pgTable(
  "training_session_tier_locks",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    moduleId: integer()
      .notNull()
      .references(() => trainingModuleTable.id),
    programTier: ProgramType().notNull(),
    startSessionId: integer()
      .notNull()
      .references(() => trainingModuleSessionTable.id),
    createdBy: integer()
      .notNull()
      .references(() => userTable.id),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    moduleTierUnique: uniqueIndex("training_session_tier_locks_module_tier_unique").on(
      table.moduleId,
      table.programTier,
    ),
    moduleTierIdx: index("training_session_tier_locks_module_tier_idx").on(table.moduleId, table.programTier),
    sessionIdx: index("training_session_tier_locks_session_idx").on(table.startSessionId),
  }),
);

export const trainingSessionItemTable = pgTable(
  "training_session_items",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    sessionId: integer()
      .notNull()
      .references(() => trainingModuleSessionTable.id),
    blockType: trainingSessionBlockType().notNull().default("main"),
    title: varchar({ length: 255 }).notNull(),
    body: text().notNull(),
    videoUrl: varchar({ length: 500 }),
    allowVideoUpload: boolean().notNull().default(false),
    metadata: jsonb(),
    order: integer().notNull().default(1),
    createdBy: integer()
      .notNull()
      .references(() => userTable.id),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    sessionIdx: index("training_session_items_session_idx").on(table.sessionId),
    sessionBlockOrderIdx: index("training_session_items_session_block_order_idx").on(
      table.sessionId,
      table.blockType,
      table.order,
    ),
  }),
);

export const trainingOtherContentTable = pgTable(
  "training_other_contents",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    age: integer().notNull(),
    audienceLabel: varchar({ length: 64 }).notNull().default("All"),
    type: trainingOtherType().notNull(),
    title: varchar({ length: 255 }).notNull(),
    body: text().notNull(),
    scheduleNote: varchar({ length: 255 }),
    videoUrl: varchar({ length: 500 }),
    metadata: jsonb(),
    order: integer().notNull().default(1),
    createdBy: integer()
      .notNull()
      .references(() => userTable.id),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    ageTypeIdx: index("training_other_contents_age_type_idx").on(table.age, table.type),
    ageTypeOrderIdx: index("training_other_contents_age_type_order_idx").on(table.age, table.type, table.order),
  }),
);

export const trainingOtherSettingTable = pgTable(
  "training_other_settings",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    audienceLabel: varchar({ length: 64 }).notNull(),
    type: trainingOtherType().notNull(),
    enabled: boolean().notNull().default(false),
    createdBy: integer()
      .notNull()
      .references(() => userTable.id),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    audienceTypeUnique: uniqueIndex("training_other_settings_audience_type_unique").on(table.audienceLabel, table.type),
    audienceTypeIdx: index("training_other_settings_audience_type_idx").on(table.audienceLabel, table.type),
  }),
);

export const athleteTrainingSessionCompletionTable = pgTable(
  "athlete_training_session_completions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    athleteId: integer()
      .notNull()
      .references(() => athleteTable.id),
    sessionId: integer()
      .notNull()
      .references(() => trainingModuleSessionTable.id),
    completedAt: timestamp().notNull().defaultNow(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    athleteIdx: index("athlete_training_session_completions_athlete_idx").on(table.athleteId),
    sessionIdx: index("athlete_training_session_completions_session_idx").on(table.sessionId),
    athleteSessionUnique: uniqueIndex("athlete_training_session_completions_unique").on(
      table.athleteId,
      table.sessionId,
    ),
  }),
);

export const athleteTrainingSessionWorkoutLogTable = pgTable(
  "athlete_training_session_workout_logs",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    athleteId: integer()
      .notNull()
      .references(() => athleteTable.id),
    sessionId: integer()
      .notNull()
      .references(() => trainingModuleSessionTable.id),
    weightsUsed: text(),
    repsCompleted: text(),
    rpe: integer(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    athleteIdx: index("athlete_training_session_workout_logs_athlete_idx").on(table.athleteId),
    sessionIdx: index("athlete_training_session_workout_logs_session_idx").on(table.sessionId),
    athleteSessionUnique: uniqueIndex("athlete_training_session_workout_logs_unique").on(
      table.athleteId,
      table.sessionId,
    ),
  }),
);

export const programSectionContentTable = pgTable("program_section_contents", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  sectionType: sessionType().notNull(),
  programTier: ProgramType(),
  ageList: jsonb(),
  title: varchar({ length: 255 }).notNull(),
  body: text().notNull(),
  videoUrl: varchar({ length: 500 }),
  allowVideoUpload: boolean().notNull().default(false),
  metadata: jsonb(),
  order: integer().notNull().default(1),
  createdBy: integer()
    .notNull()
    .references(() => userTable.id),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const programSectionCompletionTable = pgTable(
  "program_section_completions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    athleteId: integer()
      .notNull()
      .references(() => athleteTable.id),
    programSectionContentId: integer()
      .notNull()
      .references(() => programSectionContentTable.id),
    rpe: integer(),
    soreness: integer(),
    fatigue: integer(),
    notes: varchar({ length: 500 }),
    completedAt: timestamp().notNull().defaultNow(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    athleteIdx: index("program_section_completions_athlete_idx").on(table.athleteId),
    contentIdx: index("program_section_completions_content_idx").on(table.programSectionContentId),
    completedAtIdx: index("program_section_completions_completed_at_idx").on(table.completedAt),
  }),
);

export const athleteTrainingSessionLogTable = pgTable(
  "athlete_training_session_logs",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    athleteId: integer()
      .notNull()
      .references(() => athleteTable.id),
    weekNumber: integer(),
    sessionLabel: varchar({ length: 500 }),
    programKey: varchar({ length: 32 }),
    contentIds: jsonb().notNull(),
    exerciseCount: integer().notNull(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    athleteIdx: index("athlete_training_session_logs_athlete_idx").on(table.athleteId),
    createdIdx: index("athlete_training_session_logs_created_idx").on(table.createdAt),
  }),
);

export const athleteAchievementUnlockTable = pgTable(
  "athlete_achievement_unlocks",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    athleteId: integer()
      .notNull()
      .references(() => athleteTable.id),
    achievementKey: varchar({ length: 64 }).notNull(),
    unlockedAt: timestamp().notNull().defaultNow(),
    metadata: jsonb(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    athleteIdx: index("athlete_achievement_unlocks_athlete_idx").on(table.athleteId),
    athleteKeyUnique: uniqueIndex("athlete_achievement_unlocks_athlete_key_unique").on(
      table.athleteId,
      table.achievementKey,
    ),
  }),
);

export const storyTable = pgTable(
  "stories",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    title: varchar({ length: 255 }).notNull(),
    mediaUrl: varchar({ length: 500 }).notNull(),
    mediaType: storyMediaType().notNull().default("image"),
    badge: varchar({ length: 50 }),
    order: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    createdBy: integer()
      .notNull()
      .references(() => userTable.id),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    isActiveIdx: index("stories_is_active_idx").on(table.isActive),
    orderIdx: index("stories_order_idx").on(table.order),
  }),
);

export const sessionExerciseTable = pgTable("session_exercises", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  sessionId: integer()
    .notNull()
    .references(() => sessionTable.id),
  exerciseId: integer()
    .notNull()
    .references(() => exerciseTable.id),
  order: integer().notNull(),
  coachingNotes: varchar({ length: 500 }),
  progressionNotes: varchar({ length: 500 }),
  regressionNotes: varchar({ length: 500 }),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const athletePlanSessionTable = pgTable(
  "athlete_plan_sessions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    athleteId: integer()
      .notNull()
      .references(() => athleteTable.id),
    weekNumber: integer().notNull(),
    sessionNumber: integer().notNull(),
    title: varchar({ length: 255 }),
    notes: varchar({ length: 500 }),
    createdBy: integer()
      .notNull()
      .references(() => userTable.id),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    athleteIdx: index("athlete_plan_sessions_athlete_idx").on(table.athleteId),
    weekIdx: index("athlete_plan_sessions_week_idx").on(table.weekNumber),
  }),
);

export const athletePlanExerciseTable = pgTable(
  "athlete_plan_exercises",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    planSessionId: integer()
      .notNull()
      .references(() => athletePlanSessionTable.id),
    exerciseId: integer()
      .notNull()
      .references(() => exerciseTable.id),
    order: integer().notNull(),
    sets: integer(),
    reps: integer(),
    duration: integer(),
    restSeconds: integer(),
    coachingNotes: varchar({ length: 500 }),
    progressionNotes: varchar({ length: 500 }),
    regressionNotes: varchar({ length: 500 }),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    sessionIdx: index("athlete_plan_exercises_session_idx").on(table.planSessionId),
  }),
);

export const athletePlanExerciseCompletionTable = pgTable(
  "athlete_plan_exercise_completions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    athleteId: integer()
      .notNull()
      .references(() => athleteTable.id),
    planExerciseId: integer()
      .notNull()
      .references(() => athletePlanExerciseTable.id),
    completedAt: timestamp().notNull().defaultNow(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    athleteIdx: index("athlete_plan_exercise_completions_athlete_idx").on(table.athleteId),
    exerciseIdx: uniqueIndex("athlete_plan_exercise_completions_unique").on(table.athleteId, table.planExerciseId),
    completedAtIdx: index("athlete_plan_exercise_completions_completed_at_idx").on(table.completedAt),
  }),
);

export const athletePlanSessionCompletionTable = pgTable(
  "athlete_plan_session_completions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    athleteId: integer()
      .notNull()
      .references(() => athleteTable.id),
    planSessionId: integer()
      .notNull()
      .references(() => athletePlanSessionTable.id),
    rpe: integer(),
    soreness: integer(),
    fatigue: integer(),
    notes: varchar({ length: 500 }),
    completedAt: timestamp().notNull().defaultNow(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    athleteIdx: index("athlete_plan_session_completions_athlete_idx").on(table.athleteId),
    sessionIdx: index("athlete_plan_session_completions_session_idx").on(table.planSessionId),
    completedAtIdx: index("athlete_plan_session_completions_completed_at_idx").on(table.completedAt),
  }),
);

export const messageTable = pgTable(
  "messages",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    senderId: integer()
      .notNull()
      .references(() => userTable.id),
    receiverId: integer()
      .notNull()
      .references(() => userTable.id),
    content: varchar({ length: 255 }).notNull(),
    contentType: messageType().default("text").notNull(),
    mediaUrl: varchar({ length: 500 }),
    clientMessageId: varchar({ length: 96 }),
    videoUploadId: integer(),
    read: boolean().notNull().default(false),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    senderIdx: index("messages_sender_id_idx").on(table.senderId),
    receiverIdx: index("messages_receiver_id_idx").on(table.receiverId),
    receiverCreatedAtIdx: index("messages_receiver_created_at_idx").on(table.receiverId, table.createdAt),
    senderReceiverClientUnique: uniqueIndex("messages_sender_receiver_client_unique").on(
      table.senderId,
      table.receiverId,
      table.clientMessageId,
    ),
  }),
);

export const chatGroupTable = pgTable("chat_groups", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  category: chatGroupCategory().notNull().default("coach_group"),
  createdBy: integer()
    .notNull()
    .references(() => userTable.id),
  createdAt: timestamp().notNull().defaultNow(),
});

export const chatGroupMemberTable = pgTable(
  "chat_group_members",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    groupId: integer()
      .notNull()
      .references(() => chatGroupTable.id),
    userId: integer()
      .notNull()
      .references(() => userTable.id),
    lastReadAt: timestamp(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    uniqueMember: uniqueIndex("chat_group_members_group_user_unique").on(table.groupId, table.userId),
    groupIdx: index("chat_group_members_group_idx").on(table.groupId),
    userIdx: index("chat_group_members_user_idx").on(table.userId),
  }),
);

export const chatGroupMessageTable = pgTable(
  "chat_group_messages",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    groupId: integer()
      .notNull()
      .references(() => chatGroupTable.id),
    senderId: integer()
      .notNull()
      .references(() => userTable.id),
    content: varchar({ length: 500 }).notNull(),
    contentType: messageType().default("text").notNull(),
    mediaUrl: varchar({ length: 500 }),
    clientMessageId: varchar({ length: 96 }),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    groupIdx: index("chat_group_messages_group_idx").on(table.groupId),
    groupCreatedAtIdx: index("chat_group_messages_group_created_at_idx").on(table.groupId, table.createdAt),
    groupSenderClientUnique: uniqueIndex("chat_group_messages_group_sender_client_unique").on(
      table.groupId,
      table.senderId,
      table.clientMessageId,
    ),
  }),
);

export const messageReactionTable = pgTable(
  "message_reactions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    messageId: integer()
      .notNull()
      .references(() => messageTable.id),
    userId: integer()
      .notNull()
      .references(() => userTable.id),
    emoji: varchar({ length: 16 }).notNull(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    messageIdx: index("message_reactions_message_idx").on(table.messageId),
  }),
);

export const messageReceiptTable = pgTable(
  "message_receipts",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    messageId: integer()
      .notNull()
      .references(() => messageTable.id),
    userId: integer()
      .notNull()
      .references(() => userTable.id),
    deliveredAt: timestamp().notNull().defaultNow(),
    readAt: timestamp(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    messageUserUnique: uniqueIndex("message_receipts_message_user_unique").on(table.messageId, table.userId),
    messageReadIdx: index("message_receipts_message_read_idx").on(table.messageId, table.readAt),
    userReadIdx: index("message_receipts_user_read_idx").on(table.userId, table.readAt),
  }),
);

export const chatGroupMessageReactionTable = pgTable(
  "chat_group_message_reactions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    messageId: integer()
      .notNull()
      .references(() => chatGroupMessageTable.id),
    userId: integer()
      .notNull()
      .references(() => userTable.id),
    emoji: varchar({ length: 16 }).notNull(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    messageIdx: index("chat_group_message_reactions_message_idx").on(table.messageId),
  }),
);

export const chatGroupMessageReceiptTable = pgTable(
  "chat_group_message_receipts",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    messageId: integer()
      .notNull()
      .references(() => chatGroupMessageTable.id),
    userId: integer()
      .notNull()
      .references(() => userTable.id),
    deliveredAt: timestamp().notNull().defaultNow(),
    readAt: timestamp(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    messageUserUnique: uniqueIndex("chat_group_message_receipts_message_user_unique").on(table.messageId, table.userId),
    messageReadIdx: index("chat_group_message_receipts_message_read_idx").on(table.messageId, table.readAt),
    userReadIdx: index("chat_group_message_receipts_user_read_idx").on(table.userId, table.readAt),
  }),
);

export const referralGroupTable = pgTable("referral_groups", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  expectedSize: integer().notNull().default(0),
  createdBy: integer()
    .notNull()
    .references(() => userTable.id),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const referralGroupMemberTable = pgTable(
  "referral_group_members",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    groupId: integer()
      .notNull()
      .references(() => referralGroupTable.id),
    athleteId: integer()
      .notNull()
      .references(() => athleteTable.id),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    uniqueAthlete: uniqueIndex("referral_group_members_group_athlete_unique").on(table.groupId, table.athleteId),
    groupIdx: index("referral_group_members_group_idx").on(table.groupId),
    athleteIdx: index("referral_group_members_athlete_idx").on(table.athleteId),
  }),
);

export const bookingTable = pgTable("bookings", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  athleteId: integer()
    .notNull()
    .references(() => athleteTable.id),
  guardianId: integer()
    .notNull()
    .references(() => guardianTable.id),
  type: bookingType(),
  status: bookingStatus(),
  startsAt: timestamp().notNull(),
  endTime: timestamp(),
  location: varchar({ length: 500 }),
  meetingLink: varchar({ length: 500 }),
  notes: text(),
  serviceTypeId: integer(),
  occurrenceKey: varchar({ length: 255 }),
  slotKey: varchar({ length: 255 }),
  timezoneOffsetMinutes: integer(),
  createdBy: integer()
    .notNull()
    .references(() => userTable.id),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const contentTable = pgTable("contents", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: varchar({ length: 255 }).notNull(),
  content: varchar({ length: 500 }).notNull(),
  type: contentType(),
  body: text(),
  programTier: ProgramType(),
  surface: contentSurface().notNull(),
  category: varchar({ length: 255 }),
  ageList: jsonb(),
  minAge: integer(),
  maxAge: integer(),
  startsAt: timestamp(),
  endsAt: timestamp(),
  isActive: boolean().notNull().default(true),
  createdBy: integer()
    .notNull()
    .references(() => userTable.id),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const parentCourseTable = pgTable("parent_courses", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: varchar({ length: 255 }).notNull(),
  summary: varchar({ length: 500 }).notNull(),
  description: varchar({ length: 2000 }),
  coverImage: text(),
  category: varchar({ length: 255 }).notNull(),
  programTier: ProgramType(),
  minAge: integer(),
  maxAge: integer(),
  modules: jsonb().notNull(),
  createdBy: integer()
    .notNull()
    .references(() => userTable.id),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const subscriptionPlanTable = pgTable("subscription_plans", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  tier: ProgramType().notNull(),
  stripePriceId: varchar({ length: 255 }).notNull(),
  stripePriceIdMonthly: varchar({ length: 255 }),
  stripePriceIdYearly: varchar({ length: 255 }),
  stripePriceIdOneTime: varchar({ length: 255 }),
  displayPrice: varchar({ length: 100 }).notNull(),
  billingInterval: varchar({ length: 50 }).notNull(),
  monthlyPrice: varchar({ length: 100 }),
  yearlyPrice: varchar({ length: 100 }),
  oneTimePrice: varchar({ length: 100 }),
  discountType: varchar({ length: 20 }),
  discountValue: varchar({ length: 50 }),
  discountAppliesTo: varchar({ length: 20 }),
  /** Array of discount rules. When non-empty, takes precedence over the legacy single-discount triple. */
  discounts: jsonb().$type<
    Array<{
      type: "percent" | "amount";
      value: string;
      appliesTo: "monthly" | "yearly" | "six_months" | "all" | "custom";
      label?: string | null;
    }>
  >(),
  features: jsonb().$type<string[]>(),
  isActive: boolean().notNull().default(true),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const subscriptionRequestTable = pgTable("subscription_requests", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer()
    .notNull()
    .references(() => userTable.id),
  athleteId: integer()
    .notNull()
    .references(() => athleteTable.id),
  planId: integer()
    .notNull()
    .references(() => subscriptionPlanTable.id),
  /** monthly | six_months | yearly — how the athlete chose to pay (Stripe lookup + checkout mode). */
  planBillingCycle: varchar({ length: 20 }),
  stripeSessionId: varchar({ length: 255 }),
  stripePaymentIntentId: varchar({ length: 255 }),
  paymentAmountCents: integer(),
  paymentCurrency: varchar({ length: 10 }),
  /** UUID — public receipt id for payer/support lookup. */
  receiptPublicId: varchar({ length: 36 }).notNull(),
  paymentStatus: varchar({ length: 100 }),
  status: subscriptionStatus().notNull().default("pending_payment"),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const teamSubscriptionRequestTable = pgTable("team_subscription_requests", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  adminId: integer()
    .notNull()
    .references(() => userTable.id),
  teamId: integer()
    .notNull()
    .references(() => teamTable.id),
  planId: integer()
    .notNull()
    .references(() => subscriptionPlanTable.id),
  planBillingCycle: varchar({ length: 20 }),
  stripeSessionId: varchar({ length: 255 }),
  stripeSubscriptionId: varchar({ length: 255 }),
  stripePaymentIntentId: varchar({ length: 255 }),
  paymentStatus: varchar({ length: 100 }),
  paymentAmountCents: integer(),
  paymentCurrency: varchar({ length: 10 }),
  /** UUID — public receipt id for payer/support lookup. */
  receiptPublicId: varchar({ length: 36 }).notNull(),
  status: subscriptionStatus().notNull().default("pending_payment"),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const videoUploadTable = pgTable("video_uploads", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  athleteId: integer()
    .notNull()
    .references(() => athleteTable.id),
  programSectionContentId: integer().references(() => programSectionContentTable.id),
  trainingSessionItemId: integer().references(() => trainingSessionItemTable.id),
  videoUrl: varchar({ length: 500 }).notNull(),
  notes: varchar({ length: 500 }),
  reviewedByCoach: integer().references(() => userTable.id),

  feedback: varchar({ length: 2000 }),
  reviewedAt: timestamp(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const foodDiaryTable = pgTable("food_diary", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  athleteId: integer()
    .notNull()
    .references(() => athleteTable.id),
  guardianId: integer()
    .notNull()
    .references(() => guardianTable.id),
  date: date(),
  meals: jsonb(),
  notes: varchar({ length: 500 }),
  quantity: integer(),
  photoUrl: varchar({ length: 500 }),
  reviewedByCoach: integer().references(() => userTable.id),
  feedback: varchar({ length: 2000 }),
  reviewedAt: timestamp(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const physioRefferalsTable = pgTable("physio_refferals", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  athleteId: integer()
    .notNull()
    .references(() => athleteTable.id),
  programTier: ProgramType(),
  referalLink: varchar({ length: 500 }),
  discountPercent: integer(),
  metadata: jsonb(),
  createdBy: integer()
    .notNull()
    .references(() => userTable.id),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const serviceTypeTable = pgTable("service_types", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  description: varchar({ length: 2000 }),
  type: bookingType(),
  durationMinutes: integer().notNull(),
  capacity: integer(),
  /** Total booking slots for this service type; each pending/confirmed booking consumes one; at 0 service can auto-deactivate. */
  totalSlots: integer(),
  fixedStartTime: varchar({ length: 10 }),
  attendeeVisibility: boolean().notNull().default(true),
  defaultLocation: varchar({ length: 500 }),
  defaultMeetingLink: varchar({ length: 500 }),
  programTier: ProgramType(),
  eligiblePlans: jsonb(),
  eligibleTargets: jsonb(),
  schedulePattern: varchar({ length: 32 }),
  recurrenceEndMode: varchar({ length: 32 }),
  recurrenceCount: integer(),
  weeklyEntries: jsonb(),
  oneTimeDate: date(),
  oneTimeTime: varchar({ length: 10 }),
  slotMode: varchar({ length: 32 }),
  slotIntervalMinutes: integer(),
  slotDefinitions: jsonb(),
  isActive: boolean().notNull().default(true),
  isBookable: boolean().notNull().default(true),
  createdBy: integer()
    .notNull()
    .references(() => userTable.id),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const availabilityBlockTable = pgTable("availability_blocks", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  serviceTypeId: integer()
    .notNull()
    .references(() => serviceTypeTable.id),
  startsAt: timestamp().notNull(),
  endsAt: timestamp().notNull(),
  createdBy: integer()
    .notNull()
    .references(() => userTable.id),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const legalAcceptanceTable = pgTable("legal_acceptances", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  athleteId: integer()
    .notNull()
    .references(() => athleteTable.id),
  termsAcceptedAt: timestamp().notNull(),
  termsVersion: varchar({ length: 255 }).notNull(),
  privacyAcceptedAt: timestamp().notNull(),
  privacyVersion: varchar({ length: 255 }).notNull(),
  appVersion: varchar({ length: 255 }).notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const notificationTable = pgTable("notifications", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer()
    .notNull()
    .references(() => userTable.id),
  type: varchar({ length: 500 }),
  content: varchar({ length: 500 }),
  read: boolean().notNull().default(false),
  link: varchar({ length: 500 }),

  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const auditLogsTable = pgTable("audit_logs", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  performedBy: integer()
    .notNull()
    .references(() => userTable.id),

  action: varchar({ length: 500 }),
  targetTable: varchar({ length: 500 }),

  targetId: integer(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const runLogTable = pgTable(
  "run_logs",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    clientId: varchar({ length: 64 }).notNull(),
    userId: integer()
      .notNull()
      .references(() => userTable.id),
    date: timestamp().notNull(),
    distanceMeters: doublePrecision().notNull(),
    durationSeconds: integer().notNull(),
    avgPace: doublePrecision(),
    avgSpeed: doublePrecision(),
    calories: doublePrecision(),
    coordinates: jsonb(),
    effortLevel: integer(),
    feelTags: jsonb(),
    notes: text(),
    visibility: varchar({ length: 20 }).notNull().default("public"), // 'public' | 'private'
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("run_logs_user_idx").on(table.userId),
    clientIdUserUnique: uniqueIndex("run_logs_client_id_user_unique").on(table.clientId, table.userId),
    dateIdx: index("run_logs_date_idx").on(table.date),
  }),
);

export const runCommentTable = pgTable(
  "run_comments",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    runLogId: integer()
      .notNull()
      .references(() => runLogTable.id, { onDelete: "cascade" }),
    userId: integer()
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    content: text().notNull(),
    parentId: integer().references((): AnyPgColumn => runCommentTable.id, { onDelete: "cascade" }), // For replies
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    runIdx: index("run_comments_run_idx").on(table.runLogId),
    parentIdx: index("run_comments_parent_idx").on(table.parentId),
  }),
);

export const nutritionTargetsTable = pgTable(
  "nutrition_targets",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer()
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    calories: integer(),
    protein: integer(),
    carbs: integer(),
    fats: integer(),
    micronutrientsGuidance: text(),
    updatedBy: integer().references(() => userTable.id),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    userIdUnique: uniqueIndex("nutrition_targets_user_unique").on(table.userId),
  }),
);

export const nutritionLogsTable = pgTable(
  "nutrition_logs",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer()
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    dateKey: varchar({ length: 10 }).notNull(), // 'YYYY-MM-DD'
    mealType: varchar({ length: 30 }).notNull().default("daily"), // 'daily' | 'breakfast' | 'lunch' | 'dinner' | 'snack' | custom
    loggedAt: timestamp().notNull().defaultNow(),
    athleteType: varchar({ length: 20 }).notNull().default("youth"), // 'youth' | 'adult'

    // Youth specific
    breakfast: text(),
    snacks: text(),
    snacksMorning: text(),
    snacksAfternoon: text(),
    snacksEvening: text(),
    lunch: text(),
    dinner: text(),
    waterIntake: integer().default(0), // instances/ounces/mL
    steps: integer().default(0),
    sleepHours: integer().default(0),
    mood: integer(), // 1-5
    energy: integer(), // 1-5
    pain: integer(), // 1-5

    // Adult specific
    foodDiary: text(),

    // Coach feedback
    coachFeedback: text(),
    coachFeedbackMediaUrl: text(),
    coachFeedbackMediaType: varchar({ length: 20 }),
    coachId: integer().references(() => userTable.id),

    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    userDateMealUnique: uniqueIndex("nutrition_logs_user_date_meal_unique").on(
      table.userId,
      table.dateKey,
      table.mealType,
    ),
    userIdx: index("nutrition_logs_user_idx").on(table.userId),
    dateIdx: index("nutrition_logs_date_idx").on(table.dateKey),
    userDateIdx: index("nutrition_logs_user_date_idx").on(table.userId, table.dateKey),
  }),
);

export const socialPrivacySettingsTable = pgTable(
  "social_privacy_settings",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer()
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    // Core privacy settings - default false for strict privacy by default
    socialEnabled: boolean().notNull().default(false),
    // Granular controls when enabled
    shareRunsPublicly: boolean().notNull().default(false),
    allowComments: boolean().notNull().default(true),
    showInLeaderboard: boolean().notNull().default(true),
    showInDirectory: boolean().notNull().default(true),
    // Metadata
    optedInAt: timestamp(),
    optedOutAt: timestamp(),
    privacyVersionAccepted: varchar({ length: 20 }), // e.g., "1.0"
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    userIdUnique: uniqueIndex("social_privacy_settings_user_unique").on(table.userId),
    userIdx: index("social_privacy_settings_user_idx").on(table.userId),
  }),
);

export const runLikeTable = pgTable(
  "run_likes",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    runLogId: integer()
      .notNull()
      .references(() => runLogTable.id, { onDelete: "cascade" }),
    userId: integer()
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    runUserUnique: uniqueIndex("run_likes_run_user_unique").on(table.runLogId, table.userId),
    runIdx: index("run_likes_run_idx").on(table.runLogId),
    userIdx: index("run_likes_user_idx").on(table.userId),
  }),
);

export const socialPostTable = pgTable(
  "social_posts",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    mediaUrl: varchar("media_url", { length: 500 }),
    mediaType: varchar("media_type", { length: 20 }), // 'image', 'video'
    visibility: varchar("visibility", { length: 20 }).notNull().default("public"), // 'public' | 'private'
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("social_posts_user_idx").on(table.userId),
    createdAtIdx: index("social_posts_created_at_idx").on(table.createdAt),
  }),
);

export const socialPostCommentTable = pgTable(
  "social_post_comments",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    postId: integer("post_id")
      .notNull()
      .references(() => socialPostTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    parentId: integer("parent_id").references((): AnyPgColumn => socialPostCommentTable.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    postIdx: index("social_post_comments_post_idx").on(table.postId),
    parentIdx: index("social_post_comments_parent_idx").on(table.parentId),
  }),
);

export const socialPostLikeTable = pgTable(
  "social_post_likes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    postId: integer("post_id")
      .notNull()
      .references(() => socialPostTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    postUserUnique: uniqueIndex("social_post_likes_post_user_unique").on(table.postId, table.userId),
    postIdx: index("social_post_likes_post_idx").on(table.postId),
    userIdx: index("social_post_likes_user_idx").on(table.userId),
  }),
);

export const userReferralCodesTable = pgTable(
  "user_referral_codes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 20 }).notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdUnique: uniqueIndex("user_referral_codes_user_unique").on(table.userId),
    codeUnique: uniqueIndex("user_referral_codes_code_unique").on(table.code),
  }),
);

export const referralClaimsTable = pgTable(
  "referral_claims",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    referralCodeId: integer("referral_code_id")
      .notNull()
      .references(() => userReferralCodesTable.id, { onDelete: "cascade" }),
    newUserId: integer("new_user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    claimedAt: timestamp("claimed_at").notNull().defaultNow(),
  },
  (table) => ({
    newUserUnique: uniqueIndex("referral_claims_new_user_unique").on(table.newUserId),
    referralCodeIdx: index("referral_claims_code_idx").on(table.referralCodeId),
  }),
);
