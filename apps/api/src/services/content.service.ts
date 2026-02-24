import { eq, desc } from "drizzle-orm";

import { db } from "../db";
import { athleteTable, contentTable, parentCourseTable, ProgramType } from "../db/schema";
import { calculateAge, normalizeDate } from "../lib/age";

const tierOrder: Record<(typeof ProgramType.enumValues)[number], number> = {
  PHP: 1,
  PHP_Plus: 2,
  PHP_Premium: 3,
};

export async function getHomeContent() {
  return db
    .select()
    .from(contentTable)
    .where(eq(contentTable.surface, "home"))
    .orderBy(desc(contentTable.updatedAt));
}

export async function getLegalContent() {
  return db.select().from(contentTable).where(eq(contentTable.surface, "legal"));
}

export async function getTestimonialSubmissions() {
  return db
    .select()
    .from(contentTable)
    .where(eq(contentTable.surface, "testimonial_submissions"));
}

export async function getAnnouncements() {
  return db
    .select()
    .from(contentTable)
    .where(eq(contentTable.surface, "announcements"))
    .orderBy(desc(contentTable.updatedAt));
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

function matchesAgeRange(
  item: { minAge?: number | null; maxAge?: number | null; ageList?: unknown | null },
  age: number | null
) {
  const list = Array.isArray(item.ageList)
    ? (item.ageList as unknown[]).map((val) => Number(val)).filter((val) => Number.isFinite(val))
    : [];
  if (list.length) {
    if (age === null) return false;
    return list.includes(age);
  }
  if (age === null) return true;
  if (item.minAge !== null && item.minAge !== undefined && age < item.minAge) return false;
  if (item.maxAge !== null && item.maxAge !== undefined && age > item.maxAge) return false;
  return true;
}

export async function getHomeContentForUser(userId: number) {
  const age = await resolveAthleteAge(userId);
  const items = await db
    .select()
    .from(contentTable)
    .where(eq(contentTable.surface, "home"))
    .orderBy(desc(contentTable.updatedAt));
  return items.filter((item) => matchesAgeRange(item, age));
}

export async function getLegalContentForUser() {
  return db.select().from(contentTable).where(eq(contentTable.surface, "legal"));
}

export async function getParentPlatformContent(userId: number, role?: string) {
  if (role && !ADMIN_ROLES.has(role) && role !== "athlete") {
    return [] as typeof contentTable.$inferSelect[];
  }
  if (role && ADMIN_ROLES.has(role)) {
    return db.select().from(contentTable).where(eq(contentTable.surface, "parent_platform"));
  }
  const athlete = await db.select().from(athleteTable).where(eq(athleteTable.userId, userId)).limit(1);
  const tier = (athlete[0]?.currentProgramTier ?? "PHP") as (typeof ProgramType.enumValues)[number];
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
  surface: "home" | "parent_platform" | "legal" | "announcements" | "testimonial_submissions";
  category?: string | null;
  ageList?: number[] | null;
  minAge?: number | null;
  maxAge?: number | null;
  createdBy: number;
}) {
  const ageList = Array.isArray(input.ageList)
    ? input.ageList.filter((val) => Number.isFinite(val))
    : null;
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
      ageList: ageList && ageList.length ? ageList : null,
      minAge: ageList && ageList.length ? null : input.minAge ?? null,
      maxAge: ageList && ageList.length ? null : input.maxAge ?? null,
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
  ageList?: number[] | null;
  minAge?: number | null;
  maxAge?: number | null;
}) {
  const ageList = Array.isArray(input.ageList)
    ? input.ageList.filter((val) => Number.isFinite(val))
    : null;
  const result = await db
    .update(contentTable)
    .set({
      title: input.title,
      content: input.content,
      type: input.type as any,
      body: input.body ?? null,
      programTier: input.programTier ?? null,
      category: input.category ?? null,
      ageList: ageList && ageList.length ? ageList : null,
      minAge: ageList && ageList.length ? null : input.minAge ?? null,
      maxAge: ageList && ageList.length ? null : input.maxAge ?? null,
      updatedAt: new Date(),
    })
    .where(eq(contentTable.id, input.id))
    .returning();

  return result[0] ?? null;
}

export async function updateContentCategory(input: { id: number; category: string | null }) {
  const result = await db
    .update(contentTable)
    .set({ category: input.category, updatedAt: new Date() })
    .where(eq(contentTable.id, input.id))
    .returning();
  return result[0] ?? null;
}

export async function deleteContentItem(contentId: number) {
  const result = await db
    .delete(contentTable)
    .where(eq(contentTable.id, contentId))
    .returning();
  return result[0] ?? null;
}

export async function getContentByIdAdmin(contentId: number) {
  const items = await db.select().from(contentTable).where(eq(contentTable.id, contentId)).limit(1);
  return items[0] ?? null;
}

export async function getContentAiInsight(contentId: number, ageGroup?: string | null) {
  const item = await db
    .select()
    .from(contentTable)
    .where(eq(contentTable.id, contentId))
    .limit(1);

  if (!item[0]) return null;

  const { generateContentSummary } = await import("./ai.service");
  
  // Combine title and body for context
  const contentText = [
    item[0].title,
    item[0].body
  ].filter(Boolean).join("\n\n");

  if (!contentText) return null;

  return generateContentSummary(item[0].title, contentText, ageGroup ?? undefined);
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
  const tier = (athlete[0]?.currentProgramTier ?? "PHP") as (typeof ProgramType.enumValues)[number];
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

export async function getParentCourseAiInsight(courseId: number) {
  const course = await db
    .select()
    .from(parentCourseTable)
    .where(eq(parentCourseTable.id, courseId))
    .limit(1);

  if (!course[0]) return null;

  const modules = (course[0].modules as any[]) || [];

  const context = `Course Title: ${course[0].title}\nSummary: ${course[0].summary}\nModules:\n${modules
    .map((m) => `- ${m.title}: ${m.content?.slice(0, 100)}...`)
    .join("\n")}`;

  const { generateParentEducationalInsight } = await import("./ai.service");
  return await generateParentEducationalInsight(context);
}
