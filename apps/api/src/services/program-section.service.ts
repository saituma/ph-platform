import { and, desc, eq } from "drizzle-orm";

import { db } from "../db";
import { programSectionContentTable, ProgramType, sessionType } from "../db/schema";

function normalizeAgeList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
}

function matchesAgeList(
  item: { ageList?: unknown | null },
  age: number | null,
) {
  const list = normalizeAgeList(item.ageList);
  if (list.length === 0) return true;
  if (age === null || age === undefined) return false;
  return list.includes(age);
}

export async function listProgramSectionContent(input: {
  sectionType?: (typeof sessionType.enumValues)[number];
  programTier?: (typeof ProgramType.enumValues)[number] | null;
  age?: number | null;
}) {
  const filters = [] as ReturnType<typeof eq>[];
  if (input.sectionType) {
    filters.push(eq(programSectionContentTable.sectionType, input.sectionType));
  }
  if (input.programTier) {
    filters.push(eq(programSectionContentTable.programTier, input.programTier));
  }

  const query = filters.length
    ? db
        .select()
        .from(programSectionContentTable)
        .where(and(...filters))
        .orderBy(programSectionContentTable.order, desc(programSectionContentTable.updatedAt))
    : db
        .select()
        .from(programSectionContentTable)
        .orderBy(programSectionContentTable.order, desc(programSectionContentTable.updatedAt));

  const rows = await query;
  return rows.filter((item) => matchesAgeList(item, input.age ?? null));
}

export async function createProgramSectionContent(input: {
  sectionType: (typeof sessionType.enumValues)[number];
  programTier?: (typeof ProgramType.enumValues)[number] | null;
  ageList?: number[] | null;
  title: string;
  body: string;
  videoUrl?: string | null;
  order?: number | null;
  createdBy: number;
}) {
  const ageList = Array.isArray(input.ageList)
    ? input.ageList.filter((item) => Number.isFinite(item))
    : [];
  const result = await db
    .insert(programSectionContentTable)
    .values({
      sectionType: input.sectionType,
      programTier: input.programTier ?? null,
      ageList: ageList.length ? ageList : null,
      title: input.title,
      body: input.body,
      videoUrl: input.videoUrl ?? null,
      order: input.order ?? 1,
      createdBy: input.createdBy,
    })
    .returning();

  return result[0];
}

export async function updateProgramSectionContent(input: {
  id: number;
  sectionType: (typeof sessionType.enumValues)[number];
  programTier?: (typeof ProgramType.enumValues)[number] | null;
  ageList?: number[] | null;
  title: string;
  body: string;
  videoUrl?: string | null;
  order?: number | null;
}) {
  const ageList = Array.isArray(input.ageList)
    ? input.ageList.filter((item) => Number.isFinite(item))
    : [];
  const result = await db
    .update(programSectionContentTable)
    .set({
      sectionType: input.sectionType,
      programTier: input.programTier ?? null,
      ageList: ageList.length ? ageList : null,
      title: input.title,
      body: input.body,
      videoUrl: input.videoUrl ?? null,
      order: input.order ?? 1,
      updatedAt: new Date(),
    })
    .where(eq(programSectionContentTable.id, input.id))
    .returning();

  return result[0] ?? null;
}

export async function deleteProgramSectionContent(id: number) {
  const result = await db
    .delete(programSectionContentTable)
    .where(eq(programSectionContentTable.id, id))
    .returning();
  return result[0] ?? null;
}
