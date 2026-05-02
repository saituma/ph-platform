#!/usr/bin/env node
/**
 * Interactive TUI to add EAS environment variables / secrets.
 * Run: pnpm eas:secrets   (or: node scripts/eas-secrets.mjs)
 *
 * Lets you pick one, several, or all known mobile-app secrets,
 * prompts for values + visibility + environments, then calls `eas env:create`.
 */

import readline from "node:readline";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};
const paint = (color, s) => `${c[color]}${s}${c.reset}`;

/**
 * Catalog of known mobile-app env vars. Add new entries here as the app grows.
 * - public:      `EXPO_PUBLIC_*` baked into the JS bundle (clients can read)
 * - sensitive:   hidden in EAS dashboard but still shipped to clients
 * - secret:      build-server only, never sent to device
 */
const CATALOG = [
  {
    key: "EXPO_PUBLIC_API_BASE_URL",
    desc: "Backend API base URL",
    defaultVisibility: "plaintext",
    example: "https://ph-platform.onrender.com/api",
    public: true,
  },
  {
    key: "EXPO_PUBLIC_AUTH_BASE_URL",
    desc: "Auth service base URL (optional)",
    defaultVisibility: "plaintext",
    example: "https://auth.example.com",
    public: true,
  },
  {
    key: "EXPO_PUBLIC_SENTRY_DSN",
    desc: "Sentry DSN for crash + error reporting",
    defaultVisibility: "sensitive",
    example: "https://abc123@o12345.ingest.sentry.io/67890",
    public: true,
  },
  {
    key: "SENTRY_AUTH_TOKEN",
    desc: "Sentry auth token (source-map upload at build time)",
    defaultVisibility: "secret",
    example: "sntrys_xxxxxxxxxxxxxxxxx",
    public: false,
  },
  {
    key: "EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY",
    desc: "iOS Google Maps API key (if using PROVIDER_GOOGLE)",
    defaultVisibility: "sensitive",
    example: "AIzaSy...",
    public: true,
  },
  {
    key: "EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY",
    desc: "Android Google Maps API key",
    defaultVisibility: "sensitive",
    example: "AIzaSy...",
    public: true,
  },
  {
    key: "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    desc: "Stripe publishable key (pk_live_... or pk_test_...)",
    defaultVisibility: "sensitive",
    example: "pk_live_...",
    public: true,
  },
  {
    key: "EXPO_PUBLIC_POSTHOG_KEY",
    desc: "PostHog project API key (analytics)",
    defaultVisibility: "sensitive",
    example: "phc_...",
    public: true,
  },
  {
    key: "EXPO_PUBLIC_REVENUECAT_IOS_KEY",
    desc: "RevenueCat iOS public SDK key",
    defaultVisibility: "sensitive",
    example: "appl_...",
    public: true,
  },
  {
    key: "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY",
    desc: "RevenueCat Android public SDK key",
    defaultVisibility: "sensitive",
    example: "goog_...",
    public: true,
  },
  {
    key: "EXPO_PUBLIC_STARTUP_SELF_TEST",
    desc: "Enable startup self-test alerts (true/false)",
    defaultVisibility: "plaintext",
    example: "true",
    public: true,
  },
];

const ENVIRONMENTS = ["development", "preview", "production"];
const VISIBILITIES = ["plaintext", "sensitive", "secret"];

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, (a) => res(a.trim())));

function header(title) {
  const bar = "─".repeat(Math.max(0, 60 - title.length));
  console.log(`\n${paint("cyan", "┌─ ")}${paint("bold", title)} ${paint("cyan", bar)}`);
}

function checkEasInstalled() {
  const r = spawnSync("eas", ["--version"], { encoding: "utf8" });
  if (r.status !== 0) {
    console.error(paint("red", "✗ EAS CLI not found. Install with: npm i -g eas-cli"));
    process.exit(1);
  }
  console.log(paint("dim", `eas-cli ${r.stdout.trim()}`));
}

function parseSelection(input, max) {
  if (!input) return [];
  if (input.toLowerCase() === "all") return Array.from({ length: max }, (_, i) => i);
  const out = new Set();
  for (const part of input.split(/[,\s]+/).filter(Boolean)) {
    if (part.includes("-")) {
      const [a, b] = part.split("-").map((n) => parseInt(n, 10));
      if (Number.isFinite(a) && Number.isFinite(b)) {
        for (let i = Math.min(a, b); i <= Math.max(a, b); i++) {
          if (i >= 1 && i <= max) out.add(i - 1);
        }
      }
    } else {
      const n = parseInt(part, 10);
      if (Number.isFinite(n) && n >= 1 && n <= max) out.add(n - 1);
    }
  }
  return [...out].sort((a, b) => a - b);
}

async function pickVars() {
  header("Pick which secrets to add");
  CATALOG.forEach((v, i) => {
    const tag = v.public ? paint("yellow", "[public]") : paint("magenta", "[server]");
    console.log(`  ${paint("bold", String(i + 1).padStart(2))}. ${tag} ${paint("cyan", v.key)}`);
    console.log(`      ${paint("dim", v.desc)}`);
  });
  console.log(`\n  ${paint("dim", "Enter numbers (e.g. 1,3,5 or 1-4) — or 'all' — or blank to add a custom one.")}`);
  const sel = await ask(paint("green", "› "));
  if (!sel) return [{ custom: true }];
  const idxs = parseSelection(sel, CATALOG.length);
  if (idxs.length === 0) {
    console.log(paint("red", "Nothing selected."));
    return [];
  }
  return idxs.map((i) => CATALOG[i]);
}

