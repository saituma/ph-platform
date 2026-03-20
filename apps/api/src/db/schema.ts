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
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const Role = pgEnum("role", ["guardian", "athlete", "coach", "admin", "superAdmin"]);
export const ProgramType = pgEnum("program_type", ["PHP", "PHP_Plus", "PHP_Premium"]);
export const EnrollmentStatus = pgEnum("enrollment_status", ["pending", "active", "completed", "failed"]);
export const bookingStatus = pgEnum("booking_status", ["pending", "confirmed", "declined", "cancelled"]);
export const bookingType = pgEnum("booking_type", [
  "call",
  "group_call",
  "individual_call",
  "lift_lab_1on1",
  "role_model",
  "one_on_one",
]);
export const contentType = pgEnum("content_type", ["article", "video", "image", "audio", "document", "link", "pdf", "faq"]);
export const storyMediaType = pgEnum("story_media_type", ["image", "video"]);
export const contentSurface = pgEnum("content_surface", [
  "home",
  "parent_platform",
  "legal",
  "announcements",
  "testimonial_submissions",
]);
export const messageType = pgEnum("message_type", ["text", "image", "video"]);
export const subscriptionStatus = pgEnum("subscription_status", ["pending_payment", "pending_approval", "approved", "rejected"]);
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

  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),

});

export const userLocationTable = pgTable("user_locations", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer().notNull().references(() => userTable.id),
  latitude: doublePrecision().notNull(),
  longitude: doublePrecision().notNull(),
  accuracy: integer(),
  recordedAt: timestamp().notNull().defaultNow(),
});

export const adminSettingsTable = pgTable(
  "admin_settings",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer().notNull().references(() => userTable.id),
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
  })
);
export const guardianTable = pgTable("guardians", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer().notNull().references(() => userTable.id),
  email: varchar({ length: 255 }),
  phoneNumber: varchar({ length: 255 }),
  relationToAthlete: varchar({ length: 255 }),
  activeAthleteId: integer(),
  currentProgramTier: ProgramType(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});


export const athleteTable = pgTable("athletes", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer().notNull().references(() => userTable.id),
  guardianId: integer().notNull().references(() => guardianTable.id),
  name: varchar({ length: 255 }).notNull(),
  age: integer().notNull(),
  birthDate: date(),
  team: varchar({ length: 255 }).notNull(),
  trainingPerWeek: integer().notNull(),
  injuries: jsonb(),
  growthNotes: varchar({ length: 255 }),
  performanceGoals: varchar({ length: 255 }),
  equipmentAccess: varchar({ length: 255 }),
  profilePicture: text(),
  extraResponses: jsonb(),
  currentProgramTier: ProgramType(),
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
  athleteId: integer().notNull().references(() => athleteTable.id),
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
  createdBy: integer().notNull().references(() => userTable.id),
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
  programId: integer().notNull().references(() => programTable.id),
  weekNumber: integer().notNull(),
  sessionNumber: integer().notNull(),
  type: sessionType().notNull().default("program"),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

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
  createdBy: integer().notNull().references(() => userTable.id),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const programSectionCompletionTable = pgTable(
  "program_section_completions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    athleteId: integer().notNull().references(() => athleteTable.id),
    programSectionContentId: integer().notNull().references(() => programSectionContentTable.id),
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
  })
);

export const athleteTrainingSessionLogTable = pgTable(
  "athlete_training_session_logs",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    athleteId: integer().notNull().references(() => athleteTable.id),
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
  })
);

export const athleteAchievementUnlockTable = pgTable(
  "athlete_achievement_unlocks",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    athleteId: integer().notNull().references(() => athleteTable.id),
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
  })
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
    createdBy: integer().notNull().references(() => userTable.id),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    isActiveIdx: index("stories_is_active_idx").on(table.isActive),
    orderIdx: index("stories_order_idx").on(table.order),
  })
);

export const sessionExerciseTable = pgTable("session_exercises", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  sessionId: integer().notNull().references(() => sessionTable.id),
  exerciseId: integer().notNull().references(() => exerciseTable.id),
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
    athleteId: integer().notNull().references(() => athleteTable.id),
    weekNumber: integer().notNull(),
    sessionNumber: integer().notNull(),
    title: varchar({ length: 255 }),
    notes: varchar({ length: 500 }),
    createdBy: integer().notNull().references(() => userTable.id),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    athleteIdx: index("athlete_plan_sessions_athlete_idx").on(table.athleteId),
    weekIdx: index("athlete_plan_sessions_week_idx").on(table.weekNumber),
  })
);

export const athletePlanExerciseTable = pgTable(
  "athlete_plan_exercises",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    planSessionId: integer().notNull().references(() => athletePlanSessionTable.id),
    exerciseId: integer().notNull().references(() => exerciseTable.id),
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
  })
);

export const athletePlanExerciseCompletionTable = pgTable(
  "athlete_plan_exercise_completions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    athleteId: integer().notNull().references(() => athleteTable.id),
    planExerciseId: integer().notNull().references(() => athletePlanExerciseTable.id),
    completedAt: timestamp().notNull().defaultNow(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    athleteIdx: index("athlete_plan_exercise_completions_athlete_idx").on(table.athleteId),
    exerciseIdx: uniqueIndex("athlete_plan_exercise_completions_unique").on(table.athleteId, table.planExerciseId),
    completedAtIdx: index("athlete_plan_exercise_completions_completed_at_idx").on(table.completedAt),
  })
);

export const athletePlanSessionCompletionTable = pgTable(
  "athlete_plan_session_completions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    athleteId: integer().notNull().references(() => athleteTable.id),
    planSessionId: integer().notNull().references(() => athletePlanSessionTable.id),
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
  })
);

