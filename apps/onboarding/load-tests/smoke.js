import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 1,
  duration: "10s",
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.01"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:5173";

export default function () {
  const responses = http.batch([
    ["GET", `${BASE_URL}/`],
    ["GET", `${BASE_URL}/about`],
    ["GET", `${BASE_URL}/features`],
    ["GET", `${BASE_URL}/api/health`],
  ]);

  responses.forEach((res) => {
    check(res, {
      "status is 200": (r) => r.status === 200,
      "response time < 500ms": (r) => r.timings.duration < 500,
    });
  });

  sleep(1);
}
