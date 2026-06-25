import { approveSubscriptionRequest } from "../src/services/billing/request.service";
import { pool } from "../src/db";

const requestId = Number(process.argv[2]);
if (!requestId) {
  console.error("Usage: tsx scripts/approve-sub-request.ts <requestId>");
  process.exit(1);
}

async function main() {
  console.log(`Approving subscription request #${requestId}...`);
  const result = await approveSubscriptionRequest(requestId);
  console.log("Done:", JSON.stringify(result, null, 2));
  await pool.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
