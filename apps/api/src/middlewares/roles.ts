import type { NextFunction, Request, Response } from "express";

import { userHasAnyRole } from "../lib/user-roles";

export function requireRole(roles: readonly string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !userHasAnyRole(req.user.role, roles)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}
