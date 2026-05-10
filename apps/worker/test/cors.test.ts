import assert from "node:assert/strict";
import { describe, it } from "node:test";
import app from "../src/index";

type TestEnv = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  JWT_SECRET: string;
  TRUSTED_ORIGINS_EXTRA?: string;
  MEDIA: R2Bucket;
};

const baseEnv: TestEnv = {
  DATABASE_URL: "postgres://user:pass@example.com/db",
  BETTER_AUTH_SECRET: "better-auth-secret",
  BETTER_AUTH_URL: "https://auth.example.com",
  JWT_SECRET: "jwt-secret",
  TRUSTED_ORIGINS_EXTRA: "https://parent.example.com, https://portal.example.com/",
  MEDIA: {} as unknown as R2Bucket,
};

function request(origin?: string, method = "GET") {
  const headers = new Headers();
  if (origin) headers.set("Origin", origin);
  if (method === "OPTIONS") {
    headers.set("Access-Control-Request-Method", "POST");
    headers.set("Access-Control-Request-Headers", "Authorization, Content-Type");
  }
  return app.fetch(new Request("https://worker.example.com/health", { method, headers }), baseEnv);
}

describe("worker CORS", () => {
  it("approves an allowed origin", async () => {
    const response = await request("https://parent.example.com");

    assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://parent.example.com");
    assert.equal(response.headers.get("Access-Control-Allow-Credentials"), "true");
  });

  it("denies an unknown origin", async () => {
    const response = await request("https://evil.example.com");

    assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
    assert.equal(response.headers.get("Access-Control-Allow-Credentials"), null);
  });

  it("does not approve credentialed CORS when origin is missing", async () => {
    const response = await request();

    assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
    assert.equal(response.headers.get("Access-Control-Allow-Credentials"), null);
  });

  it("handles preflight OPTIONS for allowed origins only", async () => {
    const allowed = await request("https://portal.example.com", "OPTIONS");
    const denied = await request("https://evil.example.com", "OPTIONS");

    assert.equal(allowed.status, 204);
    assert.equal(allowed.headers.get("Access-Control-Allow-Origin"), "https://portal.example.com");
    assert.equal(allowed.headers.get("Access-Control-Allow-Credentials"), "true");
    assert.equal(denied.headers.get("Access-Control-Allow-Origin"), null);
    assert.equal(denied.headers.get("Access-Control-Allow-Credentials"), null);
  });
});
