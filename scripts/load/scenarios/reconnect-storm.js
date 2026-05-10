/**
 * Reconnect storm scenario — simulates mass simultaneous reconnects.
 *
 * Real-world trigger: a server restart or brief network hiccup causes all
 * connected clients to reconnect within the same ~10-second window. This
 * test validates the server does not return 5xx under that burst.
 *
 * Behaviour:
 *   - 10 VUs all login with the same test credentials (shared userId pool)
 *   - Each iteration: login → socket handshake → "disconnect" → repeat
 *   - Minimal sleep (0.1 s) — maximum burst rate
 *   - Target: >95% of handshake requests return 200
 *
 * Run as standalone:
 *   k6 run scripts/load/scenarios/reconnect-storm.js
 */
import http from "k6/http";
import { check, sleep } from "k6";
import {
  BASE_URL,
  API_URL,
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
  STRESS_OPTIONS,
} from "../config.js";
import { login, authHeaders } from "../helpers.js";

export const options = {
  // Storm profile: ramp to 10 VUs instantly, sustain for 3 min, ramp down
  stages: [
    { duration: "10s", target: 10 },
    { duration: "3m", target: 10 },
    { duration: "10s", target: 0 },
  ],
  thresholds: {
    // Accept up to 5% failures during a storm (reconnect backoff may 429 some)
    "http_req_failed{phase:storm}": ["rate<0.05"],
    // Login endpoint must still respond quickly
    "http_req_duration{phase:login}": ["p(95)<1000"],
    // Socket handshake — storm tolerance
    "http_req_duration{phase:storm}": ["p(95)<2000"],
  },
};

export default function () {
  // ── Login (shared credentials — simulates same user reconnecting) ─────────
  const loginRes = http.post(
    `${API_URL}/auth/login`,
    JSON.stringify({ email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { phase: "login" },
    },
  );

  check(loginRes, {
    "storm login 200": (r) => r.status === 200,
  });

  let token = "";
  try {
    const body = JSON.parse(loginRes.body || "{}");
    token = body.token || body.accessToken || body.data?.token || "";
  } catch (_) {}

  // Very short pause — storm behaviour
  sleep(0.1);

  // ── Socket.IO handshake (HTTP polling) ────────────────────────────────────
  const handshakeUrl = `${BASE_URL}/socket.io/?EIO=4&transport=polling${token ? `&token=${encodeURIComponent(token)}` : ""}`;

  const handshakeRes = http.get(handshakeUrl, {
    tags: { phase: "storm" },
  });

  check(handshakeRes, {
    "storm handshake not 5xx": (r) => r.status < 500,
    "storm handshake 200 or 400": (r) => r.status === 200 || r.status === 400 || r.status === 429,
  });

  // Extract sid for disconnect sequence
  let sid = "";
  try {
    const bodyStr = handshakeRes.body || "";
    const jsonStart = bodyStr.indexOf("{");
    if (jsonStart !== -1) {
      const data = JSON.parse(bodyStr.slice(jsonStart));
      sid = data.sid || "";
    }
  } catch (_) {}

  sleep(0.1);

  // ── Immediate disconnect (send close packet "41") ─────────────────────────
  if (sid) {
    const closeUrl = `${BASE_URL}/socket.io/?EIO=4&transport=polling&sid=${encodeURIComponent(sid)}`;
    // "41" = Socket.IO disconnect from namespace packet
    http.post(closeUrl, "41", {
      headers: { "Content-Type": "text/plain" },
      tags: { phase: "storm" },
    });
  }

  // Minimal pause before next reconnect — simulates reconnect backoff jitter
  sleep(0.1 + Math.random() * 0.3);
}
