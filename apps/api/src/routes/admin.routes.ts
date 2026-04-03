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
  deleteThreadMessages,
  markThreadRead,
  sendAdminMessage,
  listAllUsers,
  updateExerciseItem,
  updateAdminPreferencesDetails,
  updateAdminProfileDetails,
  putMessagingAccessDetails,
  updateProgramTier,
  updateOnboardingConfigDetails,
  getPhpPlusTabsAdmin,
  putPhpPlusTabsAdmin,
  postPhpPlusTabsAdmin,
  deletePhpPlusTabsAdmin,
  createBookingAdmin,
  getBooking,
  listProgramSectionCompletionsAdmin,
  getPremiumPlanAdmin,
  clonePremiumPlanAdmin,
  createPremiumPlanSessionAdmin,
  updatePremiumPlanSessionAdmin,
  deletePremiumPlanSessionAdmin,
  addPremiumPlanExerciseAdmin,
  updatePremiumPlanExerciseAdmin,
  deletePremiumPlanExerciseAdmin,
  listTrainingSnapshotAdmin,
  listPremiumSessionCheckinsAdmin,
  provisionGuardianWithOnboarding,
  provisionTeamWithPlan,
} from "../controllers/admin.controller";
import { listFoodDiaryAdmin, reviewFoodDiaryAdmin } from "../controllers/food-diary.controller";

const router = Router();

router.use("/admin", requireAuth, requireRole(["coach", "admin", "superAdmin"]));

router.get("/admin/users", listAllUsers);
router.post("/admin/users/provision", provisionGuardianWithOnboarding);
router.post("/admin/teams/provision", provisionTeamWithPlan);
router.get("/admin/training-snapshot", listTrainingSnapshotAdmin);
router.post("/admin/users/:userId/block", blockUser);
router.delete("/admin/users/:userId", deleteUser);
router.get("/admin/dashboard", getDashboard);
router.get("/admin/profile", getAdminProfileDetails);
router.put("/admin/profile", updateAdminProfileDetails);
router.put("/admin/preferences", updateAdminPreferencesDetails);
router.put("/admin/messaging-access", putMessagingAccessDetails);
router.get("/admin/onboarding-config", getOnboardingConfigDetails);
router.put("/admin/onboarding-config", updateOnboardingConfigDetails);
router.get("/admin/php-plus-tabs", getPhpPlusTabsAdmin);
router.put("/admin/php-plus-tabs", putPhpPlusTabsAdmin);
router.post("/admin/php-plus-tabs", postPhpPlusTabsAdmin);
router.delete("/admin/php-plus-tabs", deletePhpPlusTabsAdmin);
router.get("/admin/bookings", listBookings);
router.post("/admin/bookings", createBookingAdmin);
router.get("/admin/bookings/:bookingId", getBooking);
router.patch("/admin/bookings/:bookingId", updateBookingStatus);
router.get("/admin/availability", listAvailability);
router.get("/admin/videos", listVideosAdmin);
router.get("/admin/messages/threads", listMessageThreads);
router.get("/admin/messages/:userId", listThreadMessages);
router.post("/admin/messages/:userId", sendAdminMessage);
router.delete("/admin/messages/:userId", deleteThreadMessages);
router.post("/admin/messages/:userId/read", markThreadRead);
router.get("/admin/users/:userId/onboarding", getOnboarding);
router.get("/admin/users/:userId/program-section-completions", listProgramSectionCompletionsAdmin);
router.get("/admin/users/:userId/premium-plan", getPremiumPlanAdmin);
router.get("/admin/users/:userId/premium-session-checkins", listPremiumSessionCheckinsAdmin);
router.post("/admin/users/:userId/premium-plan/clone", clonePremiumPlanAdmin);
router.post("/admin/users/:userId/premium-plan/sessions", createPremiumPlanSessionAdmin);
router.patch("/admin/users/:userId/premium-plan/sessions/:sessionId", updatePremiumPlanSessionAdmin);
router.delete("/admin/users/:userId/premium-plan/sessions/:sessionId", deletePremiumPlanSessionAdmin);
router.post("/admin/users/:userId/premium-plan/sessions/:sessionId/exercises", addPremiumPlanExerciseAdmin);
router.patch("/admin/users/:userId/premium-plan/exercises/:planExerciseId", updatePremiumPlanExerciseAdmin);
router.delete("/admin/users/:userId/premium-plan/exercises/:planExerciseId", deletePremiumPlanExerciseAdmin);
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
