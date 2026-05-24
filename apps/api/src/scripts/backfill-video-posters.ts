/**
 * Backfill posterUrl + durationSec + width/height for every row that has a
 * videoUrl but no poster yet. Covers all three video-bearing tables:
 *
 *   - exercises             (admin-authored demo videos)
 *   - program_section_contents (admin-authored content videos)
 *   - video_uploads         (athlete uploads — also gets coachVideoPosterUrl
 *                            from coachVideoUrl when present)
 *
 * Strategy:
 *   1. Select rows where videoUrl IS NOT NULL AND posterUrl IS NULL.
 *   2. For each row, call optimizeUploadedVideoUrl(videoUrl) which downloads
 *      the file, runs ffmpeg, generates a poster JPG, uploads it, and returns
 *      metadata. (When the source can't be optimized further, the function
 *      still returns the parsed duration/dims and the poster URL it just
 *      uploaded — so this path works for both `.opt.mp4` and original files.)
 *   3. Update the row with the extracted fields.
 *
 * Idempotent + resumable: skips rows already populated. Throttled (1 row at a
 * time, small delay between rows) so we don't saturate R2 egress or ffmpeg
 * CPU on the API container.
 *
 * Usage:
 *   # Locally, against the configured DATABASE_URL + R2 bucket:
 *   pnpm --filter api exec tsx src/scripts/backfill-video-posters.ts
 *
 *   # On Heroku one-off dyno:
 *   heroku run -a ph-performance "pnpm --filter api exec tsx src/scripts/backfill-video-posters.ts"
 *
 * Flags (env vars):
 *   BACKFILL_LIMIT   — cap rows processed per table (default: unlimited)
 *   BACKFILL_TABLE   — restrict to one table: exercises | section_contents | uploads
 */

import "dotenv/config";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "../db";
import {
  exerciseTable,
  programSectionContentTable,
  trainingOtherContentTable,
  trainingSessionItemTable,
  videoUploadTable,
} from "../db/schema";
import { extractPosterAndMetadata } from "../services/video-optimization.service";

const LIMIT = Number(process.env.BACKFILL_LIMIT) || Number.POSITIVE_INFINITY;
const ONLY_TABLE = (process.env.BACKFILL_TABLE ?? "").toLowerCase().trim();
const SLEEP_MS = 250; // breathing room between rows

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type Row = { id: number; videoUrl: string | null };

async function backfillRow(
  label: string,
  rowId: number,
  videoUrl: string,
  apply: (fields: {
    posterUrl: string | null;
    durationSec: number | null;
    width: number | null;
    height: number | null;
  }) => Promise<void>,
) {
  try {
    // extractPosterAndMetadata is the lightweight path (no H.264 encode pass) —
    // safe for 4K sources on a 512 MB dyno.
    const result = await extractPosterAndMetadata(videoUrl);
    if (!result) {
      console.warn(`[${label}] id=${rowId} — extraction returned null (no key parsed or ffmpeg missing)`);
      return false;
    }
    if (!result.posterUrl && result.durationSec == null) {
      console.warn(`[${label}] id=${rowId} — no poster generated and no metadata parsed`);
      return false;
    }
    await apply({
      posterUrl: result.posterUrl,
      durationSec: result.durationSec,
      width: result.width,
      height: result.height,
    });
    console.log(
      `[${label}] id=${rowId} — poster=${result.posterUrl ? "ok" : "skip"} duration=${result.durationSec ?? "?"}s ${
        result.width ?? "?"
      }x${result.height ?? "?"}`,
    );
    return true;
  } catch (err) {
    console.error(`[${label}] id=${rowId} — failed:`, err instanceof Error ? err.message : String(err));
    return false;
  }
}

async function backfillExercises() {
  if (ONLY_TABLE && ONLY_TABLE !== "exercises") return;
  const rows = await db
    .select({ id: exerciseTable.id, videoUrl: exerciseTable.videoUrl })
    .from(exerciseTable)
    .where(and(isNotNull(exerciseTable.videoUrl), isNull(exerciseTable.posterUrl)));
  console.log(`[exercises] ${rows.length} row(s) need posters`);
  let processed = 0;
  for (const row of rows as Row[]) {
    if (processed >= LIMIT) break;
    if (!row.videoUrl) continue;
    await backfillRow("exercises", row.id, row.videoUrl, async (fields) => {
      await db
        .update(exerciseTable)
        .set({ ...fields, updatedAt: new Date() })
        .where(eq(exerciseTable.id, row.id));
    });
    processed += 1;
    await sleep(SLEEP_MS);
  }
}

