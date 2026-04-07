import type { Request, Response } from "express";
import { z } from "zod";
import {
  getAdminProfile,
  updateAdminProfile,
  updateAdminPreferences,
  updateAdminMessagingAccess,
  getDashboardMetrics,
} from "../../services/admin/settings.service";
import { listVideoUploadsAdmin } from "../../services/admin/video.service";
import { ProgramType } from "../../db/schema";

const adminProfileSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  profilePicture: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
});

const adminPreferencesSchema = z.object({
  timezone: z.string().min(1),
  notificationSummary: z.string().min(1),
  workStartHour: z.number().int().min(0).max(23),
  workStartMinute: z.number().int().min(0).max(59),
  workEndHour: z.number().int().min(0).max(23),
  workEndMinute: z.number().int().min(0).max(59),
});

const messagingAccessSchema = z.object({
  tiers: z.array(z.enum(ProgramType.enumValues)),
});

const adminSearchQuerySchema = z.object({
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export async function getAdminProfileDetails(req: Request, res: Response) {
  const data = await getAdminProfile(req.user!.id);
  if (!data) {
    return res.status(404).json({ error: "Admin profile not found" });
  }
  return res.status(200).json(data);
}

export async function updateAdminProfileDetails(req: Request, res: Response) {
  const parsed = adminProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }
  const data = await updateAdminProfile(req.user!.id, parsed.data);
  return res.status(200).json(data);
}

export async function updateAdminPreferencesDetails(req: Request, res: Response) {
  const parsed = adminPreferencesSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }
  const data = await updateAdminPreferences(req.user!.id, parsed.data);
  return res.status(200).json(data);
}

export async function putMessagingAccessDetails(req: Request, res: Response) {
  const parsed = messagingAccessSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }
  const tiers = await updateAdminMessagingAccess(req.user!.id, parsed.data.tiers);
  return res.status(200).json({ messagingAccessTiers: tiers });
}

export async function getDashboard(req: Request, res: Response) {
  const data = await getDashboardMetrics(req.user!.id);
  return res.status(200).json(data);
}

export async function listVideosAdmin(req: Request, res: Response) {
  const { q, limit } = adminSearchQuerySchema.parse(req.query ?? {});
  const items = await listVideoUploadsAdmin({ q, limit });
  return res.status(200).json({ items });
}
