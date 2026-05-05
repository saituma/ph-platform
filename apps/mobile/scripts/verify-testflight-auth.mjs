#!/usr/bin/env node
/* eslint-disable no-console */

const DEFAULT_API_BASE_URL = "https://ph-performance-2cae29f7922d.herokuapp.com/api";

function trimTrailingSlash(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function normalizeApiBase(value) {
  const raw = trimTrailingSlash(value);
  if (!raw) return "";
  return /\/api$/i.test(raw) ? raw : `${raw}/api`;
}

function normalizeAuthBase(value) {
  const raw = trimTrailingSlash(value);
  if (!raw) return "";
  return raw.replace(/\/api$/i, "");
}

function sameOrigin(a, b) {
  if (!a || !b) return false;
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    return ua.origin.toLowerCase() === ub.origin.toLowerCase();
  } catch {
    return false;
  }
}

async function checkUrl(url, { method = "GET", body, headers } = {}) {
  try {
    const res = await fetch(url, { method, body, headers });
    const text = await res.text();
    return { ok: true, status: res.status, body: text.slice(0, 300) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function printBlock(title) {
  console.log(`\n=== ${title} ===`);
}

async function main() {
  const envApiRaw = process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
  const envAuthRaw = process.env.EXPO_PUBLIC_AUTH_BASE_URL || "";

  const apiBase = normalizeApiBase(envApiRaw);
  const apiOrigin = apiBase.replace(/\/api$/i, "");
  const authBase = normalizeAuthBase(envAuthRaw);
  const willUseExpressFallback = authBase && sameOrigin(authBase, apiOrigin);

  printBlock("Resolved Config");
  console.log(`EXPO_PUBLIC_API_BASE_URL(raw):  ${envApiRaw || "(empty)"}`);
  console.log(`EXPO_PUBLIC_AUTH_BASE_URL(raw): ${envAuthRaw || "(empty)"}`);
  console.log(`API base (normalized):          ${apiBase || "(empty)"}`);
  console.log(`Auth base (normalized):         ${authBase || "(empty -> Express fallback)"}`);

  let hasFailure = false;

  if (!apiBase) {
    hasFailure = true;
    console.error("FAIL: API base is empty.");
  }

  if (willUseExpressFallback) {
    console.log("WARN: Auth base and API base share same origin. App will fallback to Express login.");
  }

  printBlock("Reachability Checks");

  const health = await checkUrl(`${apiBase}/health`);
  if (!health.ok) {
    hasFailure = true;
    console.error(`FAIL: ${apiBase}/health unreachable: ${health.error}`);
  } else {
    console.log(`OK:   GET ${apiBase}/health -> HTTP ${health.status}`);
  }

  const expressLogin = await checkUrl(`${apiBase}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "probe@example.com", password: "probe" }),
  });
  if (!expressLogin.ok) {
    hasFailure = true;
    console.error(`FAIL: POST ${apiBase}/auth/login unreachable: ${expressLogin.error}`);
  } else {
    console.log(`OK:   POST ${apiBase}/auth/login -> HTTP ${expressLogin.status}`);
  }

  if (authBase && !willUseExpressFallback) {
    const workerSignIn = await checkUrl(`${authBase}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "probe@example.com", password: "probe" }),
    });
    if (!workerSignIn.ok) {
      console.error(`FAIL: POST ${authBase}/api/auth/sign-in/email unreachable: ${workerSignIn.error}`);
      hasFailure = true;
    } else {
      const looksMissing = workerSignIn.status === 404 || /not found/i.test(workerSignIn.body || "");
      if (looksMissing) {
        console.error(`FAIL: Worker sign-in endpoint missing (HTTP ${workerSignIn.status}).`);
        hasFailure = true;
      } else {
        console.log(`OK:   POST ${authBase}/api/auth/sign-in/email -> HTTP ${workerSignIn.status}`);
      }
    }
  } else if (willUseExpressFallback) {
    console.log("OK:   Auth base equals API origin -> app fallback to Express /auth/login is expected.");
  } else {
    console.log("OK:   Auth base unset -> app will use Express /auth/login flow.");
  }

  printBlock("Result");
  if (hasFailure) {
    console.error("FAIL: TestFlight auth/API preflight failed. Do not build yet.");
    process.exit(1);
  }
  console.log("PASS: TestFlight auth/API preflight looks valid.");
}

void main();
