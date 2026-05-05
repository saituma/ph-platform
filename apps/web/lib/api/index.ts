// Re-export the base API slice and all shared types
export { apiSlice } from "../core";
export type {
  ApiPayload,
  EnquiryRecord,
  AdminProfileUser,
  AdminProfileSettings,
  AdminProfileResponse,
  DashboardKpis,
  DashboardTrends,
  DashboardTopAthlete,
  DashboardTierDistribution,
  DashboardWeeklyVolume,
  DashboardWeeklyProgress,
  DashboardHighlight,
  DashboardProgramOpsItem,
  DashboardBookingToday,
  DashboardResponse,
  TrainingSnapshotRow,
  AdminRunTrackingRow,
  AdminRunTrackingResponse,
  AdminTrainingQuestionnaireRow,
  UserListRow,
  UserOnboardingGuardian,
  UserOnboardingAthlete,
  UserOnboardingResponse,
  BookingStatus,
  BookingRecord,
  BookingServiceRecord,
  BookingAvailabilitySlot,
  BookingAvailabilityItem,
} from "../core";

// Re-export all domain endpoint hooks
export * from "./admin";
export * from "./users";
export * from "./bookings";
export * from "./messaging";
export * from "./content";
export * from "./programs";
export * from "./nutrition";
export * from "./tracking";
export * from "./enquiries";
export * from "./physio";
export * from "./media";
