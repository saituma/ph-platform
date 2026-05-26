/**
 * Re-encode the existing `.opt.mp4` library that was produced before the
 * ffmpeg pipeline pinned `-profile:v main -pix_fmt yuv420p`. The earlier
 * transcoder inherited the source bit depth, so 10-bit inputs produced
 * H.264 High 10 output that Android's hardware decoder can't play (symptom:
 * "Unable to play video" after 3 retry attempts, while iOS plays fine).
 *
 * For every row whose `videoUrl` already ends in `.opt.mp4`, this script calls
 * `optimizeUploadedVideoUrl(url, { force: true })`. The optimized R2 object is
 * overwritten in place, so the existing `videoUrl` stays valid — we only patch
 * the regenerated poster/duration/dimensions on the DB row.
 *
 * Usage:
 *   heroku run -a ph-performance "node heroku-deploy/dist/scripts/reencode-android-incompatible-videos.js"
 *
 * Flags (env vars):
 *   REENCODE_LIMIT  — cap rows processed per table (default: unlimited)
 *   REENCODE_TABLE  — restrict to one: exercises | section_contents | training_items | training_other
 */

import "dotenv/config";
import { eq, isNotNull, like, and } from "drizzle-orm";
import { db } from "../db";
import {
  exerciseTable,
  programSectionContentTable,
  trainingOtherContentTable,
  trainingSessionItemTable,
} from "../db/schema";
import { optimizeUploadedVideoUrl } from "../services/video-optimization.service";

const LIMIT = Number(process.env.REENCODE_LIMIT) || Number.POSITIVE_INFINITY;
const ONLY_TABLE = (process.env.REENCODE_TABLE ?? "").toLowerCase().trim();
const SLEEP_MS = 500;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type Row = { id: number; videoUrl: string | null };

async function reencodeRow(
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
    const result = await optimizeUploadedVideoUrl(videoUrl, { force: true });
    if (!result) {
      console.warn(`[${label}] id=${rowId} — optimize returned null`);
      return false;
    }
    await apply({
      posterUrl: result.posterUrl,
      durationSec: result.durationSec,
      width: result.width,
      height: result.height,
    });
    console.log(
      `[${label}] id=${rowId} — re-encoded ${result.durationSec ?? "?"}s ${result.width ?? "?"}x${result.height ?? "?"}`,
    );
    return true;
  } catch (err) {
    console.error(`[${label}] id=${rowId} — failed:`, err instanceof Error ? err.message : String(err));
    return false;
  }
}

async function optRows<T extends typeof exerciseTable>(table: T) {
  return db
    .select({ id: (table as any).id, videoUrl: (table as any).videoUrl })
    .from(table as any)
    .where(and(isNotNull((table as any).videoUrl), like((table as any).videoUrl, "%.opt.mp4"))) as any;
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
  const rows = (await optRows(table as any)) as Row[];
  console.log(`[${label}] ${rows.length} row(s) to re-encode`);
  let processed = 0;
  for (const row of rows) {
    if (processed >= LIMIT) break;
    if (!row.videoUrl) continue;
    await reencodeRow(label, row.id, row.videoUrl, async (fields) => {
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
    `[reencode-android-incompatible-videos] starting  limit=${LIMIT === Infinity ? "∞" : LIMIT}  table=${ONLY_TABLE || "all"}`,
  );
  await processTable("exercises", exerciseTable, "exercises");
  await processTable("section_contents", programSectionContentTable, "program_section_contents");
  await processTable("training_items", trainingSessionItemTable, "training_session_items");
  await processTable("training_other", trainingOtherContentTable, "training_other_contents");
  console.log("[reencode-android-incompatible-videos] done");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[reencode-android-incompatible-videos] fatal:", err);
    process.exit(1);
  });