async function backfillSectionContents() {
  if (ONLY_TABLE && ONLY_TABLE !== "section_contents") return;
  const rows = await db
    .select({ id: programSectionContentTable.id, videoUrl: programSectionContentTable.videoUrl })
    .from(programSectionContentTable)
    .where(and(isNotNull(programSectionContentTable.videoUrl), isNull(programSectionContentTable.posterUrl)));
  console.log(`[program_section_contents] ${rows.length} row(s) need posters`);
  let processed = 0;
  for (const row of rows as Row[]) {
    if (processed >= LIMIT) break;
    if (!row.videoUrl) continue;
    await backfillRow("program_section_contents", row.id, row.videoUrl, async (fields) => {
      await db
        .update(programSectionContentTable)
        .set({ ...fields, updatedAt: new Date() })
        .where(eq(programSectionContentTable.id, row.id));
    });
    processed += 1;
    await sleep(SLEEP_MS);
  }
}

async function backfillVideoUploads() {
  if (ONLY_TABLE && ONLY_TABLE !== "uploads") return;
  // 1) Primary videoUrl → posterUrl
  const primaryRows = await db
    .select({ id: videoUploadTable.id, videoUrl: videoUploadTable.videoUrl })
    .from(videoUploadTable)
    .where(and(isNotNull(videoUploadTable.videoUrl), isNull(videoUploadTable.posterUrl)));
  console.log(`[video_uploads] ${primaryRows.length} row(s) need primary posters`);
  let processed = 0;
  for (const row of primaryRows as Row[]) {
    if (processed >= LIMIT) break;
    if (!row.videoUrl) continue;
    await backfillRow("video_uploads:primary", row.id, row.videoUrl, async (fields) => {
      await db
        .update(videoUploadTable)
        .set({ ...fields, updatedAt: new Date() })
        .where(eq(videoUploadTable.id, row.id));
    });
    processed += 1;
    await sleep(SLEEP_MS);
  }

  // 2) Coach response coachVideoUrl → coachVideoPosterUrl (extracted, ignore duration/dims here)
  const coachRows = await db
    .select({ id: videoUploadTable.id, videoUrl: videoUploadTable.coachVideoUrl })
    .from(videoUploadTable)
    .where(and(isNotNull(videoUploadTable.coachVideoUrl), isNull(videoUploadTable.coachVideoPosterUrl)));
  console.log(`[video_uploads] ${coachRows.length} row(s) need coach-response posters`);
  let coachProcessed = 0;
  for (const row of coachRows as Row[]) {
    if (coachProcessed >= LIMIT) break;
    if (!row.videoUrl) continue;
    await backfillRow("video_uploads:coach", row.id, row.videoUrl, async (fields) => {
      if (!fields.posterUrl) return;
      await db
        .update(videoUploadTable)
        .set({ coachVideoPosterUrl: fields.posterUrl, updatedAt: new Date() })
        .where(eq(videoUploadTable.id, row.id));
    });
    coachProcessed += 1;
    await sleep(SLEEP_MS);
  }
}

async function backfillTrainingSessionItems() {
  if (ONLY_TABLE && ONLY_TABLE !== "training_items") return;
  const rows = await db
    .select({ id: trainingSessionItemTable.id, videoUrl: trainingSessionItemTable.videoUrl })
    .from(trainingSessionItemTable)
    .where(and(isNotNull(trainingSessionItemTable.videoUrl), isNull(trainingSessionItemTable.posterUrl)));
  console.log(`[training_session_items] ${rows.length} row(s) need posters`);
  let processed = 0;
  for (const row of rows as Row[]) {
    if (processed >= LIMIT) break;
    if (!row.videoUrl) continue;
    await backfillRow("training_session_items", row.id, row.videoUrl, async (fields) => {
      await db
        .update(trainingSessionItemTable)
        .set({ ...fields, updatedAt: new Date() })
        .where(eq(trainingSessionItemTable.id, row.id));
    });
    processed += 1;
    await sleep(SLEEP_MS);
  }
}

async function backfillTrainingOtherContents() {
  if (ONLY_TABLE && ONLY_TABLE !== "training_other") return;
  const rows = await db
    .select({ id: trainingOtherContentTable.id, videoUrl: trainingOtherContentTable.videoUrl })
    .from(trainingOtherContentTable)
    .where(and(isNotNull(trainingOtherContentTable.videoUrl), isNull(trainingOtherContentTable.posterUrl)));
  console.log(`[training_other_contents] ${rows.length} row(s) need posters`);
  let processed = 0;
  for (const row of rows as Row[]) {
    if (processed >= LIMIT) break;
    if (!row.videoUrl) continue;
    await backfillRow("training_other_contents", row.id, row.videoUrl, async (fields) => {
      await db
        .update(trainingOtherContentTable)
        .set({ ...fields, updatedAt: new Date() })
        .where(eq(trainingOtherContentTable.id, row.id));
    });
    processed += 1;
    await sleep(SLEEP_MS);
  }
}

async function main() {
  console.log(
    `[backfill-video-posters] starting  limit=${LIMIT === Infinity ? "∞" : LIMIT}  table=${ONLY_TABLE || "all"}`,
  );
  await backfillExercises();
  await backfillSectionContents();
  await backfillTrainingSessionItems();
  await backfillTrainingOtherContents();
  await backfillVideoUploads();
  console.log("[backfill-video-posters] done");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[backfill-video-posters] fatal:", err);
    process.exit(1);
  });
