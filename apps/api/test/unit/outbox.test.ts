import fs from "fs";
import path from "path";

const srcRoot = path.resolve(__dirname, "../../src");

describe("outbox architecture", () => {
  it("server.ts does not start any workers", () => {
    const serverSrc = fs.readFileSync(path.join(srcRoot, "server.ts"), "utf8");
    expect(serverSrc).not.toMatch(/startPushWorker|startEmailWorker|startScheduledWorker|startOutboxWorker/);
  });

  it("worker.ts starts the outbox worker", () => {
    const workerSrc = fs.readFileSync(path.join(srcRoot, "worker.ts"), "utf8");
    expect(workerSrc).toMatch(/startOutboxWorker/);
    expect(workerSrc).toMatch(/stopOutboxWorker/);
  });

  it("outbox worker uses LISTEN/NOTIFY for immediate drain", () => {
    const workerSrc = fs.readFileSync(path.join(srcRoot, "jobs/outbox.worker.ts"), "utf8");
    expect(workerSrc).toMatch(/LISTEN/);
    expect(workerSrc).toMatch(/notification/);
  });

  it("outbox worker has polling fallback", () => {
    const workerSrc = fs.readFileSync(path.join(srcRoot, "jobs/outbox.worker.ts"), "utf8");
    expect(workerSrc).toMatch(/setInterval/);
    expect(workerSrc).toMatch(/POLL_MS/);
  });

  it("outbox worker runs cleanup on interval", () => {
    const workerSrc = fs.readFileSync(path.join(srcRoot, "jobs/outbox.worker.ts"), "utf8");
    expect(workerSrc).toMatch(/cleanupOutbox/);
    expect(workerSrc).toMatch(/CLEANUP_MS/);
  });

  it("outbox service sends NOTIFY after intent creation", () => {
    const svcSrc = fs.readFileSync(path.join(srcRoot, "services/outbox.service.ts"), "utf8");
    expect(svcSrc).toMatch(/NOTIFY/);
    expect(svcSrc).toMatch(/notifyNewIntent/);
  });

  it("outbox service has cleanup function with retention periods", () => {
    const svcSrc = fs.readFileSync(path.join(srcRoot, "services/outbox.service.ts"), "utf8");
    expect(svcSrc).toMatch(/cleanupOutbox/);
    expect(svcSrc).toMatch(/SENT_RETENTION_MS/);
    expect(svcSrc).toMatch(/FAILED_RETENTION_MS/);
  });

  it("no API controller or service imports pushQueue or emailQueue directly", () => {
    const violations: string[] = [];
    const allowedQueueImports = new Set([
      "jobs/index.ts",
      "jobs/push.queue.ts",
      "jobs/email.queue.ts",
      "jobs/outbox.worker.ts",
    ]);

    function walk(dir: string): string[] {
      return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) return walk(p);
        return e.isFile() && p.endsWith(".ts") ? [p] : [];
      });
    }

    for (const file of walk(srcRoot)) {
      const rel = path.relative(srcRoot, file);
      if (allowedQueueImports.has(rel)) continue;
      const src = fs.readFileSync(file, "utf8");
      if (/import\s*\{[^}]*\b(pushQueue|emailQueue)\b/.test(src)) {
        violations.push(rel);
      }
    }
    expect(violations).toEqual([]);
  });
});

export {};
