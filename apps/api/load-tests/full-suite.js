import http from "k6/http";
import { check, group, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

// ─── Config ────────────────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "";
const ADMIN_TOKEN = __ENV.ADMIN_TOKEN || AUTH_TOKEN;

// ─── Custom metrics ────────────────────────────────────────────────────────────
const rateLimited = new Counter("rate_limited_responses");
const serverErrors = new Counter("server_errors_5xx");
const authFailures = new Counter("auth_failures_401");
const dbLatency = new Trend("db_probe_latency", true);
const apiLatency = new Trend("api_endpoint_latency", true);
const errorRate = new Rate("error_rate");

// ─── Scenarios ─────────────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    // 1. Smoke: does everything even work?
    smoke: {
      executor: "constant-vus",
      vus: 1,
      duration: "30s",
      exec: "smokeTest",
      tags: { scenario: "smoke" },
    },
    // 2. Average load: typical traffic pattern
    average_load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 10 },
        { duration: "1m", target: 30 },
        { duration: "1m", target: 50 },
        { duration: "30s", target: 0 },
      ],
      exec: "userJourney",
      startTime: "35s",
      tags: { scenario: "average_load" },
    },
    // 3. Spike: sudden traffic surge
    spike: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 100 },
        { duration: "30s", target: 100 },
        { duration: "10s", target: 0 },
      ],
      exec: "userJourney",
      startTime: "3m40s",
      tags: { scenario: "spike" },
    },
    // 4. Soak: sustained load for memory leaks & connection pool exhaustion
    soak: {
      executor: "constant-vus",
      vus: 20,
      duration: "5m",
      exec: "userJourney",
      startTime: "4m35s",
      tags: { scenario: "soak" },
    },
    // 5. Rate-limit validation
    rate_limit_check: {
      executor: "per-vu-iterations",
      vus: 5,
      iterations: 100,
      exec: "rateLimitTest",
      startTime: "10m",
      tags: { scenario: "rate_limit" },
    },
  },

  thresholds: {
    // Global
    http_req_duration: ["p(95)<1000", "p(99)<2000"],
    http_req_failed: ["rate<0.05"],
    error_rate: ["rate<0.05"],

    // Per-endpoint
    "http_req_duration{endpoint:health}": ["p(95)<50"],
    "http_req_duration{endpoint:health_deep}": ["p(95)<200"],
    "http_req_duration{endpoint:auth_me}": ["p(95)<300"],
    "http_req_duration{endpoint:programs}": ["p(95)<500"],
    "http_req_duration{endpoint:bookings}": ["p(95)<500"],
    "http_req_duration{endpoint:notifications}": ["p(95)<400"],
    "http_req_duration{endpoint:messages_inbox}": ["p(95)<500"],
    "http_req_duration{endpoint:runs}": ["p(95)<500"],
    "http_req_duration{endpoint:nutrition}": ["p(95)<500"],
    "http_req_duration{endpoint:social_leaderboard}": ["p(95)<600"],
    "http_req_duration{endpoint:teams}": ["p(95)<500"],
    "http_req_duration{endpoint:content_home}": ["p(95)<400"],
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function apiGet(path, tag, token = AUTH_TOKEN) {
  const res = http.get(`${BASE_URL}/api/v1${path}`, {
    headers: authHeaders(token),
    tags: { endpoint: tag },
  });
  trackErrors(res);
  apiLatency.add(res.timings.duration);
  return res;
}

function apiPost(path, body, tag, token = AUTH_TOKEN) {
  const res = http.post(`${BASE_URL}/api/v1${path}`, JSON.stringify(body), {
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    tags: { endpoint: tag },
  });
  trackErrors(res);
  apiLatency.add(res.timings.duration);
  return res;
}

function trackErrors(res) {
  if (res.status === 429) rateLimited.add(1);
  if (res.status >= 500) serverErrors.add(1);
  if (res.status === 401) authFailures.add(1);
  errorRate.add(res.status >= 400 && res.status !== 429 ? 1 : 0);
}

// ─── Smoke Test ────────────────────────────────────────────────────────────────
export function smokeTest() {
  group("Health endpoints", () => {
    const health = http.get(`${BASE_URL}/health`, {
      tags: { endpoint: "health" },
    });
    check(health, {
      "GET /health → 200": (r) => r.status === 200,
      "health response has ok": (r) => {
        try { return JSON.parse(r.body).status === "ok"; } catch { return false; }
      },
    });

    const deep = http.get(`${BASE_URL}/api/v1/health/deep`, {
      tags: { endpoint: "health_deep" },
    });
    check(deep, {
      "GET /health/deep → 200": (r) => r.status === 200,
      "deep health db connected": (r) => {
        try { return JSON.parse(r.body).database === "connected"; } catch { return false; }
      },
    });
    dbLatency.add(deep.timings.duration);
  });

  group("Root & 404", () => {
    const root = http.get(`${BASE_URL}/`);
    check(root, { "GET / → 200": (r) => r.status === 200 });

    const notFound = http.get(`${BASE_URL}/api/v1/nonexistent-endpoint-xyz`);
    check(notFound, { "unknown route → 404": (r) => r.status === 404 });
  });

  group("Version", () => {
    const ver = http.get(`${BASE_URL}/api/v1/version`);
    check(ver, { "GET /version → 200": (r) => r.status === 200 });
  });

  group("Legacy API deprecation headers", () => {
    const legacy = http.get(`${BASE_URL}/api/health/deep`);
    check(legacy, {
      "legacy route returns deprecation header": (r) =>
        r.headers["X-Api-Deprecated"] !== undefined ||
        r.headers["x-api-deprecated"] !== undefined,
    });
  });

  group("Security headers", () => {
    const res = http.get(`${BASE_URL}/health`);
    check(res, {
      "has X-Content-Type-Options": (r) =>
        (r.headers["X-Content-Type-Options"] || r.headers["x-content-type-options"]) === "nosniff",
      "has X-Frame-Options or CSP": (r) =>
        !!(r.headers["X-Frame-Options"] || r.headers["x-frame-options"] ||
           r.headers["Content-Security-Policy"] || r.headers["content-security-policy"]),
    });
  });

  group("Content-Type enforcement", () => {
    const res = http.post(`${BASE_URL}/api/v1/auth/login`, "not-json", {
      headers: { "Content-Type": "text/plain" },
      tags: { endpoint: "content_type_check" },
    });
    check(res, {
      "non-JSON POST → 415": (r) => r.status === 415,
    });
  });

  sleep(1);
}

// ─── User Journey (authenticated) ─────────────────────────────────────────────
export function userJourney() {
  if (!AUTH_TOKEN) {
    smokeTest();
    return;
  }

  // Simulate a typical user session: open app → check profile → browse → interact

  group("1. Auth check", () => {
    const res = apiGet("/auth/me", "auth_me");
    check(res, {
      "auth/me → 200": (r) => r.status === 200,
      "has user data": (r) => {
        try { return !!JSON.parse(r.body).id; } catch { return false; }
      },
    });
  });

  group("2. Home content", () => {
    const res = apiGet("/content/home", "content_home");
    check(res, { "content/home → 2xx": (r) => r.status >= 200 && r.status < 300 });
  });

  group("3. Programs", () => {
    const res = apiGet("/programs", "programs");
    check(res, { "programs → 2xx": (r) => r.status >= 200 && r.status < 300 });
  });

  group("4. Notifications", () => {
    const res = apiGet("/notifications", "notifications");
    check(res, { "notifications → 2xx": (r) => r.status >= 200 && r.status < 300 });
  });

  group("5. Messages inbox", () => {
    const res = apiGet("/messages/inbox", "messages_inbox");
    check(res, { "messages/inbox → 2xx": (r) => r.status >= 200 && r.status < 300 });
  });

  group("6. Bookings", () => {
    const res = apiGet("/bookings", "bookings");
    check(res, { "bookings → 2xx": (r) => r.status >= 200 && r.status < 300 });
  });

  group("7. Runs history", () => {
    const res = apiGet("/runs", "runs");
    check(res, { "runs → 2xx": (r) => r.status >= 200 && r.status < 300 });
  });

  group("8. Nutrition", () => {
    const res = apiGet("/nutrition/targets", "nutrition");
    check(res, { "nutrition → 2xx": (r) => r.status >= 200 && r.status < 300 });
  });

  group("9. Social leaderboard", () => {
    const res = apiGet("/social/leaderboard", "social_leaderboard");
    check(res, { "leaderboard → 2xx": (r) => r.status >= 200 && r.status < 300 });
  });

  group("10. Portal config (public)", () => {
    const res = http.get(`${BASE_URL}/api/v1/portal-config`, {
      tags: { endpoint: "portal_config" },
    });
    check(res, { "portal-config → 2xx": (r) => r.status >= 200 && r.status < 300 });
  });

  sleep(1);
}

// ─── Rate Limit Validation ─────────────────────────────────────────────────────
export function rateLimitTest() {
  const res = http.get(`${BASE_URL}/api/v1/health/deep`, {
    tags: { endpoint: "rate_limit_probe" },
  });

  const limited = res.status === 429;
  if (limited) rateLimited.add(1);

  check(res, {
    "rate limit returns 429 or 200": (r) => r.status === 200 || r.status === 429,
    "429 has retryAfter": (r) => {
      if (r.status !== 429) return true;
      try { return JSON.parse(r.body).retryAfter > 0; } catch { return false; }
    },
    "has rate-limit headers": (r) =>
      !!(r.headers["X-Ratelimit-Limit"] || r.headers["x-ratelimit-limit"]),
  });
}

// ─── Summary handler ───────────────────────────────────────────────────────────
export function handleSummary(data) {
  const now = new Date().toISOString().replace(/[:.]/g, "-");
  return {
    stdout: textSummary(data),
    [`results/load-test-${now}.json`]: JSON.stringify(data, null, 2),
  };
}

function textSummary(data) {
  const lines = [
    "╔══════════════════════════════════════════════════════════════╗",
    "║              PH Performance — Load Test Summary             ║",
    "╚══════════════════════════════════════════════════════════════╝",
    "",
  ];

  const metrics = data.metrics || {};

  const fmt = (name, unit = "ms") => {
    const m = metrics[name];
    if (!m || !m.values) return "N/A";
    const v = m.values;
    return `avg=${v.avg?.toFixed(1)}${unit} p95=${v["p(95)"]?.toFixed(1)}${unit} p99=${v["p(99)"]?.toFixed(1)}${unit} max=${v.max?.toFixed(1)}${unit}`;
  };

  lines.push(`HTTP Duration:     ${fmt("http_req_duration")}`);
  lines.push(`DB Probe Latency:  ${fmt("db_probe_latency")}`);
  lines.push(`API Latency:       ${fmt("api_endpoint_latency")}`);
  lines.push("");

  const reqs = metrics.http_reqs?.values?.count ?? 0;
  const fails = metrics.http_req_failed?.values?.rate ?? 0;
  const rateHits = metrics.rate_limited_responses?.values?.count ?? 0;
  const svr5xx = metrics.server_errors_5xx?.values?.count ?? 0;
  const auth401 = metrics.auth_failures_401?.values?.count ?? 0;

  lines.push(`Total Requests:    ${reqs}`);
  lines.push(`Failure Rate:      ${(fails * 100).toFixed(2)}%`);
  lines.push(`Rate Limited:      ${rateHits}`);
  lines.push(`Server Errors:     ${svr5xx}`);
  lines.push(`Auth Failures:     ${auth401}`);
  lines.push("");

  // Threshold results
  const thresholds = data.root_group?.checks || [];
  const passed = Object.entries(metrics)
    .filter(([, v]) => v.thresholds)
    .reduce((acc, [, v]) => {
      Object.values(v.thresholds).forEach((t) => { if (t.ok) acc++; });
      return acc;
    }, 0);
  const total = Object.entries(metrics)
    .filter(([, v]) => v.thresholds)
    .reduce((acc, [, v]) => acc + Object.keys(v.thresholds).length, 0);

  lines.push(`Thresholds:        ${passed}/${total} passed`);
  lines.push("");

  // Prod readiness verdict
  const criticalFail = fails > 0.05 || svr5xx > 0;
  lines.push(criticalFail
    ? "⚠  VERDICT: NOT PRODUCTION READY — fix failures above"
    : "✓  VERDICT: Load test passed — review p95 latencies for your SLOs"
  );
  lines.push("");

  return lines.join("\n");
}
