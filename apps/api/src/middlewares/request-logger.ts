import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";

function getClientIp(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() ?? req.ip;
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0];
  }
  return req.ip;
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = process.hrtime.bigint();
  const requestIdHeader = req.header("x-request-id");
  const requestId = requestIdHeader && requestIdHeader.trim().length > 0 ? requestIdHeader.trim() : randomUUID();

  res.locals.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  let finished = false;
  const method = req.method;
  const path = req.originalUrl || req.url;
  const ip = getClientIp(req);

  const logCompletion = (aborted: boolean) => {
    if (finished) return;
    finished = true;

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const statusCode = aborted ? 499 : res.statusCode;
    const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";

    const authId = (res.locals as { authUserId?: number }).authUserId;

    const payload = {
      level,
      event: "http_request",
      requestId,
      method,
      path,
      statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      ip,
      // res.locals.authUserId is set at end of requireAuth (mirrors req.user) for rare cases where close fires oddly.
      userId: req.user?.id ?? authId ?? null,
      role: req.user?.role ?? null,
    };

    if (statusCode >= 500) {
      console.error(JSON.stringify(payload));
      return;
    }
    console.log(JSON.stringify(payload));
  };

  res.on("finish", () => logCompletion(false));
  res.on("close", () => {
    if (!res.writableEnded) {
      logCompletion(true);
    }
  });

  next();
}
