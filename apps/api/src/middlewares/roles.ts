import type { NextFunction, Request, Response } from "express";

import type { AppRole } from "../types/auth";

export function requireRole(roles: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}
