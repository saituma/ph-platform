import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { s3Client } from "../lib/aws";
import { env } from "../config/env";

export async function getPresignedUploadUrl(input: { key: string; contentType: string }) {
  const command = new PutObjectCommand({
    Bucket: env.s3Bucket,
    Key: input.key,
    ContentType: input.contentType,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 900 });
  return url;
}

export function normalizeStoredMediaUrl(value: string | null): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return null;

  const bucket = String(env.s3Bucket ?? "").trim();
  const region = String(env.awsRegion ?? "").trim();

  // If we don't know our bucket, we can't safely rewrite.
  if (!bucket) return trimmed;

  try {
    const url = new URL(trimmed);
    const host = url.hostname;

    const knownHosts = new Set(
      [
        region ? `${bucket}.s3.${region}.amazonaws.com` : null,
        `${bucket}.s3.amazonaws.com`,
        region ? `${bucket}.s3-${region}.amazonaws.com` : null,
      ].filter(Boolean) as string[],
    );

    if (!knownHosts.has(host)) {
      return trimmed;
    }

    const key = url.pathname.replace(/^\/+/, "");
    if (!key) return trimmed;
    return getPublicObjectUrl(key);
  } catch {
    // Not a valid URL; keep as-is.
    return trimmed;
  }
}

export function getPublicObjectUrl(key: string) {
  const normalizedKey = key.replace(/^\//, "");

  const cloudfrontDomain = String(env.cloudfrontDomain ?? "").trim();
  if (cloudfrontDomain) {
    const domain = cloudfrontDomain.startsWith("http")
      ? cloudfrontDomain
      : `https://${cloudfrontDomain}`;
    return `${domain.replace(/\/+$/, "")}/${normalizedKey}`;
  }

  const bucket = String(env.s3Bucket ?? "").trim();
  const region = String(env.awsRegion ?? "").trim();
  if (!bucket || !region) {
    throw new Error("S3 bucket or region is not configured");
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${normalizedKey}`;
}
