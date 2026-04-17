import express from "express";
import cors from "cors";
import helmet from "helmet";

import routes from "./routes";
import { stripeWebhook } from "./controllers/billing.controller";
import { errorHandler } from "./middlewares/error";
import { requestLogger } from "./middlewares/request-logger";
import { env } from "./config/env";
import { isApiReady } from "./config/readiness";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  // Render and other platforms may send health checks to `/` by default.
  // Returning 200 here avoids noisy 404s and prevents false-negative health checks.
  app.get("/", (_req, res) => res.status(200).json({ ok: true }));
  app.head("/", (_req, res) => res.sendStatus(200));

  app.use((req, res, next) => {
    if (!isApiReady()) {
      const p = req.path ?? "";
      if (p.startsWith("/api") && !p.startsWith("/api/health")) {
        res.setHeader("Retry-After", "5");
        return res.status(503).json({ error: "Service is starting up. Try again shortly.", ready: false });
      }
    }
    return next();
  });

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  const allowedOrigins = new Set<string>();
  const addOrigin = (value?: string) => {
    if (!value) return;
    if (value === "*") {
      allowedOrigins.add("*");
      return;
    }
    try {
      const url = new URL(value);
      allowedOrigins.add(url.origin);
    } catch {
      allowedOrigins.add(value);
    }
  };
  addOrigin(env.adminWebUrl);
  (env.corsOrigins ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .forEach(addOrigin);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.has("*")) return callback(null, true);
        if (allowedOrigins.has(origin)) return callback(null, true);
        
        // Auto-allow localhost for development convenience
        if (env.nodeEnv !== "production" && origin.includes("localhost")) {
          return callback(null, true);
        }
        
        return callback(new Error(`Origin ${origin} not allowed by CORS`), false);
      },
      credentials: true,
    })
  );
  app.use(requestLogger);
  const bodyLimit = env.requestBodyLimit ?? "1mb";
  app.post("/api/billing/webhook", express.raw({ type: "application/json", limit: bodyLimit }), stripeWebhook);
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: false, limit: bodyLimit }));
  app.use((req, res, next) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && !req.path.startsWith("/api/billing/webhook")) {
      const contentType = req.headers["content-type"] ?? "";
      if (!contentType.toString().includes("application/json")) {
        return res.status(415).json({ error: "Content-Type must be application/json" });
      }
    }
    return next();
  });

  app.use("/api", routes);
  app.use(errorHandler);

  return app;
}
