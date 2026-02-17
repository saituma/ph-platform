import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/roles";
import {
  createContentItem,
  listHomeContent,
  listParentContent,
  listLegalContent,
  listLegalContentPublic,
  updateContentItem,
  getContentItem,
  listParentCoursesHandler,
  getParentCourseHandler,
  createParentCourseHandler,
  updateParentCourseHandler,
} from "../controllers/content.controller";

const router = Router();

router.get("/content/home", requireAuth, listHomeContent);
router.get("/content/parent-platform", requireAuth, listParentContent);
router.get("/content/legal", requireAuth, listLegalContent);
router.get("/content/legal/public", listLegalContentPublic);
router.get("/content/parent-courses", requireAuth, listParentCoursesHandler);
router.get("/content/parent-courses/:courseId", requireAuth, getParentCourseHandler);
router.get("/content/:contentId", requireAuth, getContentItem);
router.post("/content", requireAuth, requireRole(["coach", "admin", "superAdmin"]), createContentItem);
router.put("/content/:contentId", requireAuth, requireRole(["coach", "admin", "superAdmin"]), updateContentItem);
router.post("/content/parent-courses", requireAuth, requireRole(["coach", "admin", "superAdmin"]), createParentCourseHandler);
router.put("/content/parent-courses/:courseId", requireAuth, requireRole(["coach", "admin", "superAdmin"]), updateParentCourseHandler);

export default router;
