import fs from "fs";
import path from "path";

const srcRoot = path.resolve(__dirname, "../../src");

const allowedPushImports = new Set([
  path.join(srcRoot, "jobs/push.queue.ts"),
  path.join(srcRoot, "jobs/outbox.worker.ts"),
  path.join(srcRoot, "services/push.service.ts"),
]);

const allowedDeliverEmailImports = new Set([
  path.join(srcRoot, "jobs/email.queue.ts"),
  path.join(srcRoot, "jobs/outbox.worker.ts"),
  path.join(srcRoot, "lib/mailer/base.mailer.ts"),
]);

const allowedQueueImports = new Set([
  path.join(srcRoot, "jobs/index.ts"),
  path.join(srcRoot, "jobs/push.queue.ts"),
  path.join(srcRoot, "jobs/email.queue.ts"),
  path.join(srcRoot, "jobs/outbox.worker.ts"),
]);

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return entry.isFile() && fullPath.endsWith(".ts") ? [fullPath] : [];
  });
}

describe("direct notification delivery guard", () => {
  it("keeps direct push/email provider calls inside worker/provider boundaries", () => {
    const violations: string[] = [];
    for (const file of walk(srcRoot)) {
      const source = fs.readFileSync(file, "utf8");
      const rel = path.relative(srcRoot, file);

      if (
        source.includes("sendPushNotification") &&
        source.includes("push.service") &&
        !allowedPushImports.has(file)
      ) {
        violations.push(`${rel}: import pushQueue instead of sendPushNotification`);
      }

      if (
        /import\s*\{[^}]*\bdeliverEmail\b[^}]*\}\s*from\s*["'][^"']*mailer/.test(source) &&
        !allowedDeliverEmailImports.has(file)
      ) {
        violations.push(`${rel}: import emailQueue/template mailer instead of deliverEmail`);
      }

      if (source.includes("fetch(env.pushWebhookUrl") && rel !== "services/push.service.ts") {
        violations.push(`${rel}: enqueue push instead of calling PUSH_WEBHOOK_URL directly`);
      }

      if (
        /import\s*\{[^}]*\b(pushQueue|emailQueue)\b/.test(source) &&
        !allowedQueueImports.has(file)
      ) {
        violations.push(`${rel}: use outbox.service (createPushIntent/createEmailIntent) instead of direct queue access`);
      }
    }

    expect(violations).toEqual([]);
  });
});