async function pickVisibility(defaultVis) {
  header(`Visibility (default: ${defaultVis})`);
  VISIBILITIES.forEach((v, i) => {
    const note =
      v === "plaintext"
        ? "visible to all collaborators"
        : v === "sensitive"
          ? "hidden in dashboard, still in JS bundle"
          : "server-only, never sent to device";
    console.log(`  ${paint("bold", String(i + 1))}. ${paint("cyan", v.padEnd(10))} ${paint("dim", note)}`);
  });
  const a = await ask(paint("green", `› [enter=${defaultVis}] `));
  if (!a) return defaultVis;
  const n = parseInt(a, 10);
  if (Number.isFinite(n) && n >= 1 && n <= VISIBILITIES.length) return VISIBILITIES[n - 1];
  if (VISIBILITIES.includes(a)) return a;
  return defaultVis;
}

async function pickEnvironments() {
  header("Environments");
  ENVIRONMENTS.forEach((e, i) => console.log(`  ${paint("bold", String(i + 1))}. ${e}`));
  console.log(`  ${paint("dim", "Enter numbers (1,2,3) or 'all'. Default: all.")}`);
  const a = await ask(paint("green", "› "));
  if (!a || a.toLowerCase() === "all") return ENVIRONMENTS;
  const idxs = parseSelection(a, ENVIRONMENTS.length);
  return idxs.length ? idxs.map((i) => ENVIRONMENTS[i]) : ENVIRONMENTS;
}

function runEasCmd(cmd, extraArgs) {
  return new Promise((resolve) => {
    const ps = spawn("eas", [cmd, ...extraArgs, "--non-interactive"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "", err = "";
    ps.stdout.on("data", (d) => (out += d));
    ps.stderr.on("data", (d) => (err += d));
    ps.on("close", (code) => resolve({ code, out, err }));
  });
}

async function runEasCreate({ name, value, visibility, environment }) {
  const createArgs = [
    "--name", name, "--value", value,
    "--visibility", visibility, "--environment", environment,
  ];
  const r = await runEasCmd("env:create", createArgs);
  if (r.code === 0) return r;

  const updateArgs = [
    "--variable-name", name, "--variable-environment", environment,
    "--value", value, "--visibility", visibility,
    "--environment", environment,
  ];
  const u = await runEasCmd("env:update", updateArgs);
  if (u.code === 0) return { ...u, updated: true };
  return r;
}

async function main() {
  console.clear();
  console.log(paint("bold", paint("cyan", "  EAS Secrets — PH Performance mobile")));
  console.log(paint("dim", "  Adds env vars to EAS so nothing is hardcoded in the repo.\n"));

  checkEasInstalled();

  const picks = await pickVars();
  if (picks.length === 0) {
    rl.close();
    return;
  }

  const tasks = [];

  for (const pick of picks) {
    let entry = pick;
    if (pick.custom) {
      header("Custom variable");
      const key = await ask(paint("green", "Name (e.g. EXPO_PUBLIC_FOO): "));
      if (!key) continue;
      entry = { key, desc: "custom", defaultVisibility: "sensitive", example: "" };
    }

    header(`${entry.key}`);
    if (entry.desc) console.log(paint("dim", `  ${entry.desc}`));
    if (entry.example) console.log(paint("dim", `  example: ${entry.example}`));

    const value = await ask(paint("green", "Value: "));
    if (!value) {
      console.log(paint("yellow", "  (skipped — empty value)"));
      continue;
    }

    const visibility = await pickVisibility(entry.defaultVisibility);
    const environments = await pickEnvironments();

    for (const environment of environments) {
      tasks.push({ name: entry.key, value, visibility, environment });
    }
  }

  if (tasks.length === 0) {
    console.log(paint("yellow", "\nNothing to do."));
    rl.close();
    return;
  }

  header("Plan");
  for (const t of tasks) {
    const masked = t.visibility === "secret" ? "•••••" : t.value.length > 40 ? t.value.slice(0, 37) + "..." : t.value;
    console.log(
      `  + ${paint("cyan", t.name.padEnd(38))} ${paint("yellow", t.visibility.padEnd(10))} ${paint("magenta", t.environment.padEnd(12))} ${paint("dim", masked)}`,
    );
  }
  const ok = (await ask(paint("green", "\nApply? [y/N] "))).toLowerCase();
  if (ok !== "y" && ok !== "yes") {
    console.log(paint("yellow", "Cancelled."));
    rl.close();
    return;
  }

  header("Applying");
  let okCount = 0;
  for (const t of tasks) {
    process.stdout.write(`  ${t.name} → ${t.environment} ... `);
    const r = await runEasCreate(t);
    if (r.code === 0) {
      console.log(paint("green", r.updated ? "✓ (updated)" : "✓"));
      okCount++;
    } else {
      const reason = (r.err || r.out).trim().split("\n").slice(-3).join(" | ");
      console.log(paint("red", `✗  ${reason}`));
    }
  }

  console.log(`\n${paint("bold", `Done. ${okCount}/${tasks.length} created.`)}`);
  console.log(paint("dim", "Verify with: eas env:list --environment production"));
  rl.close();
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((e) => {
    console.error(paint("red", `\n✗ ${e.message}`));
    process.exit(1);
  });
}
