import fs from "fs";
import path from "path";

const srcRoot = path.resolve(__dirname, "../../src");

describe("outbox architecture", () => {
  it("server.ts registers the scheduled repeatables, gated on RUN_WORKERS_IN_PROCESS", () => {
    const serverSrc = fs.readFileSync(path.join(srcRoot, "server.ts"), "utf8");

    // This test used to assert the OPPOSITE — that scheduled/email/push workers stay in
    // worker.ts only. That holds only if a `worker` dyno is actually running, and Heroku starts
    // new process types at 0 dynos. On a single-dyno deploy nothing registered the repeatables,
    // so session/streak/nutrition reminders and subscription/goal expiry never fired.
    expect(serverSrc).toMatch(/startScheduledWorker/);

    // ...but never unconditionally — a real worker dyno must be able to opt the web dyno out.
    expect(serverSrc).toMatch(/env\.runWorkersInProcess/);

    // Email and push must NOT be started here. Both go through the Postgres outbox, which
    // startOutboxWorker() drains; their BullMQ queues have no producers left.
    expect(serverSrc).not.toMatch(/startPushWorker|startEmailWorker/);
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
