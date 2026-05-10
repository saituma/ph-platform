/**
 * Full load test suite — runs all scenarios in parallel with staggered start times.
 *
 * Usage:
 *   k6 run scripts/load/suite.js
 *   k6 run -e BASE_URL=https://api.staging.phperformance.com scripts/load/suite.js
 *
 * Each scenario is isolated: auth VUs, portal VUs, and admin VUs run concurrently
 * so the test reflects realistic mixed traffic rather than sequential phases.
 */
import { authHeaders, login, checkedGet, randomSleep, safeJson } from "./helpers.js";
import {
  API_URL,
  BASE_URL,
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
  PARENT_TEST_EMAIL,
  PARENT_TEST_PASSWORD,
  ADMIN_TEST_EMAIL,
  ADMIN_TEST_PASSWORD,
} from "./config.js";
import http from "k6/http";
import { check, sleep } from "k6";

// ── Scenario options ──────────────────────────────────────────────────────────

export const options = {
  scenarios: {
    // Auth endpoints — highest priority, runs from start
    auth: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 10 },
        { duration: "5m", target: 20 },
        { duration: "2m", target: 0 },
      ],
      exec: "authFlow",
      gracefulRampDown: "30s",
    },

    // Athlete portal — starts 30s in to let auth warm up
    userPortal: {
      executor: "ramping-vus",
      startVUs: 0,
      startTime: "30s",
      stages: [
        { duration: "1m", target: 15 },
        { duration: "5m", target: 30 },
        { duration: "2m", target: 0 },
      ],
      exec: "userPortalFlow",
      gracefulRampDown: "30s",
    },

    // Parent/guardian portal — starts 1m in
    parentPortal: {
      executor: "ramping-vus",
      startVUs: 0,
      startTime: "1m",
      stages: [
        { duration: "1m", target: 8 },
        { duration: "5m", target: 15 },
        { duration: "2m", target: 0 },
      ],
      exec: "parentPortalFlow",
      gracefulRampDown: "30s",
    },

    // Admin dashboard — lower VU count (less concurrent admins in practice)
    admin: {
      executor: "ramping-vus",
      startVUs: 0,
      startTime: "1m",
      stages: [
        { duration: "1m", target: 5 },
        { duration: "5m", target: 10 },
        { duration: "2m", target: 0 },
      ],
      exec: "adminFlow",
      gracefulRampDown: "30s",
    },

    // Socket.IO polling layer — runs through the full window
    socketConnect: {
      executor: "ramping-vus",
      startVUs: 0,
      startTime: "30s",
      stages: [
        { duration: "1m", target: 10 },
        { duration: "5m", target: 20 },
        { duration: "2m", target: 0 },
      ],
      exec: "socketFlow",
      gracefulRampDown: "30s",
    },
  },

  // Per-scenario threshold tags
  thresholds: {
    "http_req_duration{scenario:auth}": ["p(95)<500", "p(99)<1000"],
    "http_req_duration{scenario:userPortal}": ["p(95)<800", "p(99)<2000"],
    "http_req_duration{scenario:parentPortal}": ["p(95)<800", "p(99)<2000"],
    "http_req_duration{scenario:admin}": ["p(95)<1000", "p(99)<3000"],
    "http_req_duration{scenario:socketConnect}": ["p(95)<1000", "p(99)<3000"],
    // Global error budget — <1% failures across all scenarios
    http_req_failed: ["rate<0.01"],
    // Socket specifically allows slightly more
    "http_req_failed{endpoint:socket_handshake}": ["rate<0.05"],
  },
};

// ── Exported exec functions ───────────────────────────────────────────────────

export function authFlow() {
  const { token } = login(TEST_USER_EMAIL, TEST_USER_PASSWORD);
  randomSleep(0.2, 0.5);
  if (!token) return;

  const hdrs = { headers: authHeaders(token) };
  checkedGet(`${API_URL}/auth/me`, hdrs);
  randomSleep(0.3, 0.8);
  checkedGet(`${API_URL}/auth/get-session`, hdrs);
  randomSleep(0.3, 0.8);

  const refreshRes = http.post(`${API_URL}/auth/refresh`, null, hdrs);
  check(refreshRes, { "refresh ok": (r) => r.status === 200 || r.status === 401 });
  randomSleep(0.5, 1.5);

  http.post(`${API_URL}/app/clear-token`, null, hdrs);
  randomSleep(0.5, 1.0);
}

