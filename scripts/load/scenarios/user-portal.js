/**
 * User portal scenario — simulates an athlete browsing their assigned content.
 *
 * Covers:
 *   GET /api/programs/my-assigned
 *   GET /api/bookings
 *   GET /api/bookings/services
 *   GET /api/billing/status
 *   GET /api/auth/me
 *   GET /api/messages (if exposed)
 *
 * Run as standalone:
 *   k6 run scripts/load/scenarios/user-portal.js
 */
import http from "k6/http";
import { check } from "k6";
import {
  LOAD_OPTIONS,
  SMOKE_OPTIONS,
  API_URL,
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
} from "../config.js";
import { login, authHeaders, checkedGet, randomSleep, safeJson } from "../helpers.js";

const isSmoke = __ENV.SMOKE === "1";

export const options = {
  ...(isSmoke ? SMOKE_OPTIONS : LOAD_OPTIONS),
  thresholds: {
    "http_req_duration{scenario:default}": ["p(95)<800", "p(99)<2000"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  // ── Authenticate ──────────────────────────────────────────────────────────
  const { token } = login(TEST_USER_EMAIL, TEST_USER_PASSWORD);
  if (!token) return;

  const headers = { headers: authHeaders(token) };
  randomSleep(0.5, 1.0);

  // ── Profile ───────────────────────────────────────────────────────────────
  checkedGet(`${API_URL}/auth/me`, headers);
  randomSleep(0.5, 1.5);

  // ── Programs assigned to this athlete ─────────────────────────────────────
  const programsRes = checkedGet(`${API_URL}/programs/my-assigned`, headers);
  const programs = safeJson(programsRes);
  randomSleep(1.0, 2.5);

  // If we got at least one program, drill into it
  const programList = Array.isArray(programs) ? programs : programs.data || [];
  if (programList.length > 0) {
    const programId = programList[0].id || programList[0].programId;
    if (programId) {
      checkedGet(`${API_URL}/programs/my-assigned/${programId}`, headers);
      randomSleep(1.0, 2.0);
    }
  }

  // ── Bookings / Schedule ───────────────────────────────────────────────────
  checkedGet(`${API_URL}/bookings`, headers);
  randomSleep(0.8, 1.8);

  const servicesRes = http.get(`${API_URL}/bookings/services`, headers);
  check(servicesRes, { [`GET ${API_URL}/bookings/services → 200`]: (r) => r.status === 200 });
  randomSleep(0.5, 1.2);

  // availability requires serviceTypeId + from/to — fetch first service from the list above
  try {
    const services = JSON.parse(servicesRes.body || "{}").items || [];
    if (services.length > 0) {
      const serviceTypeId = services[0].id;
      const from = new Date().toISOString();
      const to = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const availRes = http.get(
        `${API_URL}/bookings/availability?serviceTypeId=${serviceTypeId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { ...headers, responseCallback: http.expectedStatuses(200, 400, 404) },
      );
      check(availRes, { "availability 200": (r) => r.status === 200 });
    }
  } catch (_) {
    // skip if services response was unparseable
  }
  randomSleep(0.5, 1.0);

  // ── Billing status ────────────────────────────────────────────────────────
  checkedGet(`${API_URL}/billing/status`, headers);
  randomSleep(0.5, 1.0);

  // ── Public plans (no auth required — tests caching layer) ────────────────
  const plansRes = http.get(`${API_URL}/billing/plans`);
  check(plansRes, { "public plans 200": (r) => r.status === 200 });
  randomSleep(0.5, 1.5);

  // ── Programs (general list) ───────────────────────────────────────────────
  checkedGet(`${API_URL}/programs`, headers);
  randomSleep(1.0, 2.5);

  // ── Active AI insight (may 404 if no insight exists — both OK) ────────────
  const insightRes = http.get(`${API_URL}/programs/active-insight`, { headers: authHeaders(token) });
  check(insightRes, {
    "insight 200 or 404": (r) => r.status === 200 || r.status === 404,
  });
  randomSleep(1.0, 3.0);
}
