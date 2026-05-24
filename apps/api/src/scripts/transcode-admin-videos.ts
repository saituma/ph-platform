/**
 * Re-encode admin-uploaded videos (exercises, program section content, training
 * session items, training other content) from whatever the admin originally
 * uploaded (often 4K HEVC Main 10 / 10-bit, which mobile decoders accept but
 * render as black frames) into a universally-playable H.264 960p MP4.
 *
 * Uses optimizeUploadedVideoUrl which:
 *   - Streams the source from R2 to disk (no Node-heap buffering)
 *   - Runs `libx264 -preset veryfast -crf 30 -vf scale=960 -r 24` (memory
 *     footprint ~50-100 MB even for 4K sources)
 *   - Extracts a fresh poster from the optimized file
 *   - Uploads `<original>.opt.mp4` + `<original>.opt.poster.jpg`
 *   - Deletes the original
 *   - Returns the new public URL + new poster URL
 *
 * The script then patches the DB row to point at the new URL/poster. Idempotent
 * — already-`.opt.mp4` rows are skipped by optimizeUploadedVideoUrl.
 *
 * Usage:
 *   heroku run -a ph-performance "node heroku-deploy/dist/scripts/transcode-admin-videos.js"
 *
 * Flags (env vars):
 *   TRANSCODE_LIMIT  — cap rows processed per table (default: unlimited)
 *   TRANSCODE_TABLE  — restrict to one: exercises | section_contents | training_items | training_other
 */

import "dotenv/config";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "../db";
import {
  exerciseTable,
  programSectionContentTable,
  trainingOtherContentTable,
  trainingSessionItemTable,
} from "../db/schema";
import { optimizeUploadedVideoUrl } from "../services/video-optimization.service";

const LIMIT = Number(process.env.TRANSCODE_LIMIT) || Number.POSITIVE_INFINITY;
const ONLY_TABLE = (process.env.TRANSCODE_TABLE ?? "").toLowerCase().trim();
const SLEEP_MS = 500;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type Row = { id: number; videoUrl: string | null };

async function transcodeRow(
  label: string,
  rowId: number,
  videoUrl: string,
  apply: (fields: {
    videoUrl: string;
    posterUrl: string | null;
    durationSec: number | null;
    width: number | null;
    height: number | null;
  }) => Promise<void>,
) {
  try {
    const result = await optimizeUploadedVideoUrl(videoUrl);
    if (!result) {
      console.warn(`[${label}] id=${rowId} — optimize returned null (already .opt.mp4 or ffmpeg missing)`);
      return false;
    }
    await apply({
      videoUrl: result.optimizedUrl,
      posterUrl: result.posterUrl,
      durationSec: result.durationSec,
      width: result.width,
      height: result.height,
    });
    const savedKB = Math.round((result.bytesBefore - result.bytesAfter) / 1024);
    console.log(
      `[${label}] id=${rowId} — H.264 960p, saved ${savedKB} KB, ${result.durationSec ?? "?"}s ${
        result.width ?? "?"
      }x${result.height ?? "?"}`,
    );
    return true;
  } catch (err) {
    console.error(`[${label}] id=${rowId} — failed:`, err instanceof Error ? err.message : String(err));
    return false;
  }
}

/** Find rows whose videoUrl is not yet the optimized `.opt.mp4` variant. */
async function unoptimizedRows<T extends typeof exerciseTable>(table: T) {
  return db
    .select({ id: (table as any).id, videoUrl: (table as any).videoUrl })
    .from(table as any)
    .where(and(isNotNull((table as any).videoUrl), sql`NOT (${(table as any).videoUrl} LIKE '%.opt.mp4')`)) as any;
}

async function processTable(
  flag: string,
  table:
    | typeof exerciseTable
    | typeof programSectionContentTable
    | typeof trainingSessionItemTable
    | typeof trainingOtherContentTable,
  label: string,
) {
  if (ONLY_TABLE && ONLY_TABLE !== flag) return;
  const rows = (await unoptimizedRows(table as any)) as Row[];
  console.log(`[${label}] ${rows.length} row(s) need transcoding`);
  let processed = 0;
  for (const row of rows) {
    if (processed >= LIMIT) break;
    if (!row.videoUrl) continue;
    await transcodeRow(label, row.id, row.videoUrl, async (fields) => {
      await db
        .update(table as any)
        .set({ ...fields, updatedAt: new Date() })
        .where(eq((table as any).id, row.id));
    });
    processed += 1;
    await sleep(SLEEP_MS);
  }
}

async function main() {
  console.log(
    `[transcode-admin-videos] starting  limit=${LIMIT === Infinity ? "∞" : LIMIT}  table=${ONLY_TABLE || "all"}`,
  );
  await processTable("exercises", exerciseTable, "exercises");
  await processTable("section_contents", programSectionContentTable, "program_section_contents");
  await processTable("training_items", trainingSessionItemTable, "training_session_items");
  await processTable("training_other", trainingOtherContentTable, "training_other_contents");
  console.log("[transcode-admin-videos] done");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[transcode-admin-videos] fatal:", err);
    process.exit(1);
  });
