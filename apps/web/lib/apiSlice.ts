import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";

type ApiPayload = Record<string, unknown>;

type AdminProfileUser = {
  id?: number;
  name?: string;
  email?: string;
  profilePicture?: string | null;
};

type AdminProfileSettings = {
  title?: string | null;
  bio?: string | null;
  timezone?: string;
  notificationSummary?: string;
  workStartHour?: number;
  workStartMinute?: number;
  workEndHour?: number;
  workEndMinute?: number;
};

type AdminProfileResponse = {
  user?: AdminProfileUser;
  settings?: AdminProfileSettings;
};

type DashboardKpis = {
  totalAthletes: number;
  premiumClients: number;
  unreadMessages: number;
  bookingsToday: number;
};

type DashboardTrends = {
  trainingLoad: number;
  messagingResponseRate: number;
  bookingsUtilization: number;
  trainingSeries?: number[];
  messagingSeries?: number[];
  bookingSeries?: number[];
};

type DashboardTopAthlete = {
  name: string;
  team?: string | null;
  tier: string;
  score?: string | number | null;
};

type DashboardTierDistribution = {
  total: number;
  program: number;
  premium: number;
  premiumPlus: number;
  pro: number;
};

type DashboardWeeklyVolume = {
  bars?: number[];
  totals?: {
    messages: number;
    bookings: number;
    uploads: number;
  };
};

type DashboardWeeklyProgress = {
  labels?: string[];
  series?: number[];
};

type DashboardHighlight = {
  label: string;
  value: string;
  detail: string;
};

type DashboardProgramOpsItem = {
  title: string;
  detail: string;
};

type DashboardBookingToday = {
  serviceName?: string | null;
  type?: string | null;
  athleteName?: string | null;
  startsAt?: string | null;
};

