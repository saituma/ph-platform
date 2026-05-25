import type { Request, Response } from "express";
import { z } from "zod";
import {
  createLaunchPromoCampaign,
  deleteLaunchPromoCampaign,
  getLaunchPromoCampaignCodes,
  listLaunchPromoCampaigns,
} from "../../services/billing/launch-promo.service";
import { logger } from "../../lib/logger";

const createCampaignSchema = z.object({
  name: z.string().min(1).max(255),
  discountPercent: z.number().int().min(1).max(100),
  emails: z.array(z.string().email()).min(1).max(500),
  expiresAt: z.string().datetime().optional(),
});

export async function createLaunchPromoCampaignAdmin(req: Request, res: Response) {
  const parsed = createCampaignSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const { name, discountPercent, emails, expiresAt } = parsed.data;

  try {
    const result = await createLaunchPromoCampaign({
      name,
      discountPercent,
      emails,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });
    res.json({ campaign: result.campaign, codesGenerated: result.codes.length });
  } catch (err) {
    logger.error({ err }, "Failed to create launch promo campaign");
    res.status(500).json({ error: "Failed to create campaign" });
  }
}

export async function listLaunchPromoCampaignsAdmin(_req: Request, res: Response) {
  try {
    const campaigns = await listLaunchPromoCampaigns();
    res.json({ campaigns });
  } catch (err) {
    logger.error({ err }, "Failed to list launch promo campaigns");
    res.status(500).json({ error: "Failed to list campaigns" });
  }
}

export async function getLaunchPromoCodesAdmin(req: Request, res: Response) {
  const campaignId = parseInt(String(req.params["campaignId"] ?? ""), 10);
  if (isNaN(campaignId)) {
    res.status(400).json({ error: "Invalid campaign id" });
    return;
  }

  try {
    const codes = await getLaunchPromoCampaignCodes(campaignId);
    res.json({ codes });
  } catch (err) {
    logger.error({ err }, "Failed to get launch promo codes");
    res.status(500).json({ error: "Failed to get codes" });
  }
}

export async function deleteLaunchPromoCampaignAdmin(req: Request, res: Response) {
  const campaignId = parseInt(String(req.params["campaignId"] ?? ""), 10);
  if (isNaN(campaignId)) {
    res.status(400).json({ error: "Invalid campaign id" });
    return;
  }

  try {
    await deleteLaunchPromoCampaign(campaignId);
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete launch promo campaign");
    res.status(500).json({ error: "Failed to delete campaign" });
  }
}
