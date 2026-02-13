import {
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const Role = pgEnum("role", ["guardian", "athlete", "coach", "admin", "superAdmin"]);
export const ProgramType = pgEnum("program_type", ["PHP", "PHP_Plus", "PHP_Premium"]);
export const EnrollmentStatus = pgEnum("enrollment_status", ["pending", "active", "completed", "failed"]);
export const bookingStatus = pgEnum("booking_status", ["pending", "confirmed", "declined", "cancelled"]);
export const bookingType = pgEnum("booking_type", ["group_call", "one_on_one", "role_model"]);
export const contentType = pgEnum("content_type", ["article", "video", "image", "audio", "document", "link", "pdf", "faq"]);
export const contentSurface = pgEnum("content_surface", ["home", "parent_platform"]);
export const messageType = pgEnum("message_type", ["text", "image", "video"]);
export const sessionType = pgEnum("session_type", [
  "program",
  "warmup",
  "cooldown",
  "stretching",
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
  profilePicture: varchar({ length: 255 }),
  passwordHash: varchar({ length: 255 }),
  passwordSalt: varchar({ length: 255 }),
  emailVerified: boolean().notNull().default(false),
  verificationCode: varchar({ length: 10 }),
  verificationExpiresAt: timestamp(),
  verificationAttempts: integer().notNull().default(0),
  isBlocked: boolean().notNull().default(false),
  isDeleted: boolean().notNull().default(false),

  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),

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
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});


export const athleteTable = pgTable("athletes", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer().notNull().references(() => userTable.id),
  guardianId: integer().notNull().references(() => guardianTable.id),
  name: varchar({ length: 255 }).notNull(),
  age: integer().notNull(),
  team: varchar({ length: 255 }).notNull(),
  trainingPerWeek: integer().notNull(),
  injuries: jsonb(),
  growthNotes: varchar({ length: 255 }),
  performanceGoals: varchar({ length: 255 }),
  equipmentAccess: varchar({ length: 255 }),
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
  isTemplate: boolean().notNull().default(true),
  createdBy: integer().notNull().references(() => userTable.id),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const exerciseTable = pgTable("exercises", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  cues: varchar({ length: 500 }),
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

export const messageTable = pgTable("messages", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  senderId: integer().notNull().references(() => userTable.id),
  receiverId: integer().notNull().references(() => userTable.id),
  content: varchar({ length: 255 }).notNull(),
  contentType: messageType().default("text").notNull(),
  mediaUrl: varchar({ length: 500 }),
  read: boolean().notNull().default(false),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const chatGroupTable = pgTable("chat_groups", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  createdBy: integer().notNull().references(() => userTable.id),
  createdAt: timestamp().notNull().defaultNow(),
});

export const chatGroupMemberTable = pgTable("chat_group_members", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  groupId: integer().notNull().references(() => chatGroupTable.id),
  userId: integer().notNull().references(() => userTable.id),
  createdAt: timestamp().notNull().defaultNow(),
});

export const chatGroupMessageTable = pgTable("chat_group_messages", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  groupId: integer().notNull().references(() => chatGroupTable.id),
  senderId: integer().notNull().references(() => userTable.id),
  content: varchar({ length: 500 }).notNull(),
  contentType: messageType().default("text").notNull(),
  mediaUrl: varchar({ length: 500 }),
  createdAt: timestamp().notNull().defaultNow(),
});

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
  body: varchar({ length: 2000 }),
  programTier: ProgramType(),
  surface: contentSurface().notNull(),
  category: varchar({ length: 255 }),
  createdBy: integer().notNull().references(() => userTable.id),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const videoUploadTable = pgTable("video_uploads", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  athleteId: integer().notNull().references(() => athleteTable.id),
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
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const physioRefferalsTable = pgTable("physio_refferals", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  athleteId: integer().notNull().references(() => athleteTable.id),
  programTier: ProgramType(),
  referalLink: varchar({ length: 500 }),
  discountPercent: integer(),
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
