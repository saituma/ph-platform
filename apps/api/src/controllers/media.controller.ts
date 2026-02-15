import type { Request, Response } from "express";
import { z } from "zod";

import { getSignedMediaUrl } from "../services/cloudfront.service";
import { env } from "../config/env";
import { getPresignedUploadUrl, getPublicObjectUrl } from "../services/s3.service";

const signSchema = z.object({
  path: z.string().min(1),
  expiresInSeconds: z.number().int().min(60).max(86400).default(900),
});

const uploadSchema = z.object({
  folder: z.string().min(1),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

export async function signMediaUrl(req: Request, res: Response) {
  const input = signSchema.parse(req.body);
  const url = getSignedMediaUrl({ path: input.path, expiresInSeconds: input.expiresInSeconds });
  return res.status(200).json({ url });
}

export async function createMediaUploadUrl(req: Request, res: Response) {
  const input = uploadSchema.parse(req.body);
  const limitMb = input.folder.toLowerCase().includes("video") ? env.videoMaxMb : env.mediaMaxMb;
  const maxBytes = Math.max(1, limitMb) * 1024 * 1024;
  if (input.sizeBytes > maxBytes) {
    return res.status(413).json({ error: `File exceeds ${limitMb}MB limit.` });
  }
  try {
    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const now = new Date();
    const key = `${input.folder}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${Date.now()}-${safeName}`;
    const uploadUrl = await getPresignedUploadUrl({ key, contentType: input.contentType });
    const publicUrl = getPublicObjectUrl(key);
    return res.status(200).json({ uploadUrl, publicUrl, key });
  } catch (error: any) {
    console.error("Failed to create presigned upload URL", error);
    return res.status(500).json({ error: error?.message || "Failed to create upload URL" });
  }
}
