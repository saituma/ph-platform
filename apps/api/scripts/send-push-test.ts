import "../src/config/env";
import { sendPushNotification } from "../src/services/push.service";

const userId = Number(process.argv[2]);
const title = process.argv[3] ?? "Test";
const body = process.argv[4] ?? "Hello";

if (!userId) {
  console.error("Usage: tsx scripts/send-push-test.ts <userId> <title> <body>");
  process.exit(1);
}

sendPushNotification(userId, title, body)
  .then(() => { console.log("Done"); process.exit(0); })
  .catch((err) => { console.error(err); process.exit(1); });
