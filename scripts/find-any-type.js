const ts = require("typescript");
const fs = require("fs");
const path = require("path");

const ROOT = process.argv[2] || ".";
const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
]);

let totalAnyCount = 0;
let scannedFileCount = 0;
let matchedFileCount = 0;

function scriptKindForFile(filePath) {
  if (filePath.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (filePath.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (filePath.endsWith(".js")) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function shouldScanFile(fullPath) {
  return (
    fullPath.endsWith(".ts") ||
    fullPath.endsWith(".tsx") ||
    fullPath.endsWith(".cts") ||
    fullPath.endsWith(".mts")
  );
}

function scanFile(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKindForFile(filePath)
  );

  scannedFileCount += 1;
  let fileAnyCount = 0;

  function visit(node) {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(
        node.getStart()
      );
      console.log(`${filePath}:${line + 1}:${character + 1} -> any`);
      fileAnyCount += 1;
      totalAnyCount += 1;
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  if (fileAnyCount > 0) matchedFileCount += 1;
}

function walk(targetPath) {
  const stat = fs.statSync(targetPath);

  if (stat.isFile()) {
    if (shouldScanFile(targetPath)) scanFile(targetPath);
    return;
  }

  for (const entry of fs.readdirSync(targetPath)) {
    const full = path.join(targetPath, entry);
    const entryStat = fs.statSync(full);

    if (entryStat.isDirectory()) {
      if (IGNORE_DIRS.has(entry)) continue;
      walk(full);
    } else if (shouldScanFile(full)) {
      scanFile(full);
    }
  }
}

walk(ROOT);

console.error(
  `Scanned ${scannedFileCount} file(s), found ${totalAnyCount} explicit any usage(s) in ${matchedFileCount} file(s).`
);
