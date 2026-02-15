import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { S3Client } from "@aws-sdk/client-s3";

import { env } from "../config/env";

export const cognitoClient = new CognitoIdentityProviderClient({ region: env.awsRegion });
export const s3Client = new S3Client({ region: env.awsRegion });
