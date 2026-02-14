import express from "express";
import cors from "cors";

import routes from "./routes";
import { stripeWebhook } from "./controllers/billing.controller";
import { errorHandler } from "./middlewares/error";

export function createApp() {
  const app = express();

  app.use(cors());
  app.post("/api/billing/webhook", express.raw({ type: "application/json" }), stripeWebhook);
  app.use(express.json());

  app.use("/api", routes);
  app.use(errorHandler);

  return app;
}
