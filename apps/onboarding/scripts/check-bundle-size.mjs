import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const BUDGET = {
  // Max size in KB for each type
  js: 350,
  css: 50,
  total: 500,
};

function getFileSizes(dir, ext) {
  let total = 0;
  try {
    const files = readdirSync(dir, { recursive: true });
    for (const file of files) {
      if (typeof file === "string" && file.endsWith(ext)) {
        const stat = statSync(join(dir, file));
        total += stat.size;
      }
    }
  } catch {
    // Directory might not exist
  }
  return total;
}

const outputDir = "dist";
const jsSize = getFileSizes(outputDir, ".js") / 1024;
const cssSize = getFileSizes(outputDir, ".css") / 1024;
const totalSize = jsSize + cssSize;

console.log(`\n📦 Bundle Size Report:`);
console.log(`   JS:    ${jsSize.toFixed(1)}KB / ${BUDGET.js}KB`);
console.log(`   CSS:   ${cssSize.toFixed(1)}KB / ${BUDGET.css}KB`);
console.log(`   Total: ${totalSize.toFixed(1)}KB / ${BUDGET.total}KB\n`);

let failed = false;

if (jsSize > BUDGET.js) {
  console.error(`❌ JS bundle exceeds budget: ${jsSize.toFixed(1)}KB > ${BUDGET.js}KB`);
  failed = true;
}
if (cssSize > BUDGET.css) {
  console.error(`❌ CSS bundle exceeds budget: ${cssSize.toFixed(1)}KB > ${BUDGET.css}KB`);
  failed = true;
}
if (totalSize > BUDGET.total) {
  console.error(`❌ Total bundle exceeds budget: ${totalSize.toFixed(1)}KB > ${BUDGET.total}KB`);
  failed = true;
}

if (failed) {
  console.error("\n💡 To fix: analyze the bundle with `pnpm build && npx vite-bundle-visualizer`\n");
  process.exit(1);
}

console.log("✅ All bundles within budget\n");
