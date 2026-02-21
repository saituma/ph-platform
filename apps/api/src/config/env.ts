import dotenv from "dotenv";
import fs from "fs";
import path from "path";

const envPathCandidates = [
  process.env.DOTENV_PATH,
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "apps/api/.env"),
  path.resolve(__dirname, "../../.env"),
].filter(Boolean) as string[];

const resolvedEnvPath = envPathCandidates.find((candidate) => fs.existsSync(candidate));
dotenv.config({ path: resolvedEnvPath, override: true });

export const env = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL ?? "",
  databaseSsl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  awsRegion: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "us-east-1",
  cognitoUserPoolId: process.env.COGNITO_USER_POOL_ID ?? "",
  cognitoClientId: process.env.COGNITO_CLIENT_ID ?? "",
  s3Bucket: process.env.S3_BUCKET ?? "",
  cloudfrontDomain: process.env.CLOUDFRONT_DOMAIN ?? "",
  cloudfrontKeyId: process.env.CLOUDFRONT_KEY_ID ?? "",
  cloudfrontPrivateKey: process.env.CLOUDFRONT_PRIVATE_KEY ?? "",
  allowJwtBypass: process.env.ALLOW_JWT_BYPASS === "true",
  allowExpiredTokens: process.env.ALLOW_EXPIRED_TOKENS === "true",
  authMode: process.env.AUTH_MODE ?? "cognito",
  localJwtSecret: process.env.LOCAL_JWT_SECRET ?? "local-dev-secret",
  smtpHost: process.env.SMTP_HOST ?? "smtp.gmail.com",
  smtpPort: Number(process.env.SMTP_PORT ?? 465),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpFrom: process.env.SMTP_FROM ?? "",
  pushWebhookUrl: process.env.PUSH_WEBHOOK_URL ?? "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? "",
  stripeSuccessUrl: process.env.STRIPE_SUCCESS_URL ?? "",
  stripeCancelUrl: process.env.STRIPE_CANCEL_URL ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripePricePhp: process.env.STRIPE_PRICE_PHP ?? "",
  stripePricePlus: process.env.STRIPE_PRICE_PHP_PLUS ?? "",
  stripePricePremium: process.env.STRIPE_PRICE_PHP_PREMIUM ?? "",
  stripePricePhpMonthly: process.env.STRIPE_PRICE_PHP_MONTHLY ?? "",
  stripePricePhpYearly: process.env.STRIPE_PRICE_PHP_YEARLY ?? "",
  stripePricePlusMonthly: process.env.STRIPE_PRICE_PHP_PLUS_MONTHLY ?? "",
  stripePricePlusYearly: process.env.STRIPE_PRICE_PHP_PLUS_YEARLY ?? "",
  stripePricePremiumMonthly: process.env.STRIPE_PRICE_PHP_PREMIUM_MONTHLY ?? "",
  stripePricePremiumYearly: process.env.STRIPE_PRICE_PHP_PREMIUM_YEARLY ?? "",
  mediaMaxMb: Number(process.env.MEDIA_MAX_MB ?? 25),
  videoMaxMb: Number(process.env.VIDEO_MAX_MB ?? 200),
  publicApiBaseUrl: process.env.PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? "",
  adminWebUrl: process.env.ADMIN_WEB_URL ?? "",
  bookingActionSecret: process.env.BOOKING_ACTION_SECRET ?? process.env.LOCAL_JWT_SECRET ?? "local-dev-secret",
};
