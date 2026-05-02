import http from "k6/http";
import { check, group, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "";

export const options = {
  scenarios: {
    smoke: {
      executor: "constant-vus",
      vus: 1,
      duration: "30s",
      exec: "allEndpoints",
    },
    load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 20 },
        { duration: "1m", target: 50 },
        { duration: "30s", target: 0 },
      ],
      exec: "allEndpoints",
      startTime: "35s",
    },
    stress: {
      executor: "constant-vus",
      vus: 100,
      duration: "1m",
      exec: "allEndpoints",
      startTime: "3m10s",
    },
  },
  thresholds: {
    "http_req_duration{endpoint:health}": ["p(95)<50"],
    "http_req_duration{endpoint:health_deep}": ["p(95)<200"],
    "http_req_duration{endpoint:auth_me}": ["p(95)<300"],
    "http_req_duration{endpoint:bookings}": ["p(95)<500"],
    http_req_failed: ["rate<0.05"],
  },
};

const authHeaders = AUTH_TOKEN
  ? { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
  : {};

export function allEndpoints() {
  group("health", () => {
    const res = http.get(`${BASE_URL}/health`, {
      tags: { endpoint: "health" },
    });
    check(res, { "health 200": (r) => r.status === 200 });
  });

  group("health_deep", () => {
    const res = http.get(`${BASE_URL}/api/health/deep`, {
      tags: { endpoint: "health_deep" },
    });
    check(res, { "deep health 200": (r) => r.status === 200 });
  });

  if (AUTH_TOKEN) {
    group("auth_me", () => {
      const res = http.get(`${BASE_URL}/api/auth/me`, {
        ...authHeaders,
        tags: { endpoint: "auth_me" },
      });
      check(res, { "auth/me 200": (r) => r.status === 200 });
    });

    group("bookings", () => {
      const res = http.get(`${BASE_URL}/api/bookings`, {
        ...authHeaders,
        tags: { endpoint: "bookings" },
      });
      check(res, { "bookings 200": (r) => r.status === 200 });
    });
  }

  // ~4 req per iteration, stay under 300 req/min rate limit during load test
  sleep(1);
}
