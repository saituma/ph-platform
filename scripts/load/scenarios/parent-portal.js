/**
 * Parent/guardian portal scenario.
 *
 * Covers:
 *   GET /api/auth/get-session
 *   GET /api/portal/me
 *   GET /api/portal/guardian/children
 *   GET /api/portal/guardian/children/:id  (first child if any)
 *   GET /api/portal/guardian/children/:id/attendance
 *   GET /api/portal/guardian/billing-status
 *   GET /api/portal/guardian/feedback
 *
 * Run as standalone:
 *   k6 run scripts/load/scenarios/parent-portal.js
 */
import http from "k6/http";
import { check } from "k6";
import {
  LOAD_OPTIONS,
  SMOKE_OPTIONS,
  API_URL,
  PARENT_TEST_EMAIL,
  PARENT_TEST_PASSWORD,
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
  const { token } = login(PARENT_TEST_EMAIL, PARENT_TEST_PASSWORD);
  if (!token) return;

  const hdrs = { headers: authHeaders(token) };
  randomSleep(0.3, 0.8);

  // ── Soft session check ────────────────────────────────────────────────────
  checkedGet(`${API_URL}/auth/get-session`, hdrs);
  randomSleep(0.3, 0.7);

  // ── Guardian profile ──────────────────────────────────────────────────────
  checkedGet(`${API_URL}/portal/me`, hdrs);
  randomSleep(0.5, 1.2);

  // ── Children list ─────────────────────────────────────────────────────────
  const childrenRes = checkedGet(`${API_URL}/portal/guardian/children`, hdrs);
  const children = safeJson(childrenRes);
  const childList = Array.isArray(children) ? children : children.data || [];
  randomSleep(0.8, 2.0);

  // Drill into first child if one exists
  if (childList.length > 0) {
    const childId = childList[0].id || childList[0].athleteId;
    if (childId) {
      // Child detail
      const detailRes = http.get(`${API_URL}/portal/guardian/children/${childId}`, hdrs);
      check(detailRes, {
        "child detail 200 or 403": (r) => r.status === 200 || r.status === 403,
      });
      randomSleep(0.5, 1.2);

      // Attendance
      const attRes = http.get(`${API_URL}/portal/guardian/children/${childId}/attendance`, hdrs);
      check(attRes, {
        "attendance 200 or 403": (r) => r.status === 200 || r.status === 403,
      });
      randomSleep(0.5, 1.0);
    }
  }

  // ── Billing status ────────────────────────────────────────────────────────
  checkedGet(`${API_URL}/portal/guardian/billing-status`, hdrs);
  randomSleep(0.5, 1.2);

  // ── Feedback threads ──────────────────────────────────────────────────────
  checkedGet(`${API_URL}/portal/guardian/feedback`, hdrs);
  randomSleep(1.0, 2.5);
}
