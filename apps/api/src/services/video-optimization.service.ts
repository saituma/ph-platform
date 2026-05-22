import fs from "fs/promises";
import os from "os";
import path from "path";
import { spawn, spawnSync } from "child_process";

import {
  deleteObject,
  getMediaObjectKeyFromPublicUrl,
  getObjectBuffer,
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
    const source = await getObjectBuffer({ key: originalKey });
    await fs.writeFile(inputPath, source);

    const transcodeStderr = await runFfmpegCapture([
      "-y",
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

    const optimizedBuffer = await fs.readFile(outputPath);
    // If optimization didn't shrink the file, still keep the metadata we parsed
    // — the row should record duration/dims/poster even if we leave the original
    // .mp4 in place.
    if (optimizedBuffer.length >= source.length) {
      return {
        optimizedUrl: publicUrl,
        optimizedKey: originalKey,
        originalKey,
        bytesBefore: source.length,
        bytesAfter: source.length,
        posterUrl,
        durationSec,
        width,
        height,
      };
    }

    const optimizedKey = optimizedKeyFor(originalKey);
    await putObject({
      key: optimizedKey,
      body: optimizedBuffer,
      contentType: "video/mp4",
    });

    const optimizedUrl = getPublicObjectUrl(optimizedKey);
    return {
      optimizedUrl,
      optimizedKey,
      originalKey,
      bytesBefore: source.length,
      bytesAfter: optimizedBuffer.length,
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
