#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("fs");
const path = require("path");

const DEFAULT_EXTS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".cjs",
  ".mjs",
  ".json",
  ".yml",
  ".yaml",
  ".env",
  ".gradle",
  ".properties",
  ".xml",
]);

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".expo",
  ".next",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".parcel-cache",
  ".cache",
  "android/build",
]);

const IGNORE_FILES = new Set([
  path.normalize("scripts/scan_codebase.cjs"),
  path.normalize("scripts/validate_notifications.cjs"),
  path.normalize("scan_report.json"),
]);

function isBinary(buf) {
  const sample = buf.subarray(0, Math.min(buf.length, 8000));
  let suspicious = 0;
  for (const byte of sample) {
    if (byte === 0) return true;
    if (byte < 9 || (byte > 13 && byte < 32)) suspicious++;
  }
  return suspicious / sample.length > 0.2;
}

function walk(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      // skip ignored dirs (match by segment)
      if ([...IGNORE_DIRS].some((d) => full.includes(path.sep + d + path.sep) || full.endsWith(path.sep + d))) continue;
      out.push(...walk(full));
    } else if (ent.isFile()) {
      const rel = path.normalize(path.relative(process.cwd(), full));
      if (/^scan_report.*\.json$/i.test(path.basename(rel))) continue;
      if (IGNORE_FILES.has(rel)) continue;
      const ext = path.extname(ent.name);
      if (DEFAULT_EXTS.has(ext) || ent.name === ".env" || ent.name.endsWith(".env.local")) {
        out.push(full);
      }
    }
  }
  return out;
}

function countLineAndCol(text, index) {
  let line = 1;
  let lastNewline = -1;
  for (let i = 0; i < index; i++) {
    if (text.charCodeAt(i) === 10) {
      line++;
      lastNewline = i;
    }
  }
  const col = index - lastNewline;
  return { line, col };
}

function maskSecret(value) {
  if (!value) return value;
  const s = String(value);
  if (s.length <= 8) return "***";
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

function snippetAt(text, index, len = 120) {
  const start = Math.max(0, index - Math.floor(len / 2));
  const end = Math.min(text.length, start + len);
  return text.slice(start, end).replace(/\r/g, "").replace(/\n/g, "\\n");
}

const RULES = [
  {
    id: "private_key",
    severity: "CRITICAL",
    regex: /-----BEGIN (?:RSA |EC |)PRIVATE KEY-----/g,
    message: "Private key material in repo",
    mask: false,
  },
  {
    id: "google_api_key",
    severity: "HIGH",
    regex: /\bAIza[0-9A-Za-z\-_]{20,}\b/g,
    message: "Potential Google API key",
    mask: true,
  },
  {
    id: "stripe_secret_key",
    severity: "CRITICAL",
    regex: /\bsk_(?:live|test)_[0-9a-zA-Z]{10,}\b/g,
    message: "Stripe secret key in code",
    mask: true,
  },
  {
    id: "stripe_publishable_key",
    severity: "MEDIUM",
    regex: /\bpk_(?:live|test)_[0-9a-zA-Z]{10,}\b/g,
    message: "Stripe publishable key hardcoded",
    mask: true,
  },
  {
    id: "slack_token",
    severity: "CRITICAL",
    regex: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/g,
    message: "Slack token in code",
    mask: true,
  },
  {
    id: "jwt_like",
    severity: "HIGH",
    regex: /\beyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\b/g,
    message: "JWT-like token literal found",
    mask: true,
  },
  {
    id: "insecure_eval",
    severity: "HIGH",
    regex: /\beval\s*\(/g,
    message: "eval() usage",
    mask: false,
  },
  {
    id: "new_function",
    severity: "HIGH",
    regex: /\bnew\s+Function\s*\(/g,
    message: "new Function() usage",
    mask: false,
  },
  {
    id: "json_with_process_env",
    severity: "HIGH",
    regex: /process\.env\./g,
    message: "process.env used inside a JSON file (invalid JSON)",
    mask: false,
    fileFilter: (p) => path.extname(p) === ".json",
  },
  {
    id: "map_without_optional_chaining",
    severity: "HIGH",
    // crude heuristic: ".map(" not preceded by "?"
    regex: /\.map\s*\(/g,
    message: "Possible crash: .map() without optional chaining",
    mask: false,
    post: (matchIndex, text) => {
      const prev = text[matchIndex - 1];
      return prev !== "?";
    },
  },
  {
    id: "api_call_without_catch",
    severity: "MEDIUM",
    // heuristic: apiRequest(...) without nearby try/catch in same function is too hard; just flag direct void apiRequest(
    regex: /\bapiRequest\s*\(/g,
    message: "API call site (review try/catch / error handling)",
    mask: false,
  },
];

function scanFile(filePath, root) {
  const findings = [];
  let buf;
  try {
    buf = fs.readFileSync(filePath);
  } catch {
    return findings;
  }
  if (isBinary(buf)) return findings;

  const text = buf.toString("utf8");

  for (const rule of RULES) {
    if (rule.fileFilter && !rule.fileFilter(filePath)) continue;

    rule.regex.lastIndex = 0;
    let m;
    while ((m = rule.regex.exec(text)) !== null) {
      const idx = m.index;
      if (typeof rule.post === "function" && !rule.post(idx, text)) continue;

      const { line, col } = countLineAndCol(text, idx);
      const raw = m[0];
      const value = rule.mask ? maskSecret(raw) : raw;
      const relative = path.relative(root, filePath);

      findings.push({
        severity: rule.severity,
        ruleId: rule.id,
        message: rule.message,
        file: relative,
        line,
        col,
        match: value,
        snippet: snippetAt(text, idx),
      });

      // prevent infinite loops on zero-length matches
      if (m.index === rule.regex.lastIndex) rule.regex.lastIndex++;
    }
  }

  return findings;
}

function main() {
  const target = process.argv[2] || ".";
  const root = path.resolve(process.cwd(), target);

  if (!fs.existsSync(root)) {
    console.error(JSON.stringify({ error: `Path not found: ${root}` }));
    process.exit(2);
  }

  const stat = fs.statSync(root);
  const startDir = stat.isDirectory() ? root : path.dirname(root);

  const files = walk(startDir);
  const all = [];
  for (const f of files) {
    // If a file was provided explicitly, only scan that file.
    if (!stat.isDirectory() && path.resolve(f) !== path.resolve(root)) continue;
    all.push(...scanFile(f, path.resolve(process.cwd())));
  }

  // Sort: severity then file+line
  const severityRank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  all.sort((a, b) => {
    const sa = severityRank[a.severity] ?? 9;
    const sb = severityRank[b.severity] ?? 9;
    if (sa !== sb) return sa - sb;
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    return a.line - b.line;
  });

  const report = {
    scannedRoot: path.relative(path.resolve(process.cwd()), startDir) || ".",
    fileCount: files.length,
    findingCount: all.length,
    findings: all,
  };

  const outPath = path.resolve(process.cwd(), "scan_report.json");
  try {
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  } catch {
    // ignore write errors
  }

  console.log(JSON.stringify(report, null, 2));

  const criticalCount = all.filter((f) => f.severity === "CRITICAL").length;
  if (criticalCount > 0) process.exitCode = 1;
}

main();
