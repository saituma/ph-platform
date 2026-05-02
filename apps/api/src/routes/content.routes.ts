import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/roles";
import {
  createContentItem,
  listHomeContent,
  listParentContent,
  listLegalContent,
  listLegalContentPublic,
  listAnnouncementsContent,
  listStories,
  listStoriesForAdmin,
  updateContentItem,
  getContentItem,
  deleteContent,
  submitTestimonial,
  listTestimonialSubmissions,
  approveTestimonialSubmission,
  rejectTestimonialSubmission,
  listParentCoursesHandler,
  getParentCourseHandler,
  createParentCourseHandler,
  updateParentCourseHandler,
  deleteParentCourseHandler,
  getParentCourseAiInsightController,
  getContentAiInsightController,
  replaceStoriesHandler,
  listGalleryItems,
  listTestimonials,
} from "../controllers/content.controller";

const router = Router();

router.get("/content/home", requireAuth, listHomeContent);
router.get("/content/parent-platform", requireAuth, listParentContent);
router.get("/content/legal", requireAuth, listLegalContent);
router.get("/content/announcements", requireAuth, listAnnouncementsContent);
router.get("/stories", requireAuth, listStories);
router.get("/content/stories", requireAuth, requireRole(["coach", "admin", "superAdmin"]), listStoriesForAdmin);
router.put("/content/stories", requireAuth, requireRole(["coach", "admin", "superAdmin"]), replaceStoriesHandler);
router.get("/content/legal/public", listLegalContentPublic);
router.get("/content/gallery", listGalleryItems);
router.post("/content/testimonials/submit", requireAuth, submitTestimonial);
router.get(
  "/content/testimonials/submissions",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  listTestimonialSubmissions,
);
router.post(
  "/content/testimonials/:submissionId/approve",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  approveTestimonialSubmission,
);
router.post(
  "/content/testimonials/:submissionId/reject",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  rejectTestimonialSubmission,
);
router.get("/content/testimonials", requireAuth, listTestimonials);
router.get("/content/courses", requireAuth, listParentCoursesHandler);
router.get("/content/parent-courses", requireAuth, listParentCoursesHandler);
router.get("/content/parent-courses/:courseId", requireAuth, getParentCourseHandler);
router.get("/content/parent-courses/:courseId/ai-insight", requireAuth, getParentCourseAiInsightController);
router.get("/content/:contentId", requireAuth, getContentItem);
router.get("/content/:contentId/ai-insight", requireAuth, getContentAiInsightController);
router.post("/content", requireAuth, requireRole(["coach", "admin", "superAdmin"]), createContentItem);
router.put("/content/:contentId", requireAuth, requireRole(["coach", "admin", "superAdmin"]), updateContentItem);
router.delete("/content/:contentId", requireAuth, requireRole(["coach", "admin", "superAdmin"]), deleteContent);
router.post(
  "/content/parent-courses",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  createParentCourseHandler,
);
router.put(
  "/content/parent-courses/:courseId",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  updateParentCourseHandler,
);
router.delete(
  "/content/parent-courses/:courseId",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  deleteParentCourseHandler,
);

export default router;
