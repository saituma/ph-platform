import { and, desc, eq, isNull, or } from "drizzle-orm";

import { db } from "../db";
import { programSectionContentTable, ProgramType, sessionType } from "../db/schema";
import { optimizeUploadedVideoUrl } from "./video-optimization.service";
import { logger } from "../lib/logger";

/** Fire-and-forget H.264 transcode + poster extraction for an admin content
 *  video. Converts HEVC/other codecs to H.264 960p and extracts a poster JPG.
 *  Already-.opt.mp4 files are skipped (idempotent). */
function schedulePosterExtractionForContent(contentId: number, videoUrl: string | null | undefined) {
  if (!videoUrl) return;
  void (async () => {
    try {
      const result = await optimizeUploadedVideoUrl(videoUrl);
      if (!result) return;
      await db
        .update(programSectionContentTable)
        .set({
          videoUrl: result.optimizedUrl,
          posterUrl: result.posterUrl,
          durationSec: result.durationSec,
          width: result.width,
          height: result.height,
          updatedAt: new Date(),
        })
        .where(eq(programSectionContentTable.id, contentId));
      logger.info(
        { contentId, posterGenerated: !!result.posterUrl, durationSec: result.durationSec },
        "[ContentUpload] poster extracted",
      );
    } catch (err) {
      logger.warn({ err, contentId }, "[ContentUpload] poster extraction failed");
    }
  })();
}

function normalizeAgeList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => Number(item)).filter((item) => Number.isFinite(item));
}

function matchesAgeList(item: { ageList?: unknown | null }, age: number | null) {
  const list = normalizeAgeList(item.ageList);
  if (list.length === 0) return true;
  if (age === null || age === undefined) return false;
  return list.includes(age);
}

export async function listProgramSectionContent(input: {
  sectionType?: (typeof sessionType.enumValues)[number];
  programTier?: (typeof ProgramType.enumValues)[number] | null;
  age?: number | null;
  bypassAgeFilter?: boolean;
}) {
  const filters = [] as ReturnType<typeof eq>[];
  if (input.sectionType) {
    filters.push(eq(programSectionContentTable.sectionType, input.sectionType));
  }
  if (input.programTier) {
    // Admin exercise library often omits programTier → NULL in DB. Those rows must appear for
    // every athlete tier; only rows with an explicit tier are restricted to that tier.
    filters.push(
      or(
        eq(programSectionContentTable.programTier, input.programTier),
        isNull(programSectionContentTable.programTier),
      )!,
    );
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
  if (input.bypassAgeFilter) {
    return rows;
  }
  return rows.filter((item) => matchesAgeList(item, input.age ?? null));
}

export async function getProgramSectionContentById(id: number) {
  const rows = await db.select().from(programSectionContentTable).where(eq(programSectionContentTable.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createProgramSectionContent(input: {
  sectionType: (typeof sessionType.enumValues)[number];
  programTier?: (typeof ProgramType.enumValues)[number] | null;
  ageList?: number[] | null;
  title: string;
  body: string;
  videoUrl?: string | null;
  allowVideoUpload?: boolean | null;
  metadata?: Record<string, unknown> | null;
  order?: number | null;
  createdBy: number;
}) {
  const ageList = Array.isArray(input.ageList) ? input.ageList.filter((item) => Number.isFinite(item)) : [];
  const result = await db
    .insert(programSectionContentTable)
    .values({
      sectionType: input.sectionType,
      programTier: input.programTier ?? null,
      ageList: ageList.length ? ageList : null,
      title: input.title,
      body: input.body,
      videoUrl: input.videoUrl ?? null,
      allowVideoUpload: Boolean(input.allowVideoUpload),
      metadata: input.metadata ?? null,
      order: input.order ?? 1,
      createdBy: input.createdBy,
    })
    .returning();

  if (result[0]) schedulePosterExtractionForContent(result[0].id, result[0].videoUrl);
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
  allowVideoUpload?: boolean | null;
  metadata?: Record<string, unknown> | null;
  order?: number | null;
}) {
  const ageList = Array.isArray(input.ageList) ? input.ageList.filter((item) => Number.isFinite(item)) : [];
  const result = await db
    .update(programSectionContentTable)
    .set({
      sectionType: input.sectionType,
      programTier: input.programTier ?? null,
      ageList: ageList.length ? ageList : null,
      title: input.title,
      body: input.body,
      videoUrl: input.videoUrl ?? null,
      allowVideoUpload: Boolean(input.allowVideoUpload),
      metadata: input.metadata ?? null,
      order: input.order ?? 1,
      updatedAt: new Date(),
    })
    .where(eq(programSectionContentTable.id, input.id))
    .returning();

  if (result[0] && input.videoUrl !== undefined) {
    schedulePosterExtractionForContent(result[0].id, result[0].videoUrl);
  }
  return result[0] ?? null;
}

export async function deleteProgramSectionContent(id: number) {
  const result = await db.delete(programSectionContentTable).where(eq(programSectionContentTable.id, id)).returning();
  return result[0] ?? null;
}
