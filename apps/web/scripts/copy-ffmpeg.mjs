import { copyFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dest = join(root, "public", "ffmpeg");

// Search for @ffmpeg/core in local node_modules first, then workspace root
const candidates = [
  join(root, "node_modules", "@ffmpeg", "core", "dist", "umd"),
  join(root, "..", "..", "node_modules", "@ffmpeg", "core", "dist", "umd"),
];

const src = candidates.find((p) => existsSync(join(p, "ffmpeg-core.wasm")));
if (!src) {
  console.error("copy-ffmpeg: @ffmpeg/core not found — skipping");
  process.exit(0);
}

await mkdir(dest, { recursive: true });
await copyFile(join(src, "ffmpeg-core.js"), join(dest, "ffmpeg-core.js"));
await copyFile(join(src, "ffmpeg-core.wasm"), join(dest, "ffmpeg-core.wasm"));
console.log("copy-ffmpeg: copied to public/ffmpeg/");
