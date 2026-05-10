/**
 * Admin portal scenario — simulates a coach/admin working in the dashboard.
 *
 * Covers:
 *   GET /api/admin/users
 *   GET /api/admin/teams
 *   GET /api/admin/programs
 *   GET /api/admin/bookings
 *   GET /api/admin/dashboard
 *   GET /api/admin/subscription-plans
 *   GET /api/admin/subscription-requests
 *   GET /api/admin/messages/threads
 *   GET /api/admin/adult-athletes
 *   GET /api/admin/training-snapshot
 *   GET /api/auth/me
 *
 * Run as standalone:
 *   k6 run scripts/load/scenarios/admin.js
 */
import http from "k6/http";
import { check } from "k6";
import {
  LOAD_OPTIONS,
  SMOKE_OPTIONS,
  API_URL,
  ADMIN_TEST_EMAIL,
  ADMIN_TEST_PASSWORD,
} from "../config.js";
import { login, authHeaders, checkedGet, randomSleep, safeJson } from "../helpers.js";

const isSmoke = __ENV.SMOKE === "1";

export const options = {
  ...(isSmoke ? SMOKE_OPTIONS : LOAD_OPTIONS),
  // Admin endpoints are heavier — slightly looser threshold
  thresholds: {
    "http_req_duration{scenario:default}": ["p(95)<1000", "p(99)<3000"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  // ── Authenticate ──────────────────────────────────────────────────────────
  const { token } = login(ADMIN_TEST_EMAIL, ADMIN_TEST_PASSWORD);
  if (!token) return;

  const hdrs = { headers: authHeaders(token) };
  randomSleep(0.3, 0.8);

  // ── Profile ───────────────────────────────────────────────────────────────
  checkedGet(`${API_URL}/auth/me`, hdrs);
  randomSleep(0.3, 0.7);

  // ── Dashboard overview ────────────────────────────────────────────────────
  checkedGet(`${API_URL}/admin/dashboard`, hdrs);
  randomSleep(0.5, 1.5);

  // ── User list ─────────────────────────────────────────────────────────────
  const usersRes = checkedGet(`${API_URL}/admin/users`, hdrs);
  const users = safeJson(usersRes);
  const userList = Array.isArray(users) ? users : users.data || users.users || [];
  randomSleep(0.8, 2.0);

  // Drill into first user if available
  if (userList.length > 0) {
    const userId = userList[0].id || userList[0].userId;
    if (userId) {
      const userRes = http.get(`${API_URL}/admin/users/${userId}`, hdrs);
      check(userRes, { "admin user detail 200": (r) => r.status === 200 });
      randomSleep(0.5, 1.0);
    }
  }

  // ── Teams ─────────────────────────────────────────────────────────────────
  checkedGet(`${API_URL}/admin/teams`, hdrs);
  randomSleep(0.5, 1.5);

  // ── Programs ──────────────────────────────────────────────────────────────
  checkedGet(`${API_URL}/admin/programs`, hdrs);
  randomSleep(0.5, 1.5);

  // ── Bookings ──────────────────────────────────────────────────────────────
  checkedGet(`${API_URL}/admin/bookings`, hdrs);
  randomSleep(0.5, 1.2);

  // ── Subscription plans ────────────────────────────────────────────────────
  checkedGet(`${API_URL}/admin/subscription-plans`, hdrs);
  randomSleep(0.5, 1.2);

  // ── Subscription requests ─────────────────────────────────────────────────
  checkedGet(`${API_URL}/admin/subscription-requests`, hdrs);
  randomSleep(0.5, 1.0);

  // ── Messages threads ──────────────────────────────────────────────────────
  checkedGet(`${API_URL}/admin/messages/threads`, hdrs);
  randomSleep(0.8, 2.0);

  // ── Adult athletes list ───────────────────────────────────────────────────
  const adultsRes = checkedGet(`${API_URL}/admin/adult-athletes`, hdrs);
  const adults = safeJson(adultsRes);
  const adultList = Array.isArray(adults) ? adults : adults.data || [];
  randomSleep(0.5, 1.5);

  // Drill into first adult athlete
  if (adultList.length > 0) {
    const athleteId = adultList[0].id || adultList[0].athleteId;
    if (athleteId) {
      const ares = http.get(`${API_URL}/admin/adult-athletes/${athleteId}`, hdrs);
      check(ares, { "adult athlete detail 200": (r) => r.status === 200 });
      randomSleep(0.5, 1.0);
    }
  }

  // ── Training snapshot ─────────────────────────────────────────────────────
  checkedGet(`${API_URL}/admin/training-snapshot`, hdrs);
  randomSleep(0.5, 1.2);

  // ── Admin profile ─────────────────────────────────────────────────────────
  checkedGet(`${API_URL}/admin/profile`, hdrs);
  randomSleep(1.0, 3.0);
}
