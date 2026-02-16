import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    console.error("Zod Validation Error:", JSON.stringify(err.issues, null, 2));
    return res.status(400).json({ error: "Invalid request", issues: err.issues });
  }
  if (typeof err === "object" && err && "status" in err && "message" in err) {
    const status = typeof (err as any).status === "number" ? (err as any).status : 500;
    const message = typeof (err as any).message === "string" ? (err as any).message : "Internal server error";
    console.error(`API Error (${status}):`, message);
    return res.status(status).json({ error: message });
  }
  console.error("Unhandled error:", err);
  if (process.env.NODE_ENV !== "production") {
    return res.status(500).json({
      error: "Internal server error",
      details: typeof err === "object" && err ? err : String(err),
    });
  }
  return res.status(500).json({ error: "Internal server error" });
}
