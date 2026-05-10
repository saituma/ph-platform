/**
 * Auth scenario — login, session check, token refresh, logout.
 *
 * Run as standalone (smoke):
 *   k6 run --vus 2 --duration 30s scripts/load/scenarios/auth.js
 *
 * Run as load test:
 *   k6 run scripts/load/scenarios/auth.js
 */
import http from "k6/http";
import { check } from "k6";
import { LOAD_OPTIONS, SMOKE_OPTIONS, API_URL, TEST_USER_EMAIL, TEST_USER_PASSWORD } from "../config.js";
import { login, authHeaders, checkedGet, randomSleep } from "../helpers.js";

const isSmoke = __ENV.SMOKE === "1";

export const options = {
  ...(isSmoke ? SMOKE_OPTIONS : LOAD_OPTIONS),
  // Auth endpoints are latency-critical — tighten threshold vs default
  thresholds: {
    "http_req_duration{scenario:default}": ["p(95)<500", "p(99)<1000"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  // ── Step 1: Login ─────────────────────────────────────────────────────────
  const { token } = login(TEST_USER_EMAIL, TEST_USER_PASSWORD);
  randomSleep(0.2, 0.5);

  if (!token) {
    // If login failed (e.g., test user not seeded) skip the rest of this VU iteration
    // so we don't pollute metrics with cascading 401s.
    return;
  }

  const headers = { headers: authHeaders(token) };

  // ── Step 2: GET /auth/me ──────────────────────────────────────────────────
  checkedGet(`${API_URL}/auth/me`, headers);
  randomSleep(0.3, 0.8);

  // ── Step 3: GET /auth/get-session ─────────────────────────────────────────
  // This endpoint is soft — returns 200 + null session rather than 401.
  checkedGet(`${API_URL}/auth/get-session`, headers);
  randomSleep(0.2, 0.6);

  // ── Step 4: GET /auth/session (alias) ─────────────────────────────────────
  checkedGet(`${API_URL}/auth/session`, headers);
  randomSleep(0.2, 0.5);

  // ── Step 5: POST /auth/refresh ────────────────────────────────────────────
  // This API uses short-lived JWTs without refresh tokens — returns 400 by design.
  // Pass responseCallback so k6 does not count 400 as a failed request.
  const refreshRes = http.post(`${API_URL}/auth/refresh`, null, {
    ...headers,
    responseCallback: http.expectedStatuses(400),
  });
  check(refreshRes, {
    "refresh endpoint reachable": (r) => r.status === 400,
  });
  randomSleep(0.3, 1.0);

  // ── Step 6: GET /app/token-status ─────────────────────────────────────────
  // Checks whether the httpOnly cookie holds a valid JWT.
  checkedGet(`${API_URL}/app/token-status`);
  randomSleep(0.2, 0.5);

  // ── Step 7: POST /app/clear-token (logout) ────────────────────────────────
  const logoutRes = http.post(`${API_URL}/app/clear-token`, null, headers);
  check(logoutRes, { "logout 200": (r) => r.status === 200 });
  randomSleep(0.5, 1.5);
}
