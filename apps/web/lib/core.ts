import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";

// ── Shared types ─────────────────────────────────────────────
export type ApiPayload = Record<string, unknown>;

export type EnquiryRecord = {
  id: number;
  athleteType?: string | null;
  athleteName: string;
  age?: number | null;
  parentName?: string | null;
  phone: string;
  email: string;
  interestedIn: string;
  locationPreference?: string[] | null;
  groupNeeded?: boolean | null;
  teamName?: string | null;
  ageGroup?: string | null;
  squadSize?: number | null;
  availabilityDays?: string[] | null;
  availabilityTime?: string | null;
  goal?: string | null;
  photoUrl?: string | null;
  status: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminProfileUser = {
  id?: number;
  name?: string;
  email?: string;
  profilePicture?: string | null;
};

export type AdminProfileSettings = {
  title?: string | null;
  bio?: string | null;
  timezone?: string;
  notificationSummary?: string;
  workStartHour?: number;
  workStartMinute?: number;
  workEndHour?: number;
  workEndMinute?: number;
};

export type AdminProfileResponse = {
  user?: AdminProfileUser;
  settings?: AdminProfileSettings;
};

export type DashboardKpis = {
  totalAthletes: number;
  premiumClients: number;
  unreadMessages: number;
  bookingsToday: number;
};

export type DashboardTrends = {
  trainingLoad: number;
  messagingResponseRate: number;
  bookingsUtilization: number;
  trainingSeries?: number[];
  messagingSeries?: number[];
  bookingSeries?: number[];
};

export type DashboardTopAthlete = {
  name: string;
  team?: string | null;
  tier: string;
  score?: string | number | null;
};

export type DashboardTierDistribution = {
  total: number;
  program: number;
  premium: number;
  premiumPlus: number;
  pro: number;
};

export type DashboardWeeklyVolume = {
  bars?: number[];
  totals?: {
    messages: number;
    bookings: number;
    uploads: number;
  };
};

export type DashboardWeeklyProgress = {
  labels?: string[];
  series?: number[];
};

export type DashboardHighlight = {
  label: string;
  value: string;
  detail: string;
};

export type DashboardProgramOpsItem = {
  title: string;
  detail: string;
};

export type DashboardBookingToday = {
  serviceName?: string | null;
  type?: string | null;
  athleteName?: string | null;
  startsAt?: string | null;
};

export type DashboardResponse = {
  kpis?: DashboardKpis;
  trends?: DashboardTrends;
  weeklyVolume?: DashboardWeeklyVolume;
  topAthletes?: DashboardTopAthlete[];
  tierDistribution?: DashboardTierDistribution;
  weeklyProgress?: DashboardWeeklyProgress;
  highlights?: DashboardHighlight[];
  programOps?: DashboardProgramOpsItem[];
  bookingsToday?: DashboardBookingToday[];
};

export type TrainingSnapshotRow = {
  athleteId: number;
  athleteName: string;
  programTier?: string | null;
  guardianUserId: number;
  athleteUserId?: number | null;
  sectionCompletions30d: number;
  premiumExercisesTotal: number;
  premiumExercisesDone: number;
};

export type AdminRunTrackingRow = {
  id: number;
  userId: number;
  athleteId?: number | null;
  athleteName?: string | null;
  athleteType?: "youth" | "adult" | null;
  teamId?: number | null;
  teamName?: string | null;
  date: string;
  distanceMeters: number;
  durationSeconds: number;
  avgPace?: number | null;
  avgSpeed?: number | null;
  calories?: number | null;
  effortLevel?: number | null;
  feelTags?: unknown;
  notes?: string | null;
  sport?: string | null;
  visibility?: string | null;
  coordinates?: unknown;
};

export type AdminRunTrackingResponse = {
  summary: {
    totalRuns: number;
    totalMeters: number;
    totalSeconds: number;
    teamRunCount: number;
    adultSoloRunCount: number;
  };
  items: AdminRunTrackingRow[];
};

export type AdminTrainingQuestionnaireRow = {
  source: "program_section" | "premium_plan" | "workout_log" | string;
  id: number;
  athleteId: number;
  userId?: number | null;
  athleteName?: string | null;
  athleteType?: "youth" | "adult" | null;
  teamName?: string | null;
  title?: string | null;
  rpe?: number | null;
  soreness?: number | null;
  fatigue?: number | null;
  notes?: string | null;
  weightsUsed?: string | null;
  repsCompleted?: string | null;
  completedAt?: string | null;
};

export type UserListRow = {
  id: number;
  name: string;
  email: string;
  role?: string;
  isBlocked?: boolean;
  onboardingCompleted?: boolean;
  onboarding_completed?: boolean;
  createdAt?: string;
  updatedAt?: string;
  cognitoSub?: string | null;
  athleteId?: number | null;
  athleteName?: string | null;
  athleteAge?: number | null;
  athleteTeam?: string | null;
  athleteType?: "youth" | "adult" | null;
  preferredTrainingDays?: string[] | null;
  profilePicture?: string | null;
  programTier?: string | null;
  guardianProgramTier?: string | null;
  guardianEmail?: string | null;
};

export type UserOnboardingGuardian = {
  id?: number;
  email?: string;
  phoneNumber?: string;
  relationToAthlete?: string;
  currentProgramTier?: string | null;
  activeAthleteId?: number | null;
  createdAt?: string | null;
};

export type UserOnboardingAthlete = {
  id?: number;
  name?: string;
  age?: number;
  birthDate?: string | null;
  team?: string;
  trainingPerWeek?: number;
  injuries?: string | null;
  growthNotes?: string | null;
  performanceGoals?: string;
  equipmentAccess?: string;
  profilePicture?: string | null;
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: string | null;
  currentProgramTier?: string | null;
  planPaymentType?: "monthly" | "upfront" | null;
  planCommitmentMonths?: number | null;
  planExpiresAt?: string | null;
  createdAt?: string | null;
  extraResponses?: Record<string, unknown> | null;
};

export type UserOnboardingResponse = {
  guardian?: UserOnboardingGuardian;
  athlete?: UserOnboardingAthlete;
};

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "requested"
  | "declined"
  | "cancelled"
  | string;

export type BookingRecord = {
  id: number;
  serviceTypeId?: number | null;
  serviceName?: string | null;
  name?: string | null;
  type?: string | null;
  status?: BookingStatus | null;
  athleteId?: number | null;
  athleteName?: string | null;
  athlete?: string | null;
  guardianId?: number | null;
  guardianName?: string | null;
  guardianEmail?: string | null;
  startsAt?: string | null;
  endTime?: string | null;
  location?: string | null;
  meetingLink?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  slotsTotal?: number | null;
  slotsUsed?: number | null;
};

export type BookingServiceRecord = {
  id: number;
  name: string;
  type: string;
  durationMinutes: number;
  capacity?: number | null;
  fixedStartTime?: string | null;
  attendeeVisibility?: boolean | null;
  defaultLocation?: string | null;
  defaultMeetingLink?: string | null;
  programTier?: string | null;
  eligiblePlans?: string[] | null;
  schedulePattern?: string | null;
  recurrenceEndMode?: string | null;
  recurrenceCount?: number | null;
  weeklyEntries?: Array<{ weekday: number; time: string }> | null;
  oneTimeDate?: string | null;
  oneTimeTime?: string | null;
  slotMode?: string | null;
  slotIntervalMinutes?: number | null;
  slotDefinitions?: Array<{ time: string; capacity?: number | null }> | null;
  isActive?: boolean | null;
};

export type BookingAvailabilitySlot = {
  slotKey: string;
  startsAt: string;
  remainingCapacity?: number | null;
};

export type BookingAvailabilityItem = {
  dateKey: string;
  serviceTypeId: number;
  occurrenceKey: string;
  startsAt: string;
  serviceName?: string | null;
  type?: string | null;
  location?: string | null;
  meetingLink?: string | null;
  remainingCapacity?: number | null;
  slots?: BookingAvailabilitySlot[] | null;
};

export type ScheduledSessionStatus = "Upcoming" | "Completed" | "Missed";

export type MyScheduledSessionRecord = {
  sessionId: number;
  name: string;
  type: "one_to_one" | "semi_private" | "in_person" | "team";
  startsAt: string;
  endsAt: string;
  location?: string | null;
  meetingLink?: string | null;
  sessionStatus?: "upcoming" | "completed" | "cancelled" | null;
  attendanceStatus?: "unmarked" | "attended" | "missed" | null;
  checkInAt?: string | null;
  status: ScheduledSessionStatus;
  dateKey: string;
};

// ── Base query with reauth ───────────────────────────────────
const getCsrfToken = () => {
  if (typeof document === "undefined") return "";
  return (
    document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("csrfToken="))
      ?.split("=")[1] ?? ""
  );
};

