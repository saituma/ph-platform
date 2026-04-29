import type { Request, Response } from "express";
import { z } from "zod";
import { getPortalConfig, updatePortalConfig } from "../../services/admin/portal-config.service";

const linkSchema = z.object({ label: z.string(), href: z.string() });

const portalConfigSchema = z.object({
  nav: z
    .object({
      brand: z.string(),
      links: z.array(linkSchema),
      loginLabel: z.string(),
      getStartedLabel: z.string(),
    })
    .optional(),
  hero: z
    .object({
      eyebrow: z.string(),
      title: z.string(),
      titleAccent: z.string(),
      subtitle: z.string(),
      stats: z.array(z.object({ value: z.string(), label: z.string() })),
      emailPlaceholder: z.string(),
      emailCtaLabel: z.string(),
      mobileScreenshotUrl: z.string().optional().default(""),
    })
    .optional(),
  ceoIntro: z
    .object({
      eyebrow: z.string(),
      title: z.string(),
      body: z.string(),
      name: z.string(),
      role: z.string(),
      watchLabel: z.string(),
      videoUrl: z.string(),
      photoUrl: z.string(),
    })
    .optional(),
  features: z
    .object({
      heading: z.string(),
      subheading: z.string(),
      description: z.string(),
      items: z.array(z.object({ title: z.string(), body: z.string() })),
    })
    .optional(),
  testimonials: z
    .object({
      eyebrow: z.string(),
      heading: z.string(),
      items: z.array(
        z.object({
          quote: z.string(),
          name: z.string(),
          role: z.string(),
        }),
      ),
    })
    .optional(),
  cta: z
    .object({
      eyebrow: z.string(),
      heading: z.string(),
      body: z.string(),
      appStoreLabel: z.string(),
      playStoreLabel: z.string(),
    })
    .optional(),
  footer: z
    .object({
      brand: z.string(),
      tagline: z.string(),
      platformLinks: z.array(linkSchema),
      legalLinks: z.array(linkSchema),
      copyright: z.string(),
    })
    .optional(),
});

export async function getPortalConfigDetails(_req: Request, res: Response) {
  const config = await getPortalConfig();
  return res.status(200).json({ config });
}

export async function updatePortalConfigDetails(req: Request, res: Response) {
  const parsed = portalConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }
  const config = await updatePortalConfig(req.user!.id, parsed.data);
  return res.status(200).json({ config });
}

export async function getPublicPortalConfig(_req: Request, res: Response) {
  const config = await getPortalConfig();
  return res.status(200).json({ config });
}
