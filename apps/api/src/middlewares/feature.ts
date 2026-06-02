import type { NextFunction, Request, Response } from "express";
import type { FeatureKey } from "@ph/billing";
import {
  getCurrentPlanFeaturesForManagedTeam,
  getCurrentPlanFeaturesForUser,
} from "../services/billing/feature-access.service";

export function requireFeature(key: FeatureKey) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (req.user.role === "admin" || req.user.role === "superAdmin") return next();

    const features =
      req.user.role === "team_coach"
        ? await getCurrentPlanFeaturesForManagedTeam(req.user.id)
        : await getCurrentPlanFeaturesForUser(req.user.id);
    if (features.has(key)) return next();

    return res.status(403).json({
      error: "Upgrade your plan to access this feature.",
      missingFeature: key,
      code: "FEATURE_NOT_IN_PLAN",
    });
  };
}
