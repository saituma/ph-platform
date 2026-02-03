import { boolean, date, integer, jsonb, pgEnum, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const Role = pgEnum("role", ["athlete", "guardian", "coach", "admin", "superAdmin"]);
export const ProgramType = pgEnum("program_type", ["PHP", "PHP_Plus", "PHP_Premium"]);
export const EnrollmentStatus = pgEnum("enrollment_status", ["pending", "active", "completed", "failed"]);
export const bookingStatus = pgEnum("booking_status", ["pending", "confirmed", "declined", "cancelled"]);
export const bookingType = pgEnum("booking_type", ["group_call", "one_on_one", "role_model"]);
export const contentType = pgEnum("content_type", ["article", "video", "image", "audio", "document", "link", "pdf", "faq"]);

export const userTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull(),
  role: Role(),
  password: varchar({ length: 255 }).notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),

});
export const guardianTable = pgTable("guardians", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  phoneNumber: varchar({ length: 255 }),
  relationToAthlete: varchar({ length: 255 }),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});


export const athleteTable = pgTable("athletes", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer().notNull().references(() => userTable.id),
  guardianId: integer().notNull().references(() => guardianTable.id),
  age: integer().notNull(),
  team: varchar({ length: 255 }).notNull(),
  trainingPerWeek: integer().notNull(),
  injuries: jsonb(),
  growthNotes: varchar({ length: 255 }),
  performanceGoals: varchar({ length: 255 }),
  equipmentAccess: varchar({ length: 255 }),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});


export const enrollmentTable = pgTable("enrollments", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  athleteId: integer().notNull().references(() => athleteTable.id),
  programType: ProgramType(),
  status: EnrollmentStatus(),
  assignedByCoach: integer().references(() => userTable.id),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const programTable = pgTable("programs", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  type: ProgramType(),
  description: varchar({ length: 255 }),
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
  videoUrl: varchar({ length: 500 }),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const sessionTable = pgTable("sessions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  programId: integer().notNull().references(() => programTable.id),
  weekNumber: integer().notNull(),
  sessionNumber: integer().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const sessionExerciseTable = pgTable("session_exercises", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  sessionId: integer().notNull().references(() => sessionTable.id),
  exerciseId: integer().notNull().references(() => exerciseTable.id),
  order: integer().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const messageTable = pgTable("messages", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  senderId: integer().notNull().references(() => userTable.id),
  receiverId: integer().notNull().references(() => userTable.id),
  content: varchar({ length: 255 }).notNull(),
  read: boolean().notNull().default(false),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const bookingTable = pgTable("bookings", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  athleteId: integer().notNull().references(() => athleteTable.id),
  guardianId: integer().notNull().references(() => guardianTable.id),
  type: bookingType(),
  status: bookingStatus(),
  endTime: timestamp(),
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
