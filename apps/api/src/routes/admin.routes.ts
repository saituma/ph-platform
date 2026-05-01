import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/roles";
import * as AdminUserController from "../controllers/admin/user.controller";
import * as AdminTeamController from "../controllers/admin/team.controller";
import * as AdminProgramController from "../controllers/admin/program.controller";
import * as AdminBookingController from "../controllers/admin/booking.controller";
import * as AdminMessageController from "../controllers/admin/message.controller";
import * as AdminAthletePlanController from "../controllers/admin/athlete-plan.controller";
import * as AdminProgramBuilderController from "../controllers/admin/program-builder.controller";
import * as AdminOnboardingConfigController from "../controllers/admin/onboarding-config.controller";
import * as AdminPortalConfigController from "../controllers/admin/portal-config.controller";
import * as AdminSettingsController from "../controllers/admin/settings.controller";
import * as AdminVideoController from "../controllers/admin/video.controller";
import * as TrackingGoalsController from "../controllers/tracking-goals.controller";

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
router.post("/admin/teams", AdminTeamController.createTeamAdminDetails);
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

// Portal Config (landing page copy)
router.get("/admin/portal-config", AdminPortalConfigController.getPortalConfigDetails);
router.put("/admin/portal-config", AdminPortalConfigController.updatePortalConfigDetails);

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

// Training Insights
router.get("/admin/training-snapshot", AdminAthletePlanController.listTrainingSnapshotAdmin);
router.get("/admin/tracking/runs", AdminAthletePlanController.listRunTrackingAdmin);
router.get("/admin/training-questionnaires", AdminAthletePlanController.listTrainingQuestionnaireAnswersAdmin);
router.get(
  "/admin/users/:userId/program-section-completions",
  AdminAthletePlanController.listProgramSectionCompletionsAdmin,
);

// Program Builder
router.get("/admin/programs/:programId/full", AdminProgramBuilderController.getFullProgram);
router.get("/admin/programs/:programId/modules", AdminProgramBuilderController.listModules);
router.post("/admin/programs/:programId/modules", AdminProgramBuilderController.createModule);
router.patch("/admin/programs/:programId/modules/:moduleId", AdminProgramBuilderController.updateModule);
router.delete("/admin/programs/:programId/modules/:moduleId", AdminProgramBuilderController.deleteModule);
router.patch("/admin/programs/:programId/modules/reorder", AdminProgramBuilderController.reorderModules);
router.get("/admin/modules/:moduleId/sessions", AdminProgramBuilderController.listSessions);
router.post("/admin/programs/:programId/modules/:moduleId/sessions", AdminProgramBuilderController.createSession);
router.patch("/admin/sessions/:sessionId", AdminProgramBuilderController.updateSession);
router.delete("/admin/sessions/:sessionId", AdminProgramBuilderController.deleteSession);
router.get("/admin/sessions/:sessionId/exercises", AdminProgramBuilderController.listSessionExercises);
router.patch("/admin/session-exercises/:id", AdminProgramBuilderController.updateSessionExercise);
router.patch("/admin/sessions/:sessionId/exercises/reorder", AdminProgramBuilderController.reorderSessionExercises);

// Adult Athletes & Program Assignments
router.get("/admin/adult-athletes", AdminProgramBuilderController.listAdultAthletes);
router.get("/admin/adult-athletes/:athleteId", AdminProgramBuilderController.getAthleteDetail);
router.post("/admin/programs/:programId/assignments", AdminProgramBuilderController.assignProgram);
router.delete("/admin/program-assignments/:assignmentId", AdminProgramBuilderController.unassignProgram);

// Programs & Exercises
router.post("/admin/enrollments", AdminProgramController.assignProgram);
router.post("/admin/programs", AdminProgramController.createProgram);
router.get("/admin/programs", AdminProgramController.listPrograms);
router.patch("/admin/programs/:programId", AdminProgramController.updateProgram);
router.delete("/admin/programs/:programId", AdminProgramController.deleteProgram);
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

// Tracking Goals
router.get("/admin/tracking-goals", TrackingGoalsController.listGoals);
router.post("/admin/tracking-goals", TrackingGoalsController.createGoal);
router.patch("/admin/tracking-goals/:id", TrackingGoalsController.updateGoal);
router.delete("/admin/tracking-goals/:id", TrackingGoalsController.deleteGoal);

export default router;
