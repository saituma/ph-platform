import type { Request, Response } from "express";
import { getOrCreateReferralCode, getReferralStats } from "../services/referral.service";

export async function getMyReferralCode(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const code = await getOrCreateReferralCode(req.user.id);
  return res.status(200).json({ code });
}

export async function getMyReferrals(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const stats = await getReferralStats(req.user.id);
  return res.status(200).json(stats);
}
