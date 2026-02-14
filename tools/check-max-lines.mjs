#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = "apps";
const MAX_LINES = Number(process.env.MAX_LINES ?? 400);
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const EXCLUDED_DIRS = new Set(["node_modules", "dist", ".next", ".expo", "build"]);

function walk(dir) {
  const files = [];
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry)) continue;
      files.push(...walk(fullPath));
      continue;
    }
    if (EXTENSIONS.has(path.extname(fullPath))) {
      files.push(fullPath);
    }
  }
  return files;
}

const offenders = [];
for (const file of walk(ROOT)) {
  const content = readFileSync(file, "utf8");
  const lines = content ? content.split("\n").length : 0;
  if (lines > MAX_LINES) {
    offenders.push({ file, lines });
  }
}

offenders.sort((a, b) => b.lines - a.lines);

if (offenders.length === 0) {
  console.log(`OK: no source files above ${MAX_LINES} lines.`);
  process.exit(0);
}

console.log(`Found ${offenders.length} source files above ${MAX_LINES} lines:`);
for (const item of offenders) {
  console.log(`${item.lines}\t${item.file}`);
}
process.exit(1);
