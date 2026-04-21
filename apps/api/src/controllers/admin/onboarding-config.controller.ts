import type { Request, Response } from "express";
import { z } from "zod";
import {
  getOnboardingConfig,
  updateOnboardingConfig,
  getPhpPlusProgramTabsAdmin,
  setPhpPlusProgramTabsAdmin,
  clearPhpPlusProgramTabsAdmin,
} from "../../services/admin/onboarding-config.service";
import { ProgramType } from "../../db/schema";

const onboardingFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["text", "number", "dropdown", "date"]),
  required: z.boolean(),
  visible: z.boolean(),
  options: z.array(z.string().min(1)).optional(),
  optionsByTeam: z.record(z.array(z.string().min(1))).optional(),
});

const onboardingConfigSchema = z.object({
  version: z.number().int().min(1),
  fields: z.array(onboardingFieldSchema).min(1),
  requiredDocuments: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      required: z.boolean(),
    }),
  ),
  welcomeMessage: z.string().optional().nullable(),
  coachMessage: z.string().optional().nullable(),
  /** Deprecated: tier is chosen when the user pays in the app. Omit to keep the stored DB value. */
  defaultProgramTier: z.enum(ProgramType.enumValues).optional(),
  approvalWorkflow: z.enum(["manual", "auto"]).default("manual"),
  notes: z.string().optional().nullable(),
  phpPlusProgramTabs: z.array(z.string().min(1)).optional().nullable(),
});

const phpPlusTabsSchema = z.object({
  tabs: z.array(z.string().min(1)),
});

export async function getOnboardingConfigDetails(_req: Request, res: Response) {
  const data = await getOnboardingConfig();
  return res.status(200).json({ config: data });
}

export async function updateOnboardingConfigDetails(req: Request, res: Response) {
  const parsed = onboardingConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }
  const data = await updateOnboardingConfig(req.user!.id, parsed.data);
  return res.status(200).json({ config: data });
}

export async function getPhpPlusTabsAdmin(_req: Request, res: Response) {
  const tabs = await getPhpPlusProgramTabsAdmin();
  return res.status(200).json({ tabs });
}

export async function putPhpPlusTabsAdmin(req: Request, res: Response) {
  const parsed = phpPlusTabsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }
  const config = await setPhpPlusProgramTabsAdmin(req.user!.id, parsed.data.tabs);
  return res.status(200).json({ config });
}

export async function postPhpPlusTabsAdmin(req: Request, res: Response) {
  const parsed = phpPlusTabsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }
  const config = await setPhpPlusProgramTabsAdmin(req.user!.id, parsed.data.tabs);
  return res.status(201).json({ config });
}

export async function deletePhpPlusTabsAdmin(req: Request, res: Response) {
  const config = await clearPhpPlusProgramTabsAdmin(req.user!.id);
  return res.status(200).json({ config });
}
