import { eq } from "drizzle-orm";

import { db } from "../db";
import { athleteTable, contentTable, parentCourseTable, ProgramType } from "../db/schema";
import { calculateAge, normalizeDate } from "../lib/age";

const tierOrder: Record<(typeof ProgramType.enumValues)[number], number> = {
  PHP: 1,
  PHP_Plus: 2,
  PHP_Premium: 3,
};

export async function getHomeContent() {
  return db.select().from(contentTable).where(eq(contentTable.surface, "home"));
}

export async function getLegalContent() {
  return db.select().from(contentTable).where(eq(contentTable.surface, "legal"));
}

function resolveAgeFromAthlete(row: typeof athleteTable.$inferSelect | null | undefined) {
  if (!row) return null;
  const birthDate = normalizeDate(row.birthDate as any);
  if (birthDate) {
    return calculateAge(birthDate);
  }
  return row.age ?? null;
}

async function resolveAthleteAge(userId: number) {
  const athlete = await db.select().from(athleteTable).where(eq(athleteTable.userId, userId)).limit(1);
  return resolveAgeFromAthlete(athlete[0]);
}

function matchesAgeRange(item: { minAge?: number | null; maxAge?: number | null }, age: number | null) {
  if (age === null) return true;
  if (item.minAge !== null && item.minAge !== undefined && age < item.minAge) return false;
  if (item.maxAge !== null && item.maxAge !== undefined && age > item.maxAge) return false;
  return true;
}

export async function getHomeContentForUser(userId: number) {
  const age = await resolveAthleteAge(userId);
  const items = await db.select().from(contentTable).where(eq(contentTable.surface, "home"));
  return items.filter((item) => matchesAgeRange(item, age));
}

export async function getLegalContentForUser() {
  return db.select().from(contentTable).where(eq(contentTable.surface, "legal"));
}

export async function getParentPlatformContent(userId: number) {
  const athlete = await db.select().from(athleteTable).where(eq(athleteTable.userId, userId)).limit(1);
  const tier = athlete[0]?.currentProgramTier ?? "PHP";
  const age = resolveAgeFromAthlete(athlete[0]);
  const allowed = tierOrder[tier];

  const items = await db.select().from(contentTable).where(eq(contentTable.surface, "parent_platform"));
  return items.filter((item) => {
    if (!matchesAgeRange(item, age)) return false;
    if (!item.programTier) {
      return true;
    }
    return tierOrder[item.programTier] <= allowed;
  });
}

export async function getContentById(userId: number, contentId: number) {
  const items = await getParentPlatformContent(userId);
  return items.find((item) => item.id === contentId) ?? null;
}

export async function createContent(input: {
  title: string;
  content: string;
  type: string;
  body?: string | null;
  programTier?: (typeof ProgramType.enumValues)[number] | null;
  surface: "home" | "parent_platform" | "legal";
  category?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
  createdBy: number;
}) {
  const result = await db
    .insert(contentTable)
    .values({
      title: input.title,
      content: input.content,
      type: input.type as any,
      body: input.body ?? null,
      programTier: input.programTier ?? null,
      surface: input.surface,
      category: input.category ?? null,
      minAge: input.minAge ?? null,
      maxAge: input.maxAge ?? null,
      createdBy: input.createdBy,
    })
    .returning();

  return result[0];
}

export async function updateContent(input: {
  id: number;
  title: string;
  content: string;
  type: string;
  body?: string | null;
  programTier?: (typeof ProgramType.enumValues)[number] | null;
  category?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
}) {
  const result = await db
    .update(contentTable)
    .set({
      title: input.title,
      content: input.content,
      type: input.type as any,
      body: input.body ?? null,
      programTier: input.programTier ?? null,
      category: input.category ?? null,
      minAge: input.minAge ?? null,
      maxAge: input.maxAge ?? null,
      updatedAt: new Date(),
    })
    .where(eq(contentTable.id, input.id))
    .returning();

  return result[0] ?? null;
}