const rawBaseQuery = fetchBaseQuery({
  baseUrl: "/api/backend",
  prepareHeaders: (headers) => {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers.set("x-csrf-token", csrfToken);
    }
    return headers;
  },
});

let loginRedirectTriggered = false;

function clearAuthCookies() {
  if (typeof document === "undefined") return;
  const expire = "=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
  document.cookie = `accessToken${expire}`;
  document.cookie = `accessTokenClient${expire}`;
  document.cookie = `refreshToken${expire}`;
}

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    if (typeof window !== "undefined" && !loginRedirectTriggered) {
      loginRedirectTriggered = true;
      clearAuthCookies();
      fetch("/api/auth/clear-session", { method: "POST" }).finally(() => {
        window.location.href = "/login";
      });
    }
  }

  return result;
};

// ── Base API (empty — endpoints injected by domain files) ────
export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  keepUnusedDataFor: 300,
  tagTypes: [
    "Users",
    "Bookings",
    "Threads",
    "ChatGroups",
    "Content",
    "Services",
    "Dashboard",
    "OnboardingConfig",
    "PortalConfig",
    "ParentCourses",
    "TestimonialSubmissions",
    "Availability",
    "FoodDiary",
    "PhysioReferrals",
    "Programs",
    "ProgramBuilder",
    "AgeExperience",
    "UserLocations",
    "TrackingGoals",
    "YouthTracking",
    "Enquiries",
    "SessionSchedule",
    "CalendarConnection",
    "SessionTemplates",
    "ScheduledSessions",
    "SleepLogs",
  ],
  endpoints: () => ({}),
});
