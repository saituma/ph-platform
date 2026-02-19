import { and, desc, eq } from "drizzle-orm";

import { db } from "../db";
import { programSectionContentTable, ProgramType, sessionType } from "../db/schema";

export async function listProgramSectionContent(input: {
  sectionType?: (typeof sessionType.enumValues)[number];
  programTier?: (typeof ProgramType.enumValues)[number] | null;
}) {
  const filters = [] as ReturnType<typeof eq>[];
  if (input.sectionType) {
    filters.push(eq(programSectionContentTable.sectionType, input.sectionType));
  }
  if (input.programTier) {
    filters.push(eq(programSectionContentTable.programTier, input.programTier));
  }

  if (filters.length) {
    return db
      .select()
      .from(programSectionContentTable)
      .where(and(...filters))
      .orderBy(programSectionContentTable.order, desc(programSectionContentTable.updatedAt));
  }

  return db
    .select()
    .from(programSectionContentTable)
    .orderBy(programSectionContentTable.order, desc(programSectionContentTable.updatedAt));
}

export async function createProgramSectionContent(input: {
  sectionType: (typeof sessionType.enumValues)[number];
  programTier?: (typeof ProgramType.enumValues)[number] | null;
  title: string;
  body: string;
  videoUrl?: string | null;
  order?: number | null;
  createdBy: number;
}) {
  const result = await db
    .insert(programSectionContentTable)
    .values({
      sectionType: input.sectionType,
      programTier: input.programTier ?? null,
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
  title: string;
  body: string;
  videoUrl?: string | null;
  order?: number | null;
}) {
  const result = await db
    .update(programSectionContentTable)
    .set({
      sectionType: input.sectionType,
      programTier: input.programTier ?? null,
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
