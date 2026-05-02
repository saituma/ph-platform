#!/usr/bin/env node
/**
 * Sends a fake error event directly to Sentry using the DSN.
 * Verifies DSN is valid + alerts/email reach you, without needing a mobile build.
 *
 * Usage:
 *   pnpm sentry:smoke                                 # reads DSN from EAS env
 *   EXPO_PUBLIC_SENTRY_DSN="https://..." pnpm sentry:smoke
 *   pnpm sentry:smoke "https://abc@o123.ingest.us.sentry.io/456"
 */

import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};
const paint = (k, s) => `${c[k]}${s}${c.reset}`;

function getDsn() {
  if (process.argv[2]) return process.argv[2].trim();
  if (process.env.EXPO_PUBLIC_SENTRY_DSN) return process.env.EXPO_PUBLIC_SENTRY_DSN.trim();

  // Fall back to pulling it from EAS env (production)
  console.log(paint("dim", "→ Pulling DSN from EAS production env ..."));
  const r = spawnSync(
    "eas",
    ["env:list", "--environment", "production", "--format", "long", "--include-sensitive"],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    console.error(paint("red", "✗ Could not read EAS env. Pass DSN as the first arg."));
    process.exit(1);
  }
  // Find the block with Name "EXPO_PUBLIC_SENTRY_DSN" then capture the next "Value <...>"
  const blocks = r.stdout.split(/\n\s*———\s*\n|\n\n+/);
  for (const block of blocks) {
    if (/Name\s+EXPO_PUBLIC_SENTRY_DSN\b/.test(block)) {
      const v = block.match(/^\s*Value\s+(\S.*?)\s*$/m);
      if (v) return v[1].trim();
    }
  }
  // Fallback: short format `EXPO_PUBLIC_SENTRY_DSN=value`
  const flat = r.stdout.match(/EXPO_PUBLIC_SENTRY_DSN\s*=\s*(\S+)/);
  if (flat) return flat[1].trim();
  console.error(paint("red", "✗ EXPO_PUBLIC_SENTRY_DSN not found in EAS production env."));
  process.exit(1);
}

function parseDsn(dsn) {
  // https://<publicKey>@<host>/<projectId>
  const m = dsn.match(/^(https?):\/\/([^@]+)@([^/]+)\/(.+)$/);
  if (!m) throw new Error(`Invalid DSN: ${dsn}`);
  const [, scheme, publicKey, host, projectId] = m;
  return {
    scheme,
    publicKey,
    host,
    projectId: projectId.replace(/\/$/, ""),
    envelopeUrl: `${scheme}://${host}/api/${projectId.replace(/\/$/, "")}/envelope/`,
  };
}

function buildEvent({ kind, eventId, timestamp }) {
  const base = {
    event_id: eventId,
    timestamp,
    platform: "node",
    level: kind === "message" ? "info" : "error",
    server_name: "sentry-smoke-test",
    environment: process.env.SMOKE_ENV || "production",
    release: "smoke-test@1.0.0",
    tags: { source: "scripts/sentry-smoke.mjs", smoke: "true" },
    user: { email: "info@clientreach.ai" },
    sdk: { name: "sentry.javascript.smoke", version: "1.0.0" },
    breadcrumbs: [
      {
        type: "default",
        category: "smoke",
        level: "info",
        message: "smoke test started",
        timestamp,
      },
    ],
  };
  if (kind === "message") {
    return { ...base, message: { formatted: "[SMOKE TEST] hello from sentry-smoke.mjs" } };
  }
  return {
    ...base,
    exception: {
      values: [
        {
          type: `SmokeTestError_${Date.now()}`,
          value: `[SMOKE TEST ${new Date().toISOString()}] verifying DSN + email alerts work`,
          stacktrace: {
            frames: [
              {
                filename: "scripts/sentry-smoke.mjs",
                function: "sendSmokeEvent",
                lineno: 1,
                in_app: true,
              },
            ],
          },
          mechanism: { type: "generic", handled: false },
        },
      ],
    },
  };
}

function buildEnvelope(dsn, event) {
  const headers = {
    event_id: event.event_id,
    sent_at: new Date().toISOString(),
    dsn,
    sdk: event.sdk,
  };
  const itemHeader = { type: "event", content_type: "application/json" };
  return [JSON.stringify(headers), JSON.stringify(itemHeader), JSON.stringify(event)].join("\n");
}

async function sendEvent({ dsn, parsed, kind }) {
  const eventId = randomUUID().replace(/-/g, "");
  const timestamp = Math.floor(Date.now() / 1000);
  const event = buildEvent({ kind, eventId, timestamp });
  const envelope = buildEnvelope(dsn, event);

  const auth = [
    "sentry_version=7",
    `sentry_client=sentry-smoke/1.0.0`,
    `sentry_key=${parsed.publicKey}`,
  ].join(", ");

  process.stdout.write(`  ${kind.padEnd(10)} → ${paint("dim", `event_id ${eventId.slice(0, 8)}…`)} ... `);
  const res = await fetch(parsed.envelopeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-sentry-envelope",
      "X-Sentry-Auth": `Sentry ${auth}`,
    },
    body: envelope,
  });
  if (res.ok) {
    console.log(paint("green", `✓ ${res.status}`));
    return { ok: true, eventId };
  }
  const body = await res.text();
  console.log(paint("red", `✗ ${res.status} ${body.slice(0, 200)}`));
  return { ok: false, eventId, status: res.status, body };
}

async function main() {
  console.log(paint("bold", paint("cyan", "\n  Sentry DSN smoke test\n")));

  const dsn = getDsn();
  let parsed;
  try {
    parsed = parseDsn(dsn);
  } catch (e) {
    console.error(paint("red", `✗ ${e.message}`));
    process.exit(1);
  }

  console.log(paint("dim", `  host:       ${parsed.host}`));
  console.log(paint("dim", `  project:    ${parsed.projectId}`));
  console.log(paint("dim", `  endpoint:   ${parsed.envelopeUrl}\n`));

  const results = [];
  results.push(await sendEvent({ dsn, parsed, kind: "message" }));
  results.push(await sendEvent({ dsn, parsed, kind: "exception" }));

  const ok = results.every((r) => r.ok);
  console.log("");
  if (ok) {
    console.log(paint("green", "  ✓ All events accepted by Sentry."));
    console.log(paint("dim", "    Now check sentry.io → Issues. The two events should appear within ~10 seconds."));
    console.log(paint("dim", "    If your alert rule fires on 'every new issue', you'll get an email shortly after."));
  } else {
    console.log(paint("red", "  ✗ One or more events rejected. Check the response body above."));
    console.log(paint("yellow", "    Common causes: wrong DSN, project disabled, rate-limited, network blocked."));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(paint("red", `\n✗ ${e?.stack || e?.message || e}`));
  process.exit(1);
});
