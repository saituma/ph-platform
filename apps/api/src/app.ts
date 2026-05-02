import express from "express";
import compression from "compression";
import cors from "cors";
import helmet from "helmet";

import routes from "./routes";
import { healthCheck } from "./controllers/health.controller";
import { stripeWebhook } from "./controllers/billing.controller";
import { errorHandler } from "./middlewares/error";
import { requestLogger } from "./middlewares/request-logger";
import { rateLimiters } from "./lib/rateLimiter";
import { env } from "./config/env";
import { isApiReady } from "./config/readiness";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  // Render and other platforms may send health checks to `/` by default.
  // Returning 200 here avoids noisy 404s and prevents false-negative health checks.
  app.get("/", (_req, res) => res.status(200).json({ ok: true }));
  app.head("/", (_req, res) => res.sendStatus(200));

  // Load balancers / monitors often probe `/health` without the `/api` prefix.
  app.get("/health", healthCheck);
  app.head("/health", (_req, res) => res.sendStatus(200));

  app.use((req, res, next) => {
    if (!isApiReady()) {
      const p = req.path ?? "";
      if (p.startsWith("/api") && !p.startsWith("/api/health") && !p.startsWith("/api/v1/health")) {
        res.setHeader("Retry-After", "5");
        return res.status(503).json({ error: "Service is starting up. Try again shortly.", ready: false });
      }
    }
    return next();
  });

  app.use(compression());
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  const allowedOrigins = new Set<string>();
  const allowedWildcards: string[] = [];

  const addOrigin = (value?: string) => {
    if (!value) return;
    if (value === "*") {
      allowedOrigins.add("*");
      return;
    }
    // Wildcard pattern e.g. *.vercel.app or https://*.vercel.app
    if (value.includes("*")) {
      const escaped = value.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
      allowedWildcards.push(escaped);
      return;
    }
    try {
      const url = new URL(value);
      allowedOrigins.add(url.origin);
    } catch {
      allowedOrigins.add(value);
    }
  };

  const originAllowed = (origin: string) => {
    if (allowedOrigins.has(origin)) return true;
    return allowedWildcards.some((pattern) => new RegExp(`^${pattern}$`).test(origin));
  };

  addOrigin(env.adminWebUrl);
  // Always allow localhost for onboarding/web dev
  addOrigin("http://localhost:3000");
  addOrigin("http://localhost:3001");
  addOrigin("http://127.0.0.1:3000");
  // Vite dev (onboarding / web)
  addOrigin("http://localhost:5173");
  addOrigin("http://127.0.0.1:5173");

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
        if (originAllowed(origin)) return callback(null, true);

        // Final fallback for any localhost variation
        if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
          return callback(null, true);
        }

        return callback(new Error(`Origin ${origin} not allowed by CORS`), false);
      },
      credentials: true,
    }),
  );
  app.use(requestLogger);
  const bodyLimit = env.requestBodyLimit ?? "1mb";
  app.post("/api/billing/webhook", express.raw({ type: "application/json", limit: bodyLimit }), stripeWebhook);
  app.post("/api/v1/billing/webhook", express.raw({ type: "application/json", limit: bodyLimit }), stripeWebhook);
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: false, limit: bodyLimit }));
  app.use((req, res, next) => {
    const path = req.path ?? "";
    const isStripeWebhook = path.startsWith("/api/billing/webhook") || path.startsWith("/api/v1/billing/webhook");
    const isMediaUpload = path.startsWith("/api/media/upload") || path.startsWith("/api/v1/media/upload");
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && !isStripeWebhook && !isMediaUpload) {
      const contentType = req.headers["content-type"] ?? "";
      if (!contentType.toString().includes("application/json")) {
        return res.status(415).json({ error: "Content-Type must be application/json" });
      }
    }
    return next();
  });

  // Versioned API — canonical path
  app.use("/api/v1", rateLimiters.api, routes);

  // Legacy unversioned API — backwards compatible, with deprecation headers
  app.use(
    "/api",
    (_req, res, next) => {
      res.setHeader("X-API-Version", "v1");
      res.setHeader("X-API-Deprecated", "Use /api/v1 prefix");
      next();
    },
    rateLimiters.api,
    routes,
  );
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });
  app.use(errorHandler);

  return app;
}
