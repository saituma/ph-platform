import * as Minio from "minio";

import { env } from "../config/env";

let client: Minio.Client | null = null;

export function getR2S3Client(): Minio.Client {
  if (client) return client;
  const accountId = env.r2AccountId.trim();
  const accessKey = env.r2AccessKeyId.trim();
  const secretKey = env.r2SecretAccessKey.trim();
  if (!accountId || !accessKey || !secretKey) {
    throw new Error("R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY are required for object storage.");
  }
  const endPoint = `${accountId}.r2.cloudflarestorage.com`;
  client = new Minio.Client({
    endPoint,
    port: 443,
    useSSL: true,
    accessKey,
    secretKey,
    region: env.r2Region.trim() || "auto",
  });
  return client;
}
