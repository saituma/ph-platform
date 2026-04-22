/**
 * Subset of the main API `users` table for Worker token exchange (same Neon DB).
 */
import { boolean, integer, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

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

export const appUserTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  cognitoSub: varchar({ length: 255 }).notNull(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull(),
  role: Role().default("guardian").notNull(),
  emailVerified: boolean().notNull().default(false),
  isDeleted: boolean().notNull().default(false),
  tokenVersion: integer().notNull().default(0),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});
