import { getSignedUrl } from "@aws-sdk/cloudfront-signer";

import { env } from "../config/env";

export function getSignedMediaUrl(input: { path: string; expiresInSeconds: number }) {
  const domain = env.cloudfrontDomain.startsWith("http") ? env.cloudfrontDomain : `https://${env.cloudfrontDomain}`;
  const url = `${domain.replace(/\/$/, "")}/${input.path.replace(/^\//, "")}`;

  const expires = new Date(Date.now() + input.expiresInSeconds * 1000);

  return getSignedUrl({
    url,
    keyPairId: env.cloudfrontKeyId,
    privateKey: env.cloudfrontPrivateKey,
    dateLessThan: expires.toISOString(),
  });
}