export const messageTable = pgTable(
  "messages",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    senderId: integer().notNull().references(() => userTable.id),
    receiverId: integer().notNull().references(() => userTable.id),
    content: varchar({ length: 255 }).notNull(),
    contentType: messageType().default("text").notNull(),
    mediaUrl: varchar({ length: 500 }),
    videoUploadId: integer(),
    read: boolean().notNull().default(false),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    senderIdx: index("messages_sender_id_idx").on(table.senderId),
    receiverIdx: index("messages_receiver_id_idx").on(table.receiverId),
  })
);

export const chatGroupTable = pgTable("chat_groups", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  createdBy: integer().notNull().references(() => userTable.id),
  createdAt: timestamp().notNull().defaultNow(),
});

export const chatGroupMemberTable = pgTable(
  "chat_group_members",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    groupId: integer().notNull().references(() => chatGroupTable.id),
    userId: integer().notNull().references(() => userTable.id),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    uniqueMember: uniqueIndex("chat_group_members_group_user_unique").on(table.groupId, table.userId),
    groupIdx: index("chat_group_members_group_idx").on(table.groupId),
    userIdx: index("chat_group_members_user_idx").on(table.userId),
  })
);

export const chatGroupMessageTable = pgTable(
  "chat_group_messages",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    groupId: integer().notNull().references(() => chatGroupTable.id),
    senderId: integer().notNull().references(() => userTable.id),
    content: varchar({ length: 500 }).notNull(),
    contentType: messageType().default("text").notNull(),
    mediaUrl: varchar({ length: 500 }),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    groupIdx: index("chat_group_messages_group_idx").on(table.groupId),
  })
);

export const messageReactionTable = pgTable(
  "message_reactions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    messageId: integer().notNull().references(() => messageTable.id),
    userId: integer().notNull().references(() => userTable.id),
    emoji: varchar({ length: 16 }).notNull(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    messageIdx: index("message_reactions_message_idx").on(table.messageId),
  })
);

export const chatGroupMessageReactionTable = pgTable(
  "chat_group_message_reactions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    messageId: integer().notNull().references(() => chatGroupMessageTable.id),
    userId: integer().notNull().references(() => userTable.id),
    emoji: varchar({ length: 16 }).notNull(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    messageIdx: index("chat_group_message_reactions_message_idx").on(table.messageId),
  })
);

export const bookingTable = pgTable("bookings", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  athleteId: integer().notNull().references(() => athleteTable.id),
  guardianId: integer().notNull().references(() => guardianTable.id),
  type: bookingType(),
  status: bookingStatus(),
  startsAt: timestamp().notNull(),
  endTime: timestamp(),
  location: varchar({ length: 500 }),
  meetingLink: varchar({ length: 500 }),
  serviceTypeId: integer(),
  createdBy: integer().notNull().references(() => userTable.id),
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
  createdBy: integer().notNull().references(() => userTable.id),
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
  createdBy: integer().notNull().references(() => userTable.id),
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
  displayPrice: varchar({ length: 100 }).notNull(),
  billingInterval: varchar({ length: 50 }).notNull(),
  monthlyPrice: varchar({ length: 100 }),
  yearlyPrice: varchar({ length: 100 }),
  discountType: varchar({ length: 20 }),
  discountValue: varchar({ length: 50 }),
  discountAppliesTo: varchar({ length: 20 }),
  isActive: boolean().notNull().default(true),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const subscriptionRequestTable = pgTable("subscription_requests", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer().notNull().references(() => userTable.id),
  athleteId: integer().notNull().references(() => athleteTable.id),
  planId: integer().notNull().references(() => subscriptionPlanTable.id),
  stripeSessionId: varchar({ length: 255 }),
  paymentStatus: varchar({ length: 100 }),
  status: subscriptionStatus().notNull().default("pending_payment"),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const videoUploadTable = pgTable("video_uploads", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  athleteId: integer().notNull().references(() => athleteTable.id),
  programSectionContentId: integer().references(() => programSectionContentTable.id),
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
  athleteId: integer().notNull().references(() => athleteTable.id),
  guardianId: integer().notNull().references(() => guardianTable.id),
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
  athleteId: integer().notNull().references(() => athleteTable.id),
  programTier: ProgramType(),
  referalLink: varchar({ length: 500 }),
  discountPercent: integer(),
  metadata: jsonb(),
  createdBy: integer().notNull().references(() => userTable.id),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const serviceTypeTable = pgTable("service_types", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  type: bookingType(),
  durationMinutes: integer().notNull(),
  capacity: integer(),
  fixedStartTime: varchar({ length: 10 }),
  attendeeVisibility: boolean().notNull().default(true),
  defaultLocation: varchar({ length: 500 }),
  defaultMeetingLink: varchar({ length: 500 }),
  programTier: ProgramType(),
  isActive: boolean().notNull().default(true),
  createdBy: integer().notNull().references(() => userTable.id),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const availabilityBlockTable = pgTable("availability_blocks", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  serviceTypeId: integer().notNull().references(() => serviceTypeTable.id),
  startsAt: timestamp().notNull(),
  endsAt: timestamp().notNull(),
  createdBy: integer().notNull().references(() => userTable.id),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const legalAcceptanceTable = pgTable("legal_acceptances", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  athleteId: integer().notNull().references(() => athleteTable.id),
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
  userId: integer().notNull().references(() => userTable.id),
  type: varchar({ length: 500 }),
  content: varchar({ length: 500 }),
  read: boolean().notNull().default(false),
  link: varchar({ length: 500 }),

  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const auditLogsTable = pgTable("audit_logs", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  performedBy: integer().notNull().references(() => userTable.id),

  action: varchar({ length: 500 }),
  targetTable: varchar({ length: 500 }),

  targetId: integer(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});
