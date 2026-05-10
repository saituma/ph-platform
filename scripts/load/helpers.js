import http from "k6/http";
import { check, sleep } from "k6";
import { API_URL } from "./config.js";

/**
 * Login and return { token, cookies }.
 * token — Bearer token extracted from response body.
 * cookies — raw k6 cookie jar (for cookie-based auth flows).
 */
export function login(email, password) {
  const res = http.post(
    `${API_URL}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { "Content-Type": "application/json" } },
  );

  const loginOk = check(res, {
    "login 200": (r) => r.status === 200,
    "login has body": (r) => r.body && r.body.length > 0,
  });

  if (!loginOk) {
    console.warn(`Login failed for ${email}: HTTP ${res.status} — ${res.body}`);
    return { token: "", cookies: {} };
  }

  let token = "";
  try {
    const body = JSON.parse(res.body || "{}");
    token = body.token || body.accessToken || body.data?.token || "";
  } catch (_) {
    console.warn("Login response was not valid JSON");
  }

  return { token, cookies: res.cookies };
}

/**
 * Build headers for an authenticated request.
 * Passes the Bearer token if present; always sets Content-Type.
 */
export function authHeaders(token, extra = {}) {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

/**
 * GET helper with automatic status check.
 * Returns the k6 response object.
 */
export function checkedGet(url, params = {}, expectedStatus = 200) {
  const res = http.get(url, params);
  check(res, {
    [`GET ${url} → ${expectedStatus}`]: (r) => r.status === expectedStatus,
  });
  return res;
}

/**
 * POST helper with automatic status check.
 * Returns the k6 response object.
 */
export function checkedPost(url, payload, params = {}, expectedStatus = 200) {
  const body = typeof payload === "string" ? payload : JSON.stringify(payload);
  const res = http.post(url, body, params);
  check(res, {
    [`POST ${url} → ${expectedStatus}`]: (r) => r.status === expectedStatus,
  });
  return res;
}

/**
 * Sleep for a random duration between min and max seconds.
 * Simulates realistic think-time between user actions.
 */
export function randomSleep(min = 0.5, max = 2) {
  sleep(min + Math.random() * (max - min));
}

/**
 * Parse JSON body safely — returns {} on parse errors.
 */
export function safeJson(res) {
  try {
    return JSON.parse(res.body || "{}");
  } catch (_) {
    return {};
  }
}
