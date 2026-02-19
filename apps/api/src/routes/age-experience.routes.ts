import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/roles";
import {
  createAgeExperience,
  deleteAgeExperience,
  getAgeExperience,
  listAgeExperience,
  updateAgeExperience,
} from "../controllers/age-experience.controller";

const router = Router();

router.get("/experience/age", requireAuth, getAgeExperience);

router.use("/admin/age-experience", requireAuth, requireRole(["coach", "admin", "superAdmin"]));
router.get("/admin/age-experience", listAgeExperience);
router.post("/admin/age-experience", createAgeExperience);
router.patch("/admin/age-experience/:id", updateAgeExperience);
router.delete("/admin/age-experience/:id", deleteAgeExperience);

export default router;
