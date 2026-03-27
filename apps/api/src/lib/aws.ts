import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { S3Client } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";

import { env } from "../config/env";

/** Prevents hung requests when Cognito or network stalls (e.g. forgot-password on serverless hosts). */
const cognitoHttpHandler = new NodeHttpHandler({
  connectionTimeout: 12_000,
  requestTimeout: 25_000,
});

export const cognitoClient = new CognitoIdentityProviderClient({
  region: env.awsRegion,
  requestHandler: cognitoHttpHandler,
});
export const s3Client = new S3Client({ region: env.awsRegion });
