import fs from "fs/promises";
import os from "os";
import path from "path";
import { spawn, spawnSync } from "child_process";

import { deleteObject, getMediaObjectKeyFromPublicUrl, getObjectBuffer, getPublicObjectUrl, putObject } from "./s3.service";
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

function runFfmpeg(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) return resolve();
      reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-400)}`));
    });
  });
}

function optimizedKeyFor(originalKey: string) {
  const ext = path.extname(originalKey).toLowerCase();
  const base = ext ? originalKey.slice(0, -ext.length) : originalKey;
  return `${base}.opt.mp4`;
}

export async function optimizeUploadedVideoUrl(publicUrl: string) {
  const originalKey = getMediaObjectKeyFromPublicUrl(publicUrl);
  if (!originalKey) return null;
  if (originalKey.endsWith(".opt.mp4")) return null;
  if (!isFfmpegAvailable()) return null;

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "video-opt-"));
  const inputPath = path.join(tempDir, "input");
  const outputPath = path.join(tempDir, "output.mp4");
  try {
    const source = await getObjectBuffer({ key: originalKey });
    await fs.writeFile(inputPath, source);

    await runFfmpeg([
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

    const optimizedBuffer = await fs.readFile(outputPath);
    // Skip churn when optimization does not actually shrink bytes.
    if (optimizedBuffer.length >= source.length) {
      return null;
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
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function cleanupOriginalVideoObject(originalKey: string) {
  await deleteObject({ key: originalKey });
}
