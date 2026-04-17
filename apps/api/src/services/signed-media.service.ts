import { getR2S3Client } from "../lib/r2-minio";
import { env } from "../config/env";

/** Time-limited read URL for private objects (replaces legacy CDN URL signing). */
export async function getSignedMediaUrl(input: { path: string; expiresInSeconds: number }) {
  const bucket = env.r2Bucket.trim();
  if (!bucket) {
    throw new Error("R2_BUCKET is not configured");
  }
  const client = getR2S3Client();
  const objectName = input.path.replace(/^\//, "");
  return await client.presignedGetObject(bucket, objectName, input.expiresInSeconds);
}