export function userPortalFlow() {
  const { token } = login(TEST_USER_EMAIL, TEST_USER_PASSWORD);
  if (!token) return;

  const hdrs = { headers: authHeaders(token) };
  randomSleep(0.5, 1.0);

  checkedGet(`${API_URL}/auth/me`, hdrs);
  randomSleep(0.5, 1.5);

  const programsRes = checkedGet(`${API_URL}/programs/my-assigned`, hdrs);
  const programs = safeJson(programsRes);
  const list = Array.isArray(programs) ? programs : programs.data || [];
  randomSleep(1.0, 2.5);

  if (list.length > 0) {
    const id = list[0].id || list[0].programId;
    if (id) {
      checkedGet(`${API_URL}/programs/my-assigned/${id}`, hdrs);
      randomSleep(1.0, 2.0);
    }
  }

  checkedGet(`${API_URL}/bookings`, hdrs);
  randomSleep(0.8, 1.8);

  checkedGet(`${API_URL}/billing/status`, hdrs);
  randomSleep(0.5, 1.0);

  http.get(`${API_URL}/billing/plans`);
  randomSleep(1.0, 3.0);
}

export function parentPortalFlow() {
  const { token } = login(PARENT_TEST_EMAIL, PARENT_TEST_PASSWORD);
  if (!token) return;

  const hdrs = { headers: authHeaders(token) };
  randomSleep(0.3, 0.8);

  checkedGet(`${API_URL}/auth/get-session`, hdrs);
  randomSleep(0.3, 0.7);

  checkedGet(`${API_URL}/portal/me`, hdrs);
  randomSleep(0.5, 1.2);

  const childrenRes = checkedGet(`${API_URL}/portal/guardian/children`, hdrs);
  const children = safeJson(childrenRes);
  const childList = Array.isArray(children) ? children : children.data || [];
  randomSleep(0.8, 2.0);

  if (childList.length > 0) {
    const cid = childList[0].id || childList[0].athleteId;
    if (cid) {
      http.get(`${API_URL}/portal/guardian/children/${cid}`, hdrs);
      randomSleep(0.5, 1.2);
      http.get(`${API_URL}/portal/guardian/children/${cid}/attendance`, hdrs);
      randomSleep(0.5, 1.0);
    }
  }

  checkedGet(`${API_URL}/portal/guardian/billing-status`, hdrs);
  randomSleep(0.5, 1.2);

  checkedGet(`${API_URL}/portal/guardian/feedback`, hdrs);
  randomSleep(1.0, 2.5);
}

export function adminFlow() {
  const { token } = login(ADMIN_TEST_EMAIL, ADMIN_TEST_PASSWORD);
  if (!token) return;

  const hdrs = { headers: authHeaders(token) };
  randomSleep(0.3, 0.8);

  checkedGet(`${API_URL}/auth/me`, hdrs);
  randomSleep(0.3, 0.7);

  checkedGet(`${API_URL}/admin/dashboard`, hdrs);
  randomSleep(0.5, 1.5);

  checkedGet(`${API_URL}/admin/users`, hdrs);
  randomSleep(0.8, 2.0);

  checkedGet(`${API_URL}/admin/teams`, hdrs);
  randomSleep(0.5, 1.5);

  checkedGet(`${API_URL}/admin/programs`, hdrs);
  randomSleep(0.5, 1.5);

  checkedGet(`${API_URL}/admin/bookings`, hdrs);
  randomSleep(0.5, 1.2);

  checkedGet(`${API_URL}/admin/subscription-plans`, hdrs);
  randomSleep(0.5, 1.2);

  checkedGet(`${API_URL}/admin/messages/threads`, hdrs);
  randomSleep(0.8, 2.0);

  checkedGet(`${API_URL}/admin/training-snapshot`, hdrs);
  randomSleep(1.0, 3.0);
}

export function socketFlow() {
  const { token } = login(TEST_USER_EMAIL, TEST_USER_PASSWORD);
  randomSleep(0.2, 0.5);

  const handshakeUrl = `${BASE_URL}/socket.io/?EIO=4&transport=polling${token ? `&token=${encodeURIComponent(token)}` : ""}`;

  const handshakeRes = http.get(handshakeUrl, {
    tags: { endpoint: "socket_handshake" },
  });

  check(handshakeRes, {
    "socket handshake 200": (r) => r.status === 200,
  });

  let sid = "";
  try {
    const bodyStr = handshakeRes.body || "";
    const jsonStart = bodyStr.indexOf("{");
    if (jsonStart !== -1) {
      sid = JSON.parse(bodyStr.slice(jsonStart)).sid || "";
    }
  } catch (_) {}

  randomSleep(0.1, 0.3);

  if (sid) {
    const connectUrl = `${BASE_URL}/socket.io/?EIO=4&transport=polling&sid=${encodeURIComponent(sid)}`;
    http.post(connectUrl, "40", {
      headers: { "Content-Type": "text/plain" },
      tags: { endpoint: "socket_connect_packet" },
    });
    randomSleep(0.2, 0.6);
    http.get(connectUrl, { tags: { endpoint: "socket_poll" } });
  }

  randomSleep(1.0, 3.0);
}
