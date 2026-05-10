import { logger } from "../../lib/logger";

export async function verifyRevenueCatPurchase(req: any, res: any) {
  try {
    const userId = Number(req.user?.id);
    if (!userId || Number.isNaN(userId)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { planId, tier, duration } = req.body;
    if (!planId || !tier) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // TODO: Implement RevenueCat purchase verification:
    // 1. Call RevenueCat REST API (GET /v1/subscribers/{app_user_id}) to verify the receipt
    // 2. Validate the entitlement matches the requested planId/tier
    // 3. Create/update subscription request in the database
    // 4. Return the verified subscription status
    //
    // Until this is implemented, reject all requests to prevent unverified access.
    return res.status(503).json({ error: "Purchase verification is not yet configured. Contact support.", success: false });
  } catch (error) {
    logger.error({ err: error }, "Error verifying RevenueCat purchase");
    return res.status(500).json({ error: "Internal server error" });
  }
}
