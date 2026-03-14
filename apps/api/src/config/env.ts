import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { z } from "zod";

const envPathCandidates = [
  process.env.DOTENV_PATH,
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "apps/api/.env"),
  path.resolve(__dirname, "../../.env"),
].filter(Boolean) as string[];

const resolvedEnvPath = envPathCandidates.find((candidate) => fs.existsSync(candidate));
dotenv.config({ path: resolvedEnvPath, override: true });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DATABASE_SSL: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_DEFAULT_REGION: z.string().optional(),
  COGNITO_USER_POOL_ID: z.string().optional(),
  COGNITO_CLIENT_ID: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  CLOUDFRONT_DOMAIN: z.string().optional(),
  CLOUDFRONT_KEY_ID: z.string().optional(),
  CLOUDFRONT_PRIVATE_KEY: z.string().optional(),
  ALLOW_JWT_BYPASS: z.string().optional(),
  ALLOW_EXPIRED_TOKENS: z.string().optional(),
  AUTH_MODE: z.string().optional(),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  PUSH_WEBHOOK_URL: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_SUCCESS_URL: z.string().min(1, "STRIPE_SUCCESS_URL is required"),
  STRIPE_CANCEL_URL: z.string().min(1, "STRIPE_CANCEL_URL is required"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),
  STRIPE_PRICE_PHP: z.string().optional(),
  STRIPE_PRICE_PHP_PLUS: z.string().optional(),
  STRIPE_PRICE_PHP_PREMIUM: z.string().optional(),
  STRIPE_PRICE_PHP_MONTHLY: z.string().optional(),
  STRIPE_PRICE_PHP_YEARLY: z.string().optional(),
  STRIPE_PRICE_PHP_PLUS_MONTHLY: z.string().optional(),
  STRIPE_PRICE_PHP_PLUS_YEARLY: z.string().optional(),
  STRIPE_PRICE_PHP_PREMIUM_MONTHLY: z.string().optional(),
  STRIPE_PRICE_PHP_PREMIUM_YEARLY: z.string().optional(),
  MEDIA_MAX_MB: z.coerce.number().int().positive().optional(),
  VIDEO_MAX_MB: z.coerce.number().int().positive().optional(),
  PUBLIC_API_BASE_URL: z.string().optional(),
  API_BASE_URL: z.string().optional(),
  ADMIN_WEB_URL: z.string().min(1, "ADMIN_WEB_URL is required"),
  BOOKING_ACTION_SECRET: z.string().optional(),
  OPEN_AI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  EXPO_ACCESS_TOKEN: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),
  REQUEST_BODY_LIMIT: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const message = parsed.error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("; ");
  throw new Error(`Invalid environment configuration: ${message}`);
}

const raw = parsed.data;

export const env = {
  port: raw.PORT,
  nodeEnv: raw.NODE_ENV,
  databaseUrl: raw.DATABASE_URL,
  databaseSsl: raw.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  awsRegion: raw.AWS_REGION ?? raw.AWS_DEFAULT_REGION ?? "us-east-1",
  cognitoUserPoolId: raw.COGNITO_USER_POOL_ID ?? "",
  cognitoClientId: raw.COGNITO_CLIENT_ID ?? "",
  s3Bucket: raw.S3_BUCKET ?? "",
  cloudfrontDomain: raw.CLOUDFRONT_DOMAIN ?? "",
  cloudfrontKeyId: raw.CLOUDFRONT_KEY_ID ?? "",
  cloudfrontPrivateKey: raw.CLOUDFRONT_PRIVATE_KEY ?? "",
  allowJwtBypass: raw.ALLOW_JWT_BYPASS === "true",
  allowExpiredTokens: raw.ALLOW_EXPIRED_TOKENS === "true",
  authMode: raw.AUTH_MODE ?? "cognito",
  jwtSecret: raw.JWT_SECRET,
  smtpHost: raw.SMTP_HOST ?? "smtp.gmail.com",
  smtpPort: raw.SMTP_PORT ?? 465,
  smtpUser: raw.SMTP_USER ?? "",
  smtpPass: raw.SMTP_PASS ?? "",
  smtpFrom: raw.SMTP_FROM ?? "",
  pushWebhookUrl: raw.PUSH_WEBHOOK_URL ?? "",
  stripeSecretKey: raw.STRIPE_SECRET_KEY,
  stripePublishableKey: raw.STRIPE_PUBLISHABLE_KEY ?? "",
  stripeSuccessUrl: raw.STRIPE_SUCCESS_URL,
  stripeCancelUrl: raw.STRIPE_CANCEL_URL,
  stripeWebhookSecret: raw.STRIPE_WEBHOOK_SECRET,
  stripePricePhp: raw.STRIPE_PRICE_PHP ?? "",
  stripePricePlus: raw.STRIPE_PRICE_PHP_PLUS ?? "",
  stripePricePremium: raw.STRIPE_PRICE_PHP_PREMIUM ?? "",
  stripePricePhpMonthly: raw.STRIPE_PRICE_PHP_MONTHLY ?? "",
  stripePricePhpYearly: raw.STRIPE_PRICE_PHP_YEARLY ?? "",
  stripePricePlusMonthly: raw.STRIPE_PRICE_PHP_PLUS_MONTHLY ?? "",
  stripePricePlusYearly: raw.STRIPE_PRICE_PHP_PLUS_YEARLY ?? "",
  stripePricePremiumMonthly: raw.STRIPE_PRICE_PHP_PREMIUM_MONTHLY ?? "",
  stripePricePremiumYearly: raw.STRIPE_PRICE_PHP_PREMIUM_YEARLY ?? "",
  mediaMaxMb: raw.MEDIA_MAX_MB ?? 25,
  videoMaxMb: raw.VIDEO_MAX_MB ?? 200,
  publicApiBaseUrl: raw.PUBLIC_API_BASE_URL ?? raw.API_BASE_URL ?? "",
  adminWebUrl: raw.ADMIN_WEB_URL,
  bookingActionSecret: raw.BOOKING_ACTION_SECRET ?? raw.JWT_SECRET,
  openaiApiKey: raw.OPEN_AI_API_KEY,
  expoAccessToken: raw.EXPO_ACCESS_TOKEN ?? "",
  corsOrigins: raw.CORS_ORIGINS ?? "",
  requestBodyLimit: raw.REQUEST_BODY_LIMIT ?? "1mb",
};
