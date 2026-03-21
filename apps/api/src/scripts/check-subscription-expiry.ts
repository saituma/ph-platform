/**
 * Run daily via cron, e.g.:
 *   0 6 * * * cd /path/to/apps/api && pnpm exec ts-node src/scripts/check-subscription-expiry.ts
 */
import "dotenv/config";

import { runSubscriptionExpirySweep } from "../services/subscription-expiry.service";

runSubscriptionExpirySweep()
  .then(() => {
    console.log("[check-subscription-expiry] sweep completed");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[check-subscription-expiry] failed", err);
    process.exit(1);
  });
