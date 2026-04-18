import { getR2S3Client } from "../lib/r2-minio";
import { env } from "../config/env";

export async function getPresignedUploadUrl(input: { key: string; contentType: string }) {
  const bucket = env.r2Bucket.trim();
  if (!bucket) {
    throw new Error("R2_BUCKET is not configured");
  }
  const client = getR2S3Client();
  if (!input.contentType.trim()) {
    throw new Error("contentType is required");
  }
  return await client.presignedPutObject(bucket, input.key, 900);
}

export async function putObject(input: { key: string; body: Buffer; contentType: string }) {
  const bucket = env.r2Bucket.trim();
  if (!bucket) {
    throw new Error("R2_BUCKET is not configured");
  }
  const client = getR2S3Client();
  const contentType = input.contentType.trim();
  if (!contentType) {
    throw new Error("contentType is required");
  }
  await client.putObject(bucket, input.key, input.body, input.body.length, {
    "Content-Type": contentType,
  });
}

function publicBaseUrl(): string | null {
  const raw = String(env.mediaPublicBaseUrl ?? "").trim();
  if (!raw) return null;
  return raw.startsWith("http") ? raw : `https://${raw}`;
}

export function normalizeStoredMediaUrl(value: string | null): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return null;

  const bucket = String(env.r2Bucket ?? "").trim();
  const accountId = String(env.r2AccountId ?? "").trim();
  const region = String(env.r2Region ?? "auto").trim();

  try {
    const url = new URL(trimmed);
    const host = url.hostname;

    const legacyAwsHosts = new Set(
      [
        region && region !== "auto" ? `${bucket}.s3.${region}.amazonaws.com` : null,
        `${bucket}.s3.amazonaws.com`,
        region && region !== "auto" ? `${bucket}.s3-${region}.amazonaws.com` : null,
      ].filter(Boolean) as string[],
    );

    const r2ApiHost = accountId ? `${accountId}.r2.cloudflarestorage.com` : null;
    const isLegacyAws = legacyAwsHosts.has(host);
    const isR2Api = r2ApiHost ? host === r2ApiHost : false;

    let publicHost: string | null = null;
    const base = publicBaseUrl();
    if (base) {
      try {
        publicHost = new URL(base).hostname;
      } catch {
        publicHost = null;
      }
    }

    const isPublicCdn = publicHost && host === publicHost;

    if (!isLegacyAws && !isR2Api && !isPublicCdn) {
      return trimmed;
    }

    let key = url.pathname.replace(/^\/+/, "");
    if (isR2Api && bucket && key.startsWith(`${bucket}/`)) {
      key = key.slice(bucket.length + 1);
    }
    if (!key) return trimmed;
    return getPublicObjectUrl(key);
  } catch {
    return trimmed;
  }
}

export function getPublicObjectUrl(key: string) {
  const normalizedKey = key.replace(/^\//, "");
  const base = publicBaseUrl();
  if (!base) {
    throw new Error("MEDIA_PUBLIC_BASE_URL (or R2_PUBLIC_BASE_URL) must be set for public media URLs.");
  }
  return `${base.replace(/\/+$/, "")}/${normalizedKey}`;
}
