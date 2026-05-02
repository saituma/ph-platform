import * as Sentry from "@sentry/node";
import { env } from "./config/env";
import { logger } from "./lib/logger";

if (env.sentryDsn) {
  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.nodeEnv,
    tracesSampleRate: env.nodeEnv === "production" ? 0.1 : 1.0,
  });
  logger.info("Sentry API error tracking initialized");
}

import { fatalExit } from "./lib/fatal-exit";
import { startServer } from "./server";

process.on("unhandledRejection", (reason) => {
  if (env.sentryDsn) Sentry.captureException(reason);
  fatalExit("Unhandled promise rejection", reason, 1);
});

process.on("uncaughtException", (error) => {
  if (env.sentryDsn) Sentry.captureException(error);
  fatalExit("Uncaught exception", error, 1);
});

void startServer();
