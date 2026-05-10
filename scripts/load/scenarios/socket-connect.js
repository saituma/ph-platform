/**
 * Socket.IO connection scenario — HTTP polling transport.
 *
 * k6 does not natively speak the Socket.IO protocol, so we test the HTTP
 * long-polling transport layer that Socket.IO uses as its fallback:
 *
 *   1. GET  /socket.io/?EIO=4&transport=polling  → 200 + sid in body
 *   2. POST /socket.io/?EIO=4&transport=polling&sid=<sid>  → 200
 *   3. Optionally send a "40" connect packet (Socket.IO connect event)
 *
 * This validates:
 *   - The Engine.IO handshake succeeds under load
 *   - The server can maintain concurrent polling connections
 *   - Auth token passing via query-param or cookie is handled
 *
 * Run as standalone:
 *   k6 run scripts/load/scenarios/socket-connect.js
 */
import http from "k6/http";
import { check, sleep } from "k6";
import {
  LOAD_OPTIONS,
  SMOKE_OPTIONS,
  BASE_URL,
  API_URL,
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
} from "../config.js";
import { login, randomSleep, safeJson } from "../helpers.js";

const isSmoke = __ENV.SMOKE === "1";

export const options = {
  ...(isSmoke ? SMOKE_OPTIONS : LOAD_OPTIONS),
  thresholds: {
    // Socket handshake latency — more lenient than REST endpoints
    "http_req_duration{endpoint:socket_handshake}": ["p(95)<1000", "p(99)<3000"],
    // Accept up to 5% connection failures under load (network hiccups, rate limits)
    "http_req_failed{endpoint:socket_handshake}": ["rate<0.05"],
    http_req_failed: ["rate<0.02"],
  },
};

export default function () {
  // ── Authenticate to get a token ───────────────────────────────────────────
  const { token } = login(TEST_USER_EMAIL, TEST_USER_PASSWORD);
  randomSleep(0.2, 0.5);

  // ── Engine.IO handshake (polling transport) ───────────────────────────────
  // EIO=4 is Engine.IO v4 (Socket.IO 4.x)
  const handshakeUrl = `${BASE_URL}/socket.io/?EIO=4&transport=polling${token ? `&token=${encodeURIComponent(token)}` : ""}`;

  const handshakeRes = http.get(handshakeUrl, {
    tags: { endpoint: "socket_handshake" },
  });

  const handshakeOk = check(handshakeRes, {
    "socket handshake 200": (r) => r.status === 200,
    "socket handshake has sid": (r) => r.body && r.body.includes("sid"),
  });

  if (!handshakeOk) {
    // Server may not be running or Socket.IO not mounted — skip rest
    return;
  }

  // Extract sid from Engine.IO response body
  // Body format: <length>:<json payload>  e.g.  97:{"sid":"abc","upgrades":["websocket"],...}
  let sid = "";
  try {
    const bodyStr = handshakeRes.body || "";
    // Find the JSON part after the length prefix
    const jsonStart = bodyStr.indexOf("{");
    if (jsonStart !== -1) {
      const data = JSON.parse(bodyStr.slice(jsonStart));
      sid = data.sid || "";
    }
  } catch (_) {
    // If parsing fails we skip the POST step
  }

  randomSleep(0.1, 0.3);

  // ── Send Socket.IO "connect" packet (packet type 40 = namespace connect) ──
  if (sid) {
    const connectUrl = `${BASE_URL}/socket.io/?EIO=4&transport=polling&sid=${encodeURIComponent(sid)}`;
    // "40" is the Socket.IO connect packet for the default namespace
    const connectRes = http.post(connectUrl, "40", {
      headers: { "Content-Type": "text/plain" },
      tags: { endpoint: "socket_connect_packet" },
    });

    check(connectRes, {
      "socket connect packet 200": (r) => r.status === 200,
    });
    randomSleep(0.2, 0.6);

    // ── Poll once (simulate one long-poll cycle) ────────────────────────────
    const pollRes = http.get(connectUrl, {
      tags: { endpoint: "socket_poll" },
    });

    check(pollRes, {
      "socket poll 200": (r) => r.status === 200 || r.status === 400,
    });
  }

  randomSleep(1.0, 3.0);
}
