/**
 * Run frequently via cron, e.g. every 5 minutes.
 * Example (cron syntax varies by host):
 *   every-5-minutes cd /path/to/apps/api && pnpm exec ts-node src/scripts/send-nutrition-log-reminders.ts
 */
import "dotenv/config";

import { runNutritionLogReminderSweep } from "../services/nutrition-reminder.service";

runNutritionLogReminderSweep()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("[send-nutrition-log-reminders] failed", err);
    process.exit(1);
  });
