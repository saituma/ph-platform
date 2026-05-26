import { neon } from "@neondatabase/serverless";
const sql = neon("postgresql://neondb_owner:npg_jAOqFYxKaX79@ep-holy-credit-abmpfsia.eu-west-2.aws.neon.tech/neondb?sslmode=require");

// 1. Create an approved subscription_request for dawitanother@gmail.com (userId=19293, athleteId=53)
await sql`
  INSERT INTO subscription_requests ("userId", "athleteId", "planId", "paymentStatus", "status", "planBillingCycle", "createdAt", "updatedAt")
  VALUES (19293, 53, 2, 'paid', 'approved', 'monthly', NOW(), NOW())
`;
console.log("Subscription request created");

// 2. Set currentProgramTier on athlete so they can access the app
await sql`UPDATE athletes SET "currentProgramTier" = 'PHP_Premium', current_plan_id = 2, "updatedAt" = NOW() WHERE id = 53`;
console.log("Athlete tier set to PHP_Premium");