type ParentCourseModule = {
  id: string;
  title: string;
  type: "article" | "video" | "pdf" | "faq";
  content?: string | null;
  mediaUrl?: string | null;
  order: number;
  preview?: boolean | null;
};

const ADMIN_ROLES = new Set(["admin", "superAdmin", "coach"]);

function normalizeModules(modules: ParentCourseModule[] | null | undefined) {
  if (!Array.isArray(modules)) return [] as ParentCourseModule[];
  return modules
    .map((module, index) => ({
      id: module.id ?? `${Date.now()}-${index}`,
      title: module.title ?? "Module",
      type: module.type ?? "article",
      content: module.content,
      mediaUrl: module.mediaUrl,
      order: Number.isFinite(module.order) ? module.order : index,
      preview: module.preview ?? false,
    }))
    .sort((a, b) => a.order - b.order);
}

function applyTierAccess(
  items: typeof parentCourseTable.$inferSelect[],
  allowed: number | null
) {
  return items
    .map((item) => {
      const modules = normalizeModules(item.modules as any);
      if (!item.programTier || allowed === null) {
        return { ...item, modules, isPreview: false };
      }
      const required = tierOrder[item.programTier];
      if (required <= allowed) {
        return { ...item, modules, isPreview: false };
      }
      const previewModules = modules.filter((module) => module.preview);
      if (!previewModules.length) {
        return null;
      }
      return { ...item, modules: previewModules, isPreview: true };
    })
    .filter(Boolean);
}

export async function listParentCourses(userId: number, role?: string) {
  const items = await db.select().from(parentCourseTable);
  if (role && ADMIN_ROLES.has(role)) {
    return items.map((item) => ({ ...item, modules: normalizeModules(item.modules as any), isPreview: false }));
  }
  const athlete = await db.select().from(athleteTable).where(eq(athleteTable.userId, userId)).limit(1);
  const tier = athlete[0]?.currentProgramTier ?? "PHP";
  const allowed = tierOrder[tier];
  const age = resolveAgeFromAthlete(athlete[0]);
  const filtered = items.filter((item) => matchesAgeRange(item, age));
  return applyTierAccess(filtered, allowed) as any;
}

export async function getParentCourseById(userId: number, courseId: number, role?: string) {
  const items = await listParentCourses(userId, role);
  return (items as any[]).find((item) => item.id === courseId) ?? null;
}

export async function createParentCourse(input: {
  title: string;
  summary: string;
  description?: string | null;
  coverImage?: string | null;
  category: string;
  programTier?: (typeof ProgramType.enumValues)[number] | null;
  minAge?: number | null;
  maxAge?: number | null;
  modules: ParentCourseModule[];
  createdBy: number;
}) {
  const result = await db
    .insert(parentCourseTable)
    .values({
      title: input.title,
      summary: input.summary,
      description: input.description ?? null,
      coverImage: input.coverImage ?? null,
      category: input.category,
      programTier: input.programTier ?? null,
      minAge: input.minAge ?? null,
      maxAge: input.maxAge ?? null,
      modules: input.modules as any,
      createdBy: input.createdBy,
    })
    .returning();

  return result[0];
}

export async function updateParentCourse(input: {
  id: number;
  title: string;
  summary: string;
  description?: string | null;
  coverImage?: string | null;
  category: string;
  programTier?: (typeof ProgramType.enumValues)[number] | null;
  minAge?: number | null;
  maxAge?: number | null;
  modules: ParentCourseModule[];
}) {
  const result = await db
    .update(parentCourseTable)
    .set({
      title: input.title,
      summary: input.summary,
      description: input.description ?? null,
      coverImage: input.coverImage ?? null,
      category: input.category,
      programTier: input.programTier ?? null,
      minAge: input.minAge ?? null,
      maxAge: input.maxAge ?? null,
      modules: input.modules as any,
      updatedAt: new Date(),
    })
    .where(eq(parentCourseTable.id, input.id))
    .returning();

  return result[0] ?? null;
}
