// Quick FCM connectivity test — run with: node test-fcm.mjs
// A result of "invalid-registration-token" means FCM credentials are WORKING.
// Any auth/permission error means credentials are wrong.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));

// Load .env manually
try {
  const envFile = readFileSync(resolve(dir, ".env"), "utf8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // .env not found — use existing process.env
}

const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!raw?.trim()) {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT_JSON is not set.");
  process.exit(1);
}

let creds;
try {
  const value = raw.trim();
  const json = value.startsWith("{") ? value : Buffer.from(value, "base64").toString("utf8");
  creds = JSON.parse(json);
} catch {
  console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON — check it is valid JSON or base64 JSON.");
  process.exit(1);
}

if (!creds.project_id || !creds.client_email || !creds.private_key) {
  console.error("❌ Service account JSON is missing project_id, client_email, or private_key.");
  process.exit(1);
}

console.log(`✅ Credentials parsed — project: ${creds.project_id}, client: ${creds.client_email}`);
console.log("⏳ Sending test FCM message to a dummy token...\n");

const { default: admin } = await import("firebase-admin");

admin.initializeApp({ credential: admin.credential.cert(creds) });

try {
  await admin.messaging().send({
    token: "test-invalid-token-fcm-connectivity-check",
    notification: { title: "FCM Test", body: "This is a connectivity test." },
  });
  console.log("✅ FCM send succeeded (unexpected — token was dummy).");
} catch (err) {
  const code = err?.code ?? err?.errorInfo?.code ?? "";
  if (code === "messaging/invalid-registration-token" || code === "messaging/registration-token-not-registered") {
    console.log("✅ FCM IS WORKING — credentials are valid.");
    console.log(`   (Got expected error for dummy token: ${code})`);
  } else if (code.includes("auth") || code.includes("permission") || code.includes("credential") || code.includes("project")) {
    console.error("❌ FCM credentials error — check FIREBASE_SERVICE_ACCOUNT_JSON matches your Firebase project.");
    console.error(`   Error code: ${code}`);
    console.error(`   Message: ${err?.message}`);
  } else {
    console.error(`⚠️  Unexpected error: ${code}`);
    console.error(`   Message: ${err?.message}`);
  }
}
