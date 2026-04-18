import type { Request, Response } from "express";
import { z } from "zod";
import { SignJWT, jwtVerify } from "jose";

import { getSignedMediaUrl } from "../services/signed-media.service";
import { env } from "../config/env";
import { getPresignedUploadUrl, getPublicObjectUrl, putObject } from "../services/s3.service";

const signSchema = z.object({
  path: z.string().min(1),
  expiresInSeconds: z.number().int().min(60).max(86400).default(900),
});

const uploadSchema = z.object({
  folder: z.string().min(1),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  client: z.enum(["web", "native"]).optional(),
});

export async function signMediaUrl(req: Request, res: Response) {
  const input = signSchema.parse(req.body);
  const url = await getSignedMediaUrl({ path: input.path, expiresInSeconds: input.expiresInSeconds });
  return res.status(200).json({ url });
}

const uploadTokenSchema = z.object({
  token: z.string().min(1),
});

type UploadTokenClaims = {
  key: string;
  contentType: string;
  sizeBytes: number;
};

function uploadTokenSecret() {
  return new TextEncoder().encode(env.jwtSecret);
}

async function createUploadToken(claims: UploadTokenClaims) {
  return await new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject("media-upload")
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(uploadTokenSecret());
}

async function verifyUploadToken(token: string): Promise<UploadTokenClaims> {
  const { payload } = await jwtVerify(token, uploadTokenSecret(), {
    subject: "media-upload",
  });
  const key = typeof payload.key === "string" ? payload.key : "";
  const contentType = typeof payload.contentType === "string" ? payload.contentType : "";
  const sizeBytes = typeof payload.sizeBytes === "number" ? payload.sizeBytes : Number(payload.sizeBytes);
  if (!key || !contentType || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw new Error("Invalid upload token");
  }
  return { key, contentType, sizeBytes };
}

export async function createMediaUploadUrl(req: Request, res: Response) {
  const input = uploadSchema.parse(req.body);
  const folderLower = input.folder.toLowerCase();
  const contentTypeLower = input.contentType.toLowerCase();
  const isVideo =
    folderLower.includes("video") ||
    contentTypeLower.startsWith("video/") ||
    contentTypeLower.includes("video");
  const limitMb = isVideo ? env.videoMaxMb : env.mediaMaxMb;
  const maxBytes = Math.max(1, limitMb) * 1024 * 1024;
  if (input.sizeBytes > maxBytes) {
    return res.status(413).json({ error: `File exceeds ${limitMb}MB limit.` });
  }
  try {
    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const now = new Date();
    const key = `${input.folder}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${Date.now()}-${safeName}`;
    const wantsProxy = input.client === "web";
    const uploadUrl = wantsProxy
      ? `${req.protocol}://${req.get("host")}/api/media/upload?token=${encodeURIComponent(
          await createUploadToken({ key, contentType: input.contentType, sizeBytes: input.sizeBytes }),
        )}`
      : await getPresignedUploadUrl({ key, contentType: input.contentType });
    const publicUrl = getPublicObjectUrl(key);
    return res.status(200).json({ uploadUrl, publicUrl, key });
  } catch (error: any) {
    console.error("Failed to create presigned upload URL", error);
    return res.status(500).json({ error: error?.message || "Failed to create upload URL" });
  }
}

export async function uploadMediaByToken(req: Request, res: Response) {
  try {
    const { token } = uploadTokenSchema.parse(req.query);
    const claims = await verifyUploadToken(token);

    const contentTypeHeader = String(req.headers["content-type"] ?? "").split(";")[0]?.trim();
    if (!contentTypeHeader) {
      return res.status(400).json({ error: "Content-Type header is required" });
    }
    if (contentTypeHeader.toLowerCase() !== claims.contentType.toLowerCase()) {
      return res.status(400).json({ error: "Content-Type does not match upload token" });
    }

    const body = req.body as unknown;
    if (!Buffer.isBuffer(body)) {
      return res.status(400).json({ error: "Upload body must be raw bytes" });
    }
    if (body.length !== claims.sizeBytes) {
      return res.status(400).json({ error: "Upload size does not match upload token" });
    }

    await putObject({ key: claims.key, body, contentType: claims.contentType });
    return res.sendStatus(204);
  } catch (error: any) {
    const message = error?.message ? String(error.message) : "Upload failed";
    const status =
      error?.name?.toString?.().startsWith?.("JWT") ||
      error?.name?.toString?.().startsWith?.("JOSE") ||
      message.toLowerCase().includes("token")
        ? 401
        : 400;
    return res.status(status).json({ error: message });
  }
}
