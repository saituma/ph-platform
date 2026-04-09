import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/roles";
import * as AdminUserController from "../controllers/admin/user.controller";
import * as AdminTeamController from "../controllers/admin/team.controller";
import * as AdminProgramController from "../controllers/admin/program.controller";
import * as AdminBookingController from "../controllers/admin/booking.controller";
import * as AdminMessageController from "../controllers/admin/message.controller";
import * as AdminAthletePlanController from "../controllers/admin/athlete-plan.controller";
import * as AdminOnboardingConfigController from "../controllers/admin/onboarding-config.controller";
import * as AdminSettingsController from "../controllers/admin/settings.controller";
import * as AdminVideoController from "../controllers/admin/video.controller";

import { listFoodDiaryAdmin, reviewFoodDiaryAdmin } from "../controllers/food-diary.controller";

const router = Router();

router.use("/admin", requireAuth, requireRole(["coach", "admin", "superAdmin"]));

// User & Provisioning
router.get("/admin/users", AdminUserController.listAllUsers);
router.post("/admin/users/provision", AdminUserController.provisionGuardianWithOnboarding);
router.post("/admin/users/provision-adult", AdminUserController.provisionAdultAthlete);
router.post("/admin/users/:userId/reset-password", AdminUserController.resetPassword);
router.post("/admin/users/:userId/block", AdminUserController.blockUser);
router.delete("/admin/users/:userId", AdminUserController.deleteUser);
router.get("/admin/users/:userId/onboarding", AdminUserController.getOnboarding);
router.post("/admin/users/program-tier", AdminUserController.updateProgramTier);

// Teams
router.get("/admin/teams", AdminTeamController.listTeamsAdminDetails);
router.get("/admin/teams/:teamName", AdminTeamController.getTeamAdminDetails);
router.get("/admin/teams/:teamName/members/:athleteId", AdminTeamController.getTeamMemberAdminDetails);
router.patch("/admin/teams/:teamName/members/:athleteId", AdminTeamController.updateTeamMemberAdminDetails);
router.post("/admin/teams/:teamName/athletes/:athleteId/attach", AdminTeamController.attachAthleteToTeamAdminDetails);
router.post("/admin/teams/provision", AdminUserController.provisionTeamWithPlan); // Provisioning uses createGuardianWithOnboardingAdmin
router.post("/admin/teams/defaults", AdminTeamController.saveTeamDefaultsAdmin);

// Dashboard & Settings
router.get("/admin/dashboard", AdminSettingsController.getDashboard);
router.get("/admin/profile", AdminSettingsController.getAdminProfileDetails);
router.put("/admin/profile", AdminSettingsController.updateAdminProfileDetails);
router.put("/admin/preferences", AdminSettingsController.updateAdminPreferencesDetails);
router.put("/admin/messaging-access", AdminSettingsController.putMessagingAccessDetails);

// Onboarding Config
router.get("/admin/onboarding-config", AdminOnboardingConfigController.getOnboardingConfigDetails);
router.put("/admin/onboarding-config", AdminOnboardingConfigController.updateOnboardingConfigDetails);
router.get("/admin/php-plus-tabs", AdminOnboardingConfigController.getPhpPlusTabsAdmin);
router.put("/admin/php-plus-tabs", AdminOnboardingConfigController.putPhpPlusTabsAdmin);
router.post("/admin/php-plus-tabs", AdminOnboardingConfigController.postPhpPlusTabsAdmin);
router.delete("/admin/php-plus-tabs", AdminOnboardingConfigController.deletePhpPlusTabsAdmin);

// Bookings & Availability
router.get("/admin/bookings", AdminBookingController.listBookings);
router.post("/admin/bookings", AdminBookingController.createBookingAdmin);
router.get("/admin/bookings/:bookingId", AdminBookingController.getBooking);
router.patch("/admin/bookings/:bookingId", AdminBookingController.updateBookingStatus);
router.get("/admin/availability", AdminBookingController.listAvailability);

// Videos
router.get("/admin/videos", AdminVideoController.listVideosAdmin);

// Messaging
router.get("/admin/messages/threads", AdminMessageController.listMessageThreads);
router.get("/admin/messages/:userId", AdminMessageController.listThreadMessages);
router.post("/admin/messages/:userId", AdminMessageController.sendAdminMessage);
router.delete("/admin/messages/:userId", AdminMessageController.deleteThreadMessages);
router.post("/admin/messages/:userId/read", AdminMessageController.markThreadRead);

// Athlete Plans (Premium) & Progress
router.get("/admin/training-snapshot", AdminAthletePlanController.listTrainingSnapshotAdmin);
router.get("/admin/users/:userId/program-section-completions", AdminAthletePlanController.listProgramSectionCompletionsAdmin);
router.get("/admin/users/:userId/premium-plan", AdminAthletePlanController.getPremiumPlanAdmin);
router.get("/admin/users/:userId/premium-session-checkins", AdminAthletePlanController.listPremiumSessionCheckinsAdmin);
router.post("/admin/users/:userId/premium-plan/clone", AdminAthletePlanController.clonePremiumPlanAdmin);
router.post("/admin/users/:userId/premium-plan/sessions", AdminAthletePlanController.createPremiumPlanSessionAdmin);
router.patch("/admin/users/:userId/premium-plan/sessions/:sessionId", AdminAthletePlanController.updatePremiumPlanSessionAdmin);
router.delete("/admin/users/:userId/premium-plan/sessions/:sessionId", AdminAthletePlanController.deletePremiumPlanSessionAdmin);
router.post("/admin/users/:userId/premium-plan/sessions/:sessionId/exercises", AdminAthletePlanController.addPremiumPlanExerciseAdmin);
router.patch("/admin/users/:userId/premium-plan/exercises/:planExerciseId", AdminAthletePlanController.updatePremiumPlanExerciseAdmin);
router.delete("/admin/users/:userId/premium-plan/exercises/:planExerciseId", AdminAthletePlanController.deletePremiumPlanExerciseAdmin);

// Programs & Exercises
router.post("/admin/enrollments", AdminProgramController.assignProgram);
router.post("/admin/programs", AdminProgramController.createProgram);
router.get("/admin/programs", AdminProgramController.listPrograms);
router.patch("/admin/programs/:programId", AdminProgramController.updateProgram);
router.get("/admin/exercises", AdminProgramController.listExerciseLibrary);
router.post("/admin/exercises", AdminProgramController.createExerciseItem);
router.patch("/admin/exercises/:exerciseId", AdminProgramController.updateExerciseItem);
router.delete("/admin/exercises/:exerciseId", AdminProgramController.deleteExerciseItem);
router.post("/admin/sessions", AdminProgramController.createSessionItem);
router.post("/admin/session-exercises", AdminProgramController.addExercise);
router.delete("/admin/session-exercises/:sessionExerciseId", AdminProgramController.deleteSessionExerciseItem);

// Food Diary
router.get("/admin/food-diary", listFoodDiaryAdmin);
router.post("/admin/food-diary/:entryId/review", reviewFoodDiaryAdmin);

export default router;
