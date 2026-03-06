import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = typeof res.locals?.requestId === "string" ? res.locals.requestId : undefined;
  const context = {
    requestId: requestId ?? null,
    method: req.method,
    path: req.originalUrl || req.url,
    userId: req.user?.id ?? null,
  };

  if (err instanceof ZodError) {
    console.error(
      JSON.stringify({
        level: "warn",
        event: "api_error",
        statusCode: 400,
        message: "Zod Validation Error",
        issues: err.issues,
        ...context,
      })
    );
    return res.status(400).json({ error: "Invalid request", issues: err.issues });
  }
  if (typeof err === "object" && err && "status" in err && "message" in err) {
    const status = typeof (err as any).status === "number" ? (err as any).status : 500;
    const message = typeof (err as any).message === "string" ? (err as any).message : "Internal server error";
    const payload = {
      level: status >= 500 ? "error" : "warn",
      event: "api_error",
      statusCode: status,
      message,
      ...context,
    };
    if (status >= 500) {
      console.error(JSON.stringify(payload));
    } else {
      console.log(JSON.stringify(payload));
    }
    return res.status(status).json({ error: message });
  }

  const defaultMessage = err instanceof Error ? err.message : String(err);
  console.error(
    JSON.stringify({
      level: "error",
      event: "api_error",
      statusCode: 500,
      message: defaultMessage,
      stack: err instanceof Error ? err.stack : undefined,
      ...context,
    })
  );
  if (process.env.NODE_ENV !== "production") {
    return res.status(500).json({
      error: "Internal server error",
      details: typeof err === "object" && err ? err : String(err),
    });
  }
  return res.status(500).json({ error: "Internal server error" });
}
