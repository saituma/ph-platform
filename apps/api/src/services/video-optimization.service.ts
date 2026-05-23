import fs from "fs/promises";
import os from "os";
import path from "path";
import { spawn, spawnSync } from "child_process";

import {
  deleteObject,
  downloadObjectToFile,
  getMediaObjectKeyFromPublicUrl,
  getPublicObjectUrl,
  putObject,
} from "./s3.service";
import { logger } from "../lib/logger";

let ffmpegAvailable: boolean | null = null;

function isFfmpegAvailable() {
  if (ffmpegAvailable != null) return ffmpegAvailable;
  const result = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  ffmpegAvailable = result.status === 0;
  if (!ffmpegAvailable) {
    logger.warn("[VideoOptimization] ffmpeg not available on host; skipping optimization.");
  }
  return ffmpegAvailable;
}

/** Run ffmpeg and resolve with full stderr text — we parse it for duration/dims. */
function runFfmpegCapture(args: string[]) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) return resolve(stderr);
      reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-400)}`));
    });
  });
}

function runFfmpeg(args: string[]) {
  return runFfmpegCapture(args).then(() => undefined);
}

function optimizedKeyFor(originalKey: string) {
  const ext = path.extname(originalKey).toLowerCase();
  const base = ext ? originalKey.slice(0, -ext.length) : originalKey;
  return `${base}.opt.mp4`;
}

function posterKeyFor(originalKey: string) {
  const ext = path.extname(originalKey).toLowerCase();
  const base = ext ? originalKey.slice(0, -ext.length) : originalKey;
  return `${base}.poster.jpg`;
}

/** Parse `Duration: HH:MM:SS.xx` and `, 1920x1080` out of ffmpeg stderr. Works
 * without ffprobe — ffmpeg always prints the input info before any encoding. */
export function parseFfmpegMetadata(stderr: string): {
  durationSec: number | null;
  width: number | null;
  height: number | null;
} {
  let durationSec: number | null = null;
  const dur = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (dur) {
    const h = Number(dur[1]);
    const m = Number(dur[2]);
    const s = Number(dur[3]);
    if (Number.isFinite(h) && Number.isFinite(m) && Number.isFinite(s)) {
      durationSec = Math.round(h * 3600 + m * 60 + s);
    }
  }
  let width: number | null = null;
  let height: number | null = null;
  // Look for the Video stream line, e.g.:
  //   Stream #0:0[0x1](und): Video: h264 ... yuv420p(tv, bt709), 1920x1080 [SAR 1:1 DAR 16:9], ...
  const vid = stderr.match(/Stream[^\n]*Video:[^\n]*?(\d{2,5})x(\d{2,5})/);
  if (vid) {
    const w = Number(vid[1]);
    const h = Number(vid[2]);
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
      width = w;
      height = h;
    }
  }
  return { durationSec, width, height };
}

export type OptimizedVideoResult = {
  optimizedUrl: string;
  optimizedKey: string;
  originalKey: string;
  bytesBefore: number;
  bytesAfter: number;
  posterUrl: string | null;
  durationSec: number | null;
  width: number | null;
  height: number | null;
};

export type PosterAndMetadataResult = {
  posterUrl: string | null;
  durationSec: number | null;
  width: number | null;
  height: number | null;
};

/** Lightweight pass: download, single-frame decode for the poster JPG, parse
 *  duration + dimensions from ffmpeg's stderr — and that's it. Skips the
 *  full H.264 transcode entirely, so even 4K sources peak at ~50–80 MB RSS
 *  instead of the 1 GB+ that `optimizeUploadedVideoUrl` needs. Use this from
 *  the backfill script where the video URL is already final and we just
 *  need to enrich the row. Returns null on hard failure; partial success
 *  (e.g. poster ok but metadata empty) is still returned. */
export async function extractPosterAndMetadata(
  publicUrl: string,
): Promise<PosterAndMetadataResult | null> {
  const originalKey = getMediaObjectKeyFromPublicUrl(publicUrl);
  if (!originalKey) return null;
  if (!isFfmpegAvailable()) return null;

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "video-poster-"));
  const inputPath = path.join(tempDir, "input");
  const posterPath = path.join(tempDir, "poster.jpg");
  try {
    await downloadObjectToFile({ key: originalKey, destPath: inputPath });

    // First call: dump metadata only. `-f null - -t 0` makes ffmpeg parse the
    // header and exit immediately without decoding any frames. Stderr still
    // contains the Duration + Stream lines we want.
    let durationSec: number | null = null;
    let width: number | null = null;
    let height: number | null = null;
    try {
      const probeStderr = await runFfmpegCapture(["-i", inputPath, "-f", "null", "-t", "0", "-"]);
      const parsed = parseFfmpegMetadata(probeStderr);
      durationSec = parsed.durationSec;
      width = parsed.width;
      height = parsed.height;
    } catch (err) {
      // ffmpeg exits non-zero from `-f null - -t 0` on some inputs — fall back
      // to parsing whatever the encode call below prints.
      logger.warn(
        { err: err instanceof Error ? err.message : String(err), originalKey },
        "[VideoOptimization] metadata probe failed; will retry from poster pass stderr",
      );
    }

    // Second call: extract one frame. -ss before -i is the seek-via-keyframe
    // fast path; for clips shorter than 2 s we just grab frame 0.
    let posterUrl: string | null = null;
    try {
      const seekSec = durationSec != null && durationSec < 2 ? "0" : "1";
      const posterStderr = await runFfmpegCapture([
        "-y",
        "-ss",
        seekSec,
        "-i",
        inputPath,
        "-frames:v",
        "1",
        "-q:v",
        "4",
        "-vf",
        "scale='min(960,iw)':-2",
        posterPath,
      ]);
      // Fill in metadata if the probe didn't manage to.
      if (durationSec == null || width == null || height == null) {
        const parsed = parseFfmpegMetadata(posterStderr);
        durationSec = durationSec ?? parsed.durationSec;
        width = width ?? parsed.width;
        height = height ?? parsed.height;
      }
      const posterBuffer = await fs.readFile(posterPath);
      const posterKey = posterKeyFor(originalKey);
      await putObject({ key: posterKey, body: posterBuffer, contentType: "image/jpeg" });
      posterUrl = getPublicObjectUrl(posterKey);
    } catch (err) {
      logger.warn(
        { err: err instanceof Error ? err.message : String(err), originalKey },
        "[VideoOptimization] poster extraction failed",
      );
    }

    return { posterUrl, durationSec, width, height };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function optimizeUploadedVideoUrl(publicUrl: string): Promise<OptimizedVideoResult | null> {
  const originalKey = getMediaObjectKeyFromPublicUrl(publicUrl);
  if (!originalKey) return null;
  if (originalKey.endsWith(".opt.mp4")) return null;
  if (!isFfmpegAvailable()) return null;

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "video-opt-"));
  const inputPath = path.join(tempDir, "input");
  const outputPath = path.join(tempDir, "output.mp4");
  const posterPath = path.join(tempDir, "poster.jpg");
  try {
    // Stream straight to disk — buffering large (4K) videos in memory was
    // OOM'ing the Basic dyno (R14: 1 GB+ for a single 4K file).
    const { sizeBytes: sourceBytes } = await downloadObjectToFile({
      key: originalKey,
      destPath: inputPath,
    });

    const transcodeStderr = await runFfmpegCapture([
      "-y",
      // Cap decoder thread count so 4K HEVC sources don't buffer 16 reference
      // frames at full resolution (~24 MB each = ~384 MB just for the decoder).
      // 2 threads → 2-4 reference frames in flight → stays well under 512 MB.
      "-threads",
      "2",
      "-i",
      inputPath,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "30",
      "-movflags",
      "+faststart",
      "-vf",
      "scale='min(960,iw)':-2",
      "-r",
      "24",
      "-c:a",
      "aac",
      "-b:a",
      "96k",
      "-threads",
      "2",
      outputPath,
    ]);

    // Parse duration + intrinsic dimensions from the same ffmpeg run — no ffprobe needed.
    const { durationSec, width, height } = parseFfmpegMetadata(transcodeStderr);

    // Extract a poster JPG. Try a 1-second frame first; fall back to the very
    // first frame if the clip is shorter than 1 s.
    let posterUrl: string | null = null;
    try {
      const seekSec = durationSec != null && durationSec < 2 ? "0" : "1";
      await runFfmpeg([
        "-y",
        "-ss",
        seekSec,
        "-i",
        inputPath,
        "-frames:v",
        "1",
        "-q:v",
        "4",
        "-vf",
        "scale='min(960,iw)':-2",
        posterPath,
      ]);
      // Poster JPGs are tiny (~tens of KB) — buffering is fine here.
      const posterBuffer = await fs.readFile(posterPath);
      const posterKey = posterKeyFor(originalKey);
      await putObject({ key: posterKey, body: posterBuffer, contentType: "image/jpeg" });
      posterUrl = getPublicObjectUrl(posterKey);
    } catch (err) {
      logger.warn(
        { err: err instanceof Error ? err.message : String(err), originalKey },
        "[VideoOptimization] poster extraction failed",
      );
    }

    // stat the output instead of reading the whole file just to check its size.
    const optimizedStat = await fs.stat(outputPath);
    const optimizedBytes = optimizedStat.size;
    // If optimization didn't shrink the file, still keep the metadata we parsed
    // — the row should record duration/dims/poster even if we leave the original
    // .mp4 in place.
    if (optimizedBytes >= sourceBytes) {
      return {
        optimizedUrl: publicUrl,
        optimizedKey: originalKey,
        originalKey,
        bytesBefore: sourceBytes,
        bytesAfter: sourceBytes,
        posterUrl,
        durationSec,
        width,
        height,
      };
    }

    const optimizedKey = optimizedKeyFor(originalKey);
    // Stream the optimized file to R2 instead of loading it into memory.
    const fsNode = await import("fs");
    await putObject({
      key: optimizedKey,
      body: fsNode.createReadStream(outputPath),
      contentType: "video/mp4",
      size: optimizedBytes,
    });

    const optimizedUrl = getPublicObjectUrl(optimizedKey);
    return {
      optimizedUrl,
      optimizedKey,
      originalKey,
      bytesBefore: sourceBytes,
      bytesAfter: optimizedBytes,
      posterUrl,
      durationSec,
      width,
      height,
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function cleanupOriginalVideoObject(originalKey: string) {
  await deleteObject({ key: originalKey });
}
