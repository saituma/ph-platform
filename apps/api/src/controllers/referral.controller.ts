import type { Request, Response } from "express";
import { logger } from "../lib/logger";
import { getOrCreateReferralCode, getReferralStats } from "../services/referral.service";

export async function getMyReferralCode(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const code = await getOrCreateReferralCode(req.user.id);
    return res.status(200).json({ code });
  } catch (err) {
    logger.error({ err }, "[Referral] Failed to get/create referral code");
    return res.status(500).json({ error: "Failed to retrieve referral code" });
  }
}

export async function getMyReferrals(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const stats = await getReferralStats(req.user.id);
    return res.status(200).json(stats);
  } catch (err) {
    logger.error({ err }, "[Referral] Failed to get referral stats");
    return res.status(500).json({ error: "Failed to retrieve referral stats" });
  }
}
