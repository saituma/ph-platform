import pino from "pino";
import { env } from "../config/env";

const level = env.logLevel ?? "info";
const isDev = env.nodeEnv !== "production" && env.nodeEnv !== "test";

export const logger = pino({
  level,
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }
    : {}),
  base: { service: "ph-api" },
});

export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
