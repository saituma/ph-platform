import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 10 },   // ramp up
    { duration: "1m", target: 50 },    // stay at 50 users
    { duration: "30s", target: 100 },  // push to 100
    { duration: "1m", target: 100 },   // hold at 100
    { duration: "30s", target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000", "p(99)<5000"],
    http_req_failed: ["rate<0.05"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:5173";

export default function () {
  const page = http.get(`${BASE_URL}/`);
  check(page, {
    "homepage loads": (r) => r.status === 200,
    "response time OK": (r) => r.timings.duration < 2000,
  });
  sleep(Math.random() * 3 + 1);
}