type DashboardResponse = {
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

type TrainingSnapshotRow = {
  athleteId: number;
  athleteName: string;
  programTier?: string | null;
  guardianUserId: number;
  athleteUserId?: number | null;
  sectionCompletions30d: number;
  premiumExercisesTotal: number;
  premiumExercisesDone: number;
};

type UserListRow = {
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
  athleteType?: "youth" | "adult" | null;
  programTier?: string | null;
  guardianProgramTier?: string | null;
};

type UserOnboardingGuardian = {
  id?: number;
  email?: string;
  phoneNumber?: string;
  relationToAthlete?: string;
  currentProgramTier?: string | null;
  activeAthleteId?: number | null;
  createdAt?: string | null;
};

type UserOnboardingAthlete = {
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

type UserOnboardingResponse = {
  guardian?: UserOnboardingGuardian;
  athlete?: UserOnboardingAthlete;
};

type BookingStatus = "pending" | "confirmed" | "requested" | "declined" | "cancelled" | string;

type BookingRecord = {
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

type BookingServiceRecord = {
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

type BookingAvailabilitySlot = {
  slotKey: string;
  startsAt: string;
  remainingCapacity?: number | null;
};

type BookingAvailabilityItem = {
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

let refreshPromise: Promise<Response> | null = null;
let loginRedirectTriggered = false;

const runRefreshRequest = (csrfToken: string) => {
  if (!refreshPromise) {
    refreshPromise = fetch("/api/auth/refresh", {
      method: "POST",
      headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
    }).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

/**
 * Wrapper that silently refreshes the access token on 401,
 * then retries the original request. Redirects to /login if
 * the refresh itself fails.
 */
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    // Try to silently refresh the access token
    const csrfToken = getCsrfToken();
    const refreshResult = await runRefreshRequest(csrfToken);

    if (refreshResult.ok) {
      // Retry the original request with the new token
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      // Refresh failed — session is truly expired
      if (typeof window !== "undefined" && !loginRedirectTriggered) {
        loginRedirectTriggered = true;
        window.location.href = "/login";
      }
    }
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Users",
    "Bookings",
    "Threads",
    "Content",
    "Services",
    "Dashboard",
    "OnboardingConfig",
    "ParentCourses",
    "TestimonialSubmissions",
    "Availability",
    "FoodDiary",
    "PhysioReferrals",
    "Programs",
    "AgeExperience",
    "UserLocations",
  ],
  endpoints: (builder) => ({
    getAdminProfile: builder.query<AdminProfileResponse, void>({
      query: () => "/admin/profile",
    }),
    updateAdminProfile: builder.mutation<AdminProfileResponse, ApiPayload>({
      query: (body) => ({
        url: "/admin/profile",
        method: "PUT",
        body,
      }),
    }),
    updateAdminPreferences: builder.mutation<AdminProfileResponse, ApiPayload>({
      query: (body) => ({
        url: "/admin/preferences",
        method: "PUT",
        body,
      }),
    }),
    updateMessagingAccess: builder.mutation<{ messagingAccessTiers: string[] }, { tiers: string[] }>({
      query: (body) => ({
        url: "/admin/messaging-access",
        method: "PUT",
        body,
      }),
    }),
    changePassword: builder.mutation<any, { oldPassword: string; newPassword: string }>({
      query: (body) => ({
        url: "/auth/change-password",
        method: "POST",
        body,
      }),
    }),
    submitAppFeedback: builder.mutation<{ ok: boolean }, { category: string; message: string }>({
      query: (body) => ({
        url: "/support/app-feedback",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Threads"],
    }),
    getDashboard: builder.query<DashboardResponse, void>({
      query: () => "/admin/dashboard",
      providesTags: ["Dashboard"],
    }),
    getTrainingSnapshot: builder.query<{ items: TrainingSnapshotRow[] }, void>({
      query: () => "/admin/training-snapshot",
      providesTags: ["Users"],
    }),
    getUserLocations: builder.query<{ latest: any[]; history: any[]; rangeDays?: number | null }, { days?: number } | void>({
      query: (params) => {
        if (!params?.days) return "/admin/user-locations";
        const query = new URLSearchParams();
        query.set("days", String(params.days));
        return `/admin/user-locations?${query.toString()}`;
      },
      providesTags: ["UserLocations"],
    }),
    getUsers: builder.query<{ users: UserListRow[] }, void>({
      query: () => "/admin/users",
      providesTags: ["Users"],
    }),
    getAdminTeams: builder.query<
      {
        teams: Array<{
          team: string;
          memberCount: number;
          guardianCount: number;
          createdAt: string;
          updatedAt: string;
        }>;
      },
      void
    >({
      query: () => "/admin/teams",
      providesTags: ["Users"],
    }),
    blockUser: builder.mutation<any, { userId: number; blocked: boolean }>({
      query: ({ userId, blocked }) => ({
        url: `/admin/users/${userId}/block`,
        method: "POST",
        body: { blocked },
      }),
      invalidatesTags: ["Users"],
    }),
    deleteUser: builder.mutation<any, { userId: number }>({
      query: ({ userId }) => ({
        url: `/admin/users/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Users"],
    }),
    provisionGuardian: builder.mutation<
      {
        userId: number;
        athleteId: number;
        athleteUserId: number;
        status: string;
        emailSent: boolean;
      },
      {
        email: string;
        guardianDisplayName: string;
        athleteName: string;
        birthDate: string;
        team: string;
        trainingPerWeek: number;
        injuries?: unknown;
        growthNotes?: string | null;
        performanceGoals?: string | null;
        equipmentAccess?: string | null;
        parentPhone?: string | null;
        relationToAthlete?: string | null;
        desiredProgramType?: "PHP" | "PHP_Premium" | "PHP_Premium_Plus" | "PHP_Pro";
        athleteProfilePicture?: string | null;
        planPaymentType: "monthly" | "upfront";
        planCommitmentMonths: 6 | 12;
        termsVersion: string;
        privacyVersion: string;
        appVersion: string;
        extraResponses?: Record<string, unknown>;
      }
    >({
      query: (body) => ({
        url: "/admin/users/provision",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Users"],
    }),
    provisionAdultAthlete: builder.mutation<
      {
        userId: number;
        athleteId: number;
        athleteUserId: number;
        status: string;
        emailSent: boolean;
      },
      {
        email: string;
        athleteName: string;
        birthDate: string;
        team?: string | null;
        trainingPerWeek: number;
        injuries?: unknown;
        growthNotes?: string | null;
        performanceGoals?: string | null;
        equipmentAccess?: string | null;
        desiredProgramType?: "PHP" | "PHP_Premium" | "PHP_Premium_Plus" | "PHP_Pro" | null;
        athleteProfilePicture?: string | null;
        planPaymentType: "monthly" | "upfront";
        planCommitmentMonths: 6 | 12;
        termsVersion: string;
        privacyVersion: string;
        appVersion: string;
        extraResponses?: Record<string, unknown>;
      }
    >({
      query: (body) => ({
        url: "/admin/users/provision-adult",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Users"],
    }),
    getBookings: builder.query<{ bookings: BookingRecord[] }, void>({
      query: () => "/admin/bookings",
      providesTags: ["Bookings"],
    }),
    getBookingById: builder.query<{ booking: BookingRecord }, number>({
      query: (bookingId) => `/admin/bookings/${bookingId}`,
      providesTags: ["Bookings"],
    }),
    getUserBookings: builder.query<{ items: BookingRecord[] }, void>({
      query: () => "/bookings",
      providesTags: ["Bookings"],
    }),
    updateBookingStatus: builder.mutation<{ booking?: BookingRecord; status?: BookingStatus }, { bookingId: number; status: string }>({
      query: ({ bookingId, status }) => ({
        url: `/admin/bookings/${bookingId}`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["Bookings"],
    }),
    createAdminBooking: builder.mutation<
      { booking?: BookingRecord; id?: number; message?: string },
      {
        userId: number;
        serviceTypeId: number;
        startsAt: string;
        endsAt: string;
        location?: string | null;
        meetingLink?: string | null;
        status?: string;
      }
    >({
      query: (body) => ({
        url: "/admin/bookings",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Bookings"],
    }),
    getAdminAvailability: builder.query<{ items: any[] }, void>({
      query: () => "/admin/availability",
      providesTags: ["Availability"],
    }),
    getVideoUploads: builder.query<{ items: any[] }, void>({
      query: () => "/admin/videos",
      providesTags: ["Content"],
    }),
    getProgramSectionContent: builder.query<{ items: any[] }, { sectionType: string }>({
      query: ({ sectionType }) => `/program-section-content?sectionType=${encodeURIComponent(sectionType)}`,
      providesTags: ["Content"],
    }),
    getServices: builder.query<{ items: BookingServiceRecord[] }, void>({
      query: () => "/bookings/services?includeInactive=true",
      providesTags: ["Services"],
    }),
    getBookingServices: builder.query<{ items: BookingServiceRecord[] }, void>({
      query: () => "/bookings/services",
      providesTags: ["Services"],
    }),
    getBookingAvailability: builder.query<
      { items: BookingAvailabilityItem[]; bookings?: BookingRecord[]; slots?: string[] },
      { serviceTypeId: number; from: string; to: string }
    >({
      query: ({ serviceTypeId, from, to }) => {
        const query = new URLSearchParams();
        query.set("serviceTypeId", String(serviceTypeId));
        query.set("from", from);
        query.set("to", to);
        return `/bookings/availability?${query.toString()}`;
      },
      providesTags: ["Availability"],
    }),
    getGeneratedBookingAvailability: builder.query<
      { items: BookingAvailabilityItem[] },
      { from: string; to: string; serviceTypeId?: number }
    >({
      query: ({ from, to, serviceTypeId }) => {
        const query = new URLSearchParams();
        query.set("from", from);
        query.set("to", to);
        if (serviceTypeId != null) query.set("serviceTypeId", String(serviceTypeId));
        return `/bookings/generated-availability?${query.toString()}`;
      },
      providesTags: ["Availability"],
    }),
    createBooking: builder.mutation<
      { booking?: BookingRecord; id?: number; message?: string },
      {
        serviceTypeId: number;
        startsAt?: string;
        endsAt?: string;
        occurrenceKey?: string;
        slotKey?: string;
        location?: string;
        meetingLink?: string;
        timezoneOffsetMinutes?: number;
      }
    >({
      query: (body) => ({
        url: "/bookings",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Bookings"],
    }),
    getThreads: builder.query<{ threads: any[] }, void>({
      query: () => "/admin/messages/threads",
      providesTags: ["Threads"],
    }),
    getMessages: builder.query<{ messages: any[] }, number>({
      query: (userId) => `/admin/messages/${userId}`,
      providesTags: (_result, _error, userId) => [{ type: "Threads", id: userId }],
    }),
    getParentContent: builder.query<{ items: any[] }, void>({
      query: () => "/content/parent-platform",
      providesTags: ["Content"],
    }),
    getHomeContent: builder.query<{ items: any[] }, void>({
      query: () => "/content/home",
      providesTags: ["Content"],
    }),
    getLegalContent: builder.query<{ items: any[] }, void>({
      query: () => "/content/legal",
      providesTags: ["Content"],
    }),
    getAnnouncements: builder.query<{ items: any[] }, void>({
      query: () => "/content/announcements",
      providesTags: ["Content"],
    }),
    getTestimonialSubmissions: builder.query<{ items: any[] }, void>({
      query: () => "/content/testimonials/submissions",
      providesTags: ["TestimonialSubmissions"],
    }),
    approveTestimonialSubmission: builder.mutation<{ approved: boolean }, { submissionId: number }>({
      query: ({ submissionId }) => ({
        url: `/content/testimonials/${submissionId}/approve`,
        method: "POST",
      }),
      invalidatesTags: ["TestimonialSubmissions", "Content"],
    }),
    rejectTestimonialSubmission: builder.mutation<{ rejected: boolean }, { submissionId: number }>({
      query: ({ submissionId }) => ({
        url: `/content/testimonials/${submissionId}/reject`,
        method: "POST",
      }),
      invalidatesTags: ["TestimonialSubmissions"],
    }),
    getParentCourses: builder.query<{ items: any[] }, void>({
      query: () => "/content/parent-courses",
      providesTags: ["ParentCourses"],
    }),
    getFoodDiary: builder.query<{ items: any[] }, { athleteId?: number; guardianId?: number } | void>({
      query: (params) => {
        if (!params) return "/admin/food-diary";
        const query = new URLSearchParams();
        if (params.athleteId) query.set("athleteId", String(params.athleteId));
        if (params.guardianId) query.set("guardianId", String(params.guardianId));
        return `/admin/food-diary?${query.toString()}`;
      },
      providesTags: ["FoodDiary"],
    }),
    reviewFoodDiary: builder.mutation<{ item: any }, { entryId: number; feedback?: string | null }>({
      query: ({ entryId, feedback }) => ({
        url: `/admin/food-diary/${entryId}/review`,
        method: "POST",
        body: { feedback: feedback ?? "" },
      }),
      invalidatesTags: ["FoodDiary"],
    }),
    getPhysioReferrals: builder.query<{ items: any[] }, void>({
      query: () => "/admin/physio-referrals",
      providesTags: ["PhysioReferrals"],
    }),
    getReferralGroups: builder.query<{ items: any[] }, void>({
      query: () => "/admin/referral-groups",
      providesTags: ["PhysioReferrals"],
    }),
    getAgeExperienceRules: builder.query<{ items: any[] }, void>({
      query: () => "/admin/age-experience",
      providesTags: ["AgeExperience"],
    }),
    createAgeExperienceRule: builder.mutation<{ item: any }, ApiPayload>({
      query: (body) => ({
        url: "/admin/age-experience",
        method: "POST",
        body,
      }),
      invalidatesTags: ["AgeExperience"],
    }),
    updateAgeExperienceRule: builder.mutation<{ item: any }, { id: number; data: ApiPayload }>({
      query: ({ id, data }) => ({
        url: `/admin/age-experience/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["AgeExperience"],
    }),
    deleteAgeExperienceRule: builder.mutation<{ item: any }, { id: number }>({
      query: ({ id }) => ({
        url: `/admin/age-experience/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["AgeExperience"],
    }),
    createPhysioReferral: builder.mutation<{ item: any }, ApiPayload>({
      query: (body) => ({
        url: "/admin/physio-referrals",
        method: "POST",
        body,
      }),
      invalidatesTags: ["PhysioReferrals"],
    }),
    createBulkPhysioReferral: builder.mutation<{ created: any[]; summary: any; skipped: any[] }, ApiPayload>({
      query: (body) => ({
        url: "/admin/physio-referrals/bulk",
        method: "POST",
        body,
      }),
      invalidatesTags: ["PhysioReferrals"],
    }),
    createReferralGroup: builder.mutation<{ item: any }, ApiPayload>({
      query: (body) => ({
        url: "/admin/referral-groups",
        method: "POST",
        body,
      }),
      invalidatesTags: ["PhysioReferrals"],
    }),
    updatePhysioReferral: builder.mutation<{ item: any }, { id: number; data: ApiPayload }>({
      query: ({ id, data }) => ({
        url: `/admin/physio-referrals/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["PhysioReferrals"],
    }),
    deletePhysioReferral: builder.mutation<{ item: any }, { id: number }>({
      query: ({ id }) => ({
        url: `/admin/physio-referrals/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["PhysioReferrals"],
    }),
    createMediaUploadUrl: builder.mutation<
      { uploadUrl: string; publicUrl: string; key: string },
      { folder: string; fileName: string; contentType: string; sizeBytes: number }
    >({
      query: (body) => ({
        url: "/media/presign",
        method: "POST",
        body,
      }),
    }),
    getParentCourse: builder.query<{ item: any }, number>({
      query: (courseId) => `/content/parent-courses/${courseId}`,
      providesTags: (_result, _error, courseId) => [{ type: "ParentCourses", id: courseId }],
    }),
    createParentCourse: builder.mutation<{ item: any }, ApiPayload>({
      query: (body) => ({
        url: "/content/parent-courses",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ParentCourses"],
    }),
    updateParentCourse: builder.mutation<{ item: any }, { id: number; data: ApiPayload }>({
      query: ({ id, data }) => ({
        url: `/content/parent-courses/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["ParentCourses"],
    }),
    updateContent: builder.mutation<{ item: any }, { id: number; data: ApiPayload }>({
      query: ({ id, data }) => ({
        url: `/content/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Content"],
    }),
    markThreadRead: builder.mutation<{ updated: number }, { userId: number }>({
      query: ({ userId }) => ({
        url: `/admin/messages/${userId}/read`,
        method: "POST",
      }),
      invalidatesTags: ["Threads"],
    }),
    deleteThread: builder.mutation<{ deleted: number }, { userId: number }>({
      query: ({ userId }) => ({
        url: `/admin/messages/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Threads"],
    }),
    sendMessage: builder.mutation<
      { message: any },
      {
        userId: number;
        content?: string;
        contentType?: "text" | "image" | "video";
        mediaUrl?: string;
        videoUploadId?: number;
        replyToMessageId?: number;
        replyPreview?: string;
      }
    >({
      query: ({ userId, content, contentType, mediaUrl, videoUploadId, replyToMessageId, replyPreview }) => ({
        url: `/admin/messages/${userId}`,
        method: "POST",
        body: { content, contentType, mediaUrl, videoUploadId, replyToMessageId, replyPreview },
      }),
      invalidatesTags: ["Threads"],
    }),
    toggleMessageReaction: builder.mutation<
      { messageId: number; reactions: { emoji: string; count: number; userIds: number[] }[] },
      { messageId: number; emoji: string }
    >({
      query: ({ messageId, emoji }) => ({
        url: `/messages/${messageId}/reactions`,
        method: "PUT",
        body: { emoji },
      }),
    }),
    deleteMessage: builder.mutation<{ deleted: boolean }, { messageId: number }>({
      query: ({ messageId }) => ({
        url: `/messages/${messageId}`,
        method: "DELETE",
      }),
    }),
    deleteGroupMessage: builder.mutation<{ deleted: boolean }, { groupId: number; messageId: number }>({
      query: ({ groupId, messageId }) => ({
        url: `/chat/groups/${groupId}/messages/${messageId}`,
        method: "DELETE",
      }),
    }),
    createService: builder.mutation<any, ApiPayload>({
      query: (body) => ({
        url: "/bookings/services",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Services", "Bookings"],
    }),
    updateService: builder.mutation<any, { id: number; data: ApiPayload }>({
      query: ({ id, data }) => ({
        url: `/bookings/services/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Services", "Bookings"],
    }),
    deleteService: builder.mutation<{ deleted: unknown }, number>({
      query: (id) => ({
        url: `/bookings/services/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Services", "Bookings", "Availability"],
    }),
    createAvailability: builder.mutation<any, ApiPayload>({
      query: (body) => ({
        url: "/bookings/availability",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Availability"],
    }),
    createContent: builder.mutation<any, ApiPayload>({
      query: (body) => ({
        url: "/content",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Content"],
    }),
    deleteContent: builder.mutation<{ deleted: boolean }, { id: number }>({
      query: ({ id }) => ({
        url: `/content/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Content"],
    }),
    reviewVideoUpload: builder.mutation<{ item: any }, { uploadId: number; feedback: string }>({
      query: (body) => ({
        url: "/videos/review",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Content"],
    }),
    getUserOnboarding: builder.query<UserOnboardingResponse, number>({
      query: (userId) => `/admin/users/${userId}/onboarding`,
      providesTags: ["Users"],
    }),
    getUserProgramSectionCompletions: builder.query<
      { items: any[] },
      { userId: number; from?: string; to?: string; limit?: number }
    >({
      query: ({ userId, from, to, limit }) => {
        const params = new URLSearchParams();
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        if (limit != null) params.set("limit", String(limit));
        const suffix = params.toString() ? `?${params.toString()}` : "";
        return `/admin/users/${userId}/program-section-completions${suffix}`;
      },
      providesTags: ["Users"],
    }),
    getExercises: builder.query<{ exercises: any[] }, void>({
      query: () => "/admin/exercises",
      providesTags: ["Content"],
      transformResponse: (response: { exercises?: any[] } | undefined) => ({ exercises: response?.exercises ?? [] }),
    }),
    createExercise: builder.mutation<
      { exercise: any },
      {
        name: string;
        cues?: string;
        sets?: number;
        reps?: number;
        duration?: number;
        restSeconds?: number;
        notes?: string;
        videoUrl?: string;
      }
    >({
      query: (body) => ({
        url: "/admin/exercises",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Content"],
    }),
    presignMediaUpload: builder.mutation<
      { uploadUrl: string; publicUrl: string; key: string },
      { folder: string; fileName: string; contentType: string; sizeBytes: number }
    >({
      query: (body) => ({
        url: "/media/presign",
        method: "POST",
        body,
      }),
    }),
    getUserPremiumPlan: builder.query<{ items: any[] }, { userId: number; weekNumber?: number }>({
      query: ({ userId, weekNumber }) => ({
        url: `/admin/users/${userId}/premium-plan`,
        params: weekNumber ? { weekNumber } : undefined,
      }),
      providesTags: ["Users"],
    }),
    getUserPremiumSessionCheckins: builder.query<{ items: any[] }, { userId: number; limit?: number }>({
      query: ({ userId, limit }) => ({
        url: `/admin/users/${userId}/premium-session-checkins`,
        params: limit ? { limit } : undefined,
      }),
      providesTags: ["Users"],
    }),
    cloneUserPremiumPlan: builder.mutation<{ result: any }, { userId: number; replaceExisting?: boolean }>({
      query: ({ userId, replaceExisting }) => ({
        url: `/admin/users/${userId}/premium-plan/clone`,
        method: "POST",
        body: { replaceExisting: replaceExisting ?? true },
      }),
      invalidatesTags: ["Users"],
    }),
    createUserPremiumPlanSession: builder.mutation<{ item: any }, { userId: number; weekNumber: number; sessionNumber: number; title?: string | null; notes?: string | null }>({
      query: ({ userId, ...body }) => ({
        url: `/admin/users/${userId}/premium-plan/sessions`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Users"],
    }),
    updateUserPremiumPlanSession: builder.mutation<{ item: any }, { userId: number; sessionId: number; patch: ApiPayload }>({
      query: ({ userId, sessionId, patch }) => ({
        url: `/admin/users/${userId}/premium-plan/sessions/${sessionId}`,
        method: "PATCH",
        body: patch,
      }),
      invalidatesTags: ["Users"],
    }),
    deleteUserPremiumPlanSession: builder.mutation<{ item: any }, { userId: number; sessionId: number }>({
      query: ({ userId, sessionId }) => ({
        url: `/admin/users/${userId}/premium-plan/sessions/${sessionId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Users"],
    }),
    addUserPremiumPlanExercise: builder.mutation<{ item: any }, { userId: number; sessionId: number; body: ApiPayload }>({
      query: ({ userId, sessionId, body }) => ({
        url: `/admin/users/${userId}/premium-plan/sessions/${sessionId}/exercises`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Users"],
    }),
    updateUserPremiumPlanExercise: builder.mutation<{ item: any }, { userId: number; planExerciseId: number; patch: ApiPayload }>({
      query: ({ userId, planExerciseId, patch }) => ({
        url: `/admin/users/${userId}/premium-plan/exercises/${planExerciseId}`,
        method: "PATCH",
        body: patch,
      }),
      invalidatesTags: ["Users"],
    }),
    deleteUserPremiumPlanExercise: builder.mutation<{ item: any }, { userId: number; planExerciseId: number }>({
      query: ({ userId, planExerciseId }) => ({
        url: `/admin/users/${userId}/premium-plan/exercises/${planExerciseId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Users"],
    }),
    updateProgramTier: builder.mutation<any, { athleteId: number; programTier: string }>({
      query: (body) => ({
        url: "/admin/users/program-tier",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Users"],
    }),
    assignProgram: builder.mutation<any, { athleteId: number; programType: string; programTemplateId?: number }>({
      query: (body) => ({
        url: "/admin/enrollments",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Users"],
    }),
    getPrograms: builder.query<{ programs: any[] }, void>({
      query: () => "/admin/programs",
      providesTags: ["Programs"],
    }),
    createProgram: builder.mutation<
      { program: any },
      { name: string; type: string; description?: string; minAge?: number | null; maxAge?: number | null }
    >({
      query: (body) => ({
        url: "/admin/programs",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Programs"],
    }),
    updateProgram: builder.mutation<
      { program: any },
      {
        programId: number;
        data: { name?: string; type?: string; description?: string | null; minAge?: number | null; maxAge?: number | null };
      }
    >({
      query: ({ programId, data }) => ({
        url: `/admin/programs/${programId}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Programs"],
    }),
    getOnboardingConfig: builder.query<{ config: any }, void>({
      query: () => "/admin/onboarding-config",
      providesTags: ["OnboardingConfig"],
    }),
    getPhpPlusTabs: builder.query<{ tabs: string[] }, void>({
      query: () => "/admin/php-plus-tabs",
    }),
    updateOnboardingConfig: builder.mutation<{ config: any }, ApiPayload>({
      query: (body) => ({
        url: "/admin/onboarding-config",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["OnboardingConfig"],
    }),
    updatePhpPlusTabs: builder.mutation<{ config: any }, { tabs: string[] }>({
      query: (body) => ({
        url: "/admin/php-plus-tabs",
        method: "PUT",
        body,
      }),
    }),
    getChatGroups: builder.query<{ groups: any[] }, void>({
      query: () => "/chat/groups",
    }),
    createChatGroup: builder.mutation<{ group: any }, { name: string; memberIds: number[] }>({
      query: (body) => ({
        url: "/chat/groups",
        method: "POST",
        body,
      }),
    }),
    addChatGroupMembers: builder.mutation<{ ok: boolean }, { groupId: number; memberIds: number[] }>({
      query: ({ groupId, memberIds }) => ({
        url: `/chat/groups/${groupId}/members`,
        method: "POST",
        body: { memberIds },
      }),
    }),
    getChatGroupMembers: builder.query<{ members: any[] }, number>({
      query: (groupId) => `/chat/groups/${groupId}/members`,
    }),
    getChatGroupMessages: builder.query<{ messages: any[] }, number>({
      query: (groupId) => `/chat/groups/${groupId}/messages`,
    }),
    sendChatGroupMessage: builder.mutation<
      { message: any },
      {
        groupId: number;
        content?: string;
        contentType?: "text" | "image" | "video";
        mediaUrl?: string;
        replyToMessageId?: number;
        replyPreview?: string;
      }
    >({
      query: ({ groupId, content, contentType, mediaUrl, replyToMessageId, replyPreview }) => ({
        url: `/chat/groups/${groupId}/messages`,
        method: "POST",
        body: { content, contentType, mediaUrl, replyToMessageId, replyPreview },
      }),
    }),
    toggleChatGroupMessageReaction: builder.mutation<
      { messageId: number; reactions: { emoji: string; count: number; userIds: number[] }[] },
      { groupId: number; messageId: number; emoji: string }
    >({
      query: ({ groupId, messageId, emoji }) => ({
        url: `/chat/groups/${groupId}/messages/${messageId}/reactions`,
        method: "PUT",
        body: { emoji },
      }),
    }),
  }),
});

export const {
  useGetAdminProfileQuery,
  useUpdateAdminProfileMutation,
  useUpdateAdminPreferencesMutation,
  useUpdateMessagingAccessMutation,
  useChangePasswordMutation,
  useSubmitAppFeedbackMutation,
  useGetDashboardQuery,
  useGetTrainingSnapshotQuery,
  useGetUserLocationsQuery,
  useGetUsersQuery,
  useGetAdminTeamsQuery,
  useBlockUserMutation,
  useDeleteUserMutation,
  useProvisionGuardianMutation,
  useProvisionAdultAthleteMutation,
  useGetBookingsQuery,
  useGetBookingByIdQuery,
  useGetUserBookingsQuery,
  useUpdateBookingStatusMutation,
  useCreateAdminBookingMutation,
  useGetAdminAvailabilityQuery,
  useGetVideoUploadsQuery,
  useGetProgramSectionContentQuery,
  useGetServicesQuery,
  useGetBookingServicesQuery,
  useGetBookingAvailabilityQuery,
  useGetGeneratedBookingAvailabilityQuery,
  useCreateBookingMutation,
  useGetThreadsQuery,
  useGetMessagesQuery,
  useGetParentContentQuery,
  useGetHomeContentQuery,
  useGetLegalContentQuery,
  useGetAnnouncementsQuery,
  useGetTestimonialSubmissionsQuery,
  useApproveTestimonialSubmissionMutation,
  useRejectTestimonialSubmissionMutation,
  useGetParentCoursesQuery,
  useGetFoodDiaryQuery,
  useReviewFoodDiaryMutation,
  useGetPhysioReferralsQuery,
  useGetReferralGroupsQuery,
  useCreatePhysioReferralMutation,
  useCreateBulkPhysioReferralMutation,
  useCreateReferralGroupMutation,
  useUpdatePhysioReferralMutation,
  useDeletePhysioReferralMutation,
  useGetAgeExperienceRulesQuery,
  useCreateAgeExperienceRuleMutation,
  useUpdateAgeExperienceRuleMutation,
  useDeleteAgeExperienceRuleMutation,
  useGetParentCourseQuery,
  useCreateMediaUploadUrlMutation,
  useCreateParentCourseMutation,
  useUpdateParentCourseMutation,
  useUpdateContentMutation,
  useMarkThreadReadMutation,
  useSendMessageMutation,
  useToggleMessageReactionMutation,
  useDeleteMessageMutation,
  useDeleteGroupMessageMutation,
  useDeleteThreadMutation,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
  useCreateAvailabilityMutation,
  useCreateContentMutation,
  useDeleteContentMutation,
  useReviewVideoUploadMutation,
  useGetUserOnboardingQuery,
  useGetUserProgramSectionCompletionsQuery,
  useGetExercisesQuery,
  useCreateExerciseMutation,
  usePresignMediaUploadMutation,
  useGetUserPremiumPlanQuery,
  useGetUserPremiumSessionCheckinsQuery,
  useCloneUserPremiumPlanMutation,
  useCreateUserPremiumPlanSessionMutation,
  useUpdateUserPremiumPlanSessionMutation,
  useDeleteUserPremiumPlanSessionMutation,
  useAddUserPremiumPlanExerciseMutation,
  useUpdateUserPremiumPlanExerciseMutation,
  useDeleteUserPremiumPlanExerciseMutation,
  useUpdateProgramTierMutation,
  useAssignProgramMutation,
  useGetProgramsQuery,
  useCreateProgramMutation,
  useUpdateProgramMutation,
  useGetOnboardingConfigQuery,
  useUpdateOnboardingConfigMutation,
  useGetPhpPlusTabsQuery,
  useUpdatePhpPlusTabsMutation,
  useGetChatGroupsQuery,
  useCreateChatGroupMutation,
  useAddChatGroupMembersMutation,
  useGetChatGroupMembersQuery,
  useGetChatGroupMessagesQuery,
  useSendChatGroupMessageMutation,
  useToggleChatGroupMessageReactionMutation,
} = apiSlice;
