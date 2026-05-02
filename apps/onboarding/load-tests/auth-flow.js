import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 20,
  duration: "1m",
  thresholds: {
    http_req_duration: ["p(95)<1000"],
    http_req_failed: ["rate<0.1"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:5173";

export default function () {
  // Test login endpoint (expects 401 with invalid creds — that's fine, we're testing throughput)
  const loginRes = http.post(
    `${BASE_URL}/api/auth/sign-in/email`,
    JSON.stringify({
      email: `loadtest+${__VU}@example.com`,
      password: "loadtest123456",
    }),
    { headers: { "Content-Type": "application/json" } }
  );

  check(loginRes, {
    "auth responds (any status)": (r) => r.status > 0,
    "not timeout": (r) => r.timings.duration < 5000,
  });

  // Test rate limiter kicks in
  if (loginRes.status === 429) {
    check(loginRes, {
      "rate limit has retry-after": (r) => r.headers["Retry-After"] !== undefined,
    });
  }

  sleep(0.5 + Math.random());
}
