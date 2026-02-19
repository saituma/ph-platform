import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/roles";
import {
  addExercise,
  assignProgram,
  createExerciseItem,
  createProgram,
  listPrograms,
  updateProgram,
  createSessionItem,
  deleteSessionExerciseItem,
  blockUser,
  deleteUser,
  deleteExerciseItem,
  getAdminProfileDetails,
  getOnboardingConfigDetails,
  getOnboarding,
  listExerciseLibrary,
  listBookings,
  updateBookingStatus,
  listAvailability,
  listVideosAdmin,
  getDashboard,
  listMessageThreads,
  listThreadMessages,
  markThreadRead,
  sendAdminMessage,
  listAllUsers,
  updateExerciseItem,
  updateAdminPreferencesDetails,
  updateAdminProfileDetails,
  updateProgramTier,
  updateOnboardingConfigDetails,
  createBookingAdmin,
} from "../controllers/admin.controller";
import { listFoodDiaryAdmin, reviewFoodDiaryAdmin } from "../controllers/food-diary.controller";

const router = Router();

router.use("/admin", requireAuth, requireRole(["coach", "admin", "superAdmin"]));

router.get("/admin/users", listAllUsers);
router.post("/admin/users/:userId/block", blockUser);
router.delete("/admin/users/:userId", deleteUser);
router.get("/admin/dashboard", getDashboard);
router.get("/admin/profile", getAdminProfileDetails);
router.put("/admin/profile", updateAdminProfileDetails);
router.put("/admin/preferences", updateAdminPreferencesDetails);
router.get("/admin/onboarding-config", getOnboardingConfigDetails);
router.put("/admin/onboarding-config", updateOnboardingConfigDetails);
router.get("/admin/bookings", listBookings);
router.post("/admin/bookings", createBookingAdmin);
router.patch("/admin/bookings/:bookingId", updateBookingStatus);
router.get("/admin/availability", listAvailability);
router.get("/admin/videos", listVideosAdmin);
router.get("/admin/messages/threads", listMessageThreads);
router.get("/admin/messages/:userId", listThreadMessages);
router.post("/admin/messages/:userId", sendAdminMessage);
router.post("/admin/messages/:userId/read", markThreadRead);
router.get("/admin/users/:userId/onboarding", getOnboarding);
router.post("/admin/users/program-tier", updateProgramTier);
router.post("/admin/enrollments", assignProgram);
router.post("/admin/programs", createProgram);
router.get("/admin/programs", listPrograms);
router.patch("/admin/programs/:programId", updateProgram);
router.get("/admin/exercises", listExerciseLibrary);
router.post("/admin/exercises", createExerciseItem);
router.patch("/admin/exercises/:exerciseId", updateExerciseItem);
router.delete("/admin/exercises/:exerciseId", deleteExerciseItem);
router.post("/admin/sessions", createSessionItem);
router.post("/admin/session-exercises", addExercise);
router.delete("/admin/session-exercises/:sessionExerciseId", deleteSessionExerciseItem);
router.get("/admin/food-diary", listFoodDiaryAdmin);
router.post("/admin/food-diary/:entryId/review", reviewFoodDiaryAdmin);

export default router;
