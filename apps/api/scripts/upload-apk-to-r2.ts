import { getR2S3Client } from "../src/lib/r2-minio";
import { env } from "../src/config/env";

async function main() {
  const filePath = process.argv[2] ?? "/tmp/ph-performance.apk";
  const bucket = (env.r2Bucket ?? "ph-platform").trim();
  const key = "downloads/ph-performance.apk";

  const client = getR2S3Client();
  await client.fPutObject(bucket, key, filePath, {
    "Content-Type": "application/vnd.android.package-archive",
    "Cache-Control": "public, max-age=300",
  });

  const stat = await client.statObject(bucket, key);
  console.log(`Uploaded ${key} -> ${bucket}`);
  console.log(`size=${stat.size} etag=${stat.etag} lastModified=${stat.lastModified.toISOString()}`);
  console.log(`public: ${env.mediaPublicBaseUrl}/${key}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
