import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AppRole } from "@/lib/appRole";

interface UserProfile {
  id: string | null;
  name: string | null;
  email: string | null;
  avatar: string | null;
}

export type ManagedAthlete = {
  id?: number;
  userId?: number | null;
  name?: string | null;
  age?: number | null;
  athleteType?: "youth" | "adult" | null;
  team?: string | null;
  teamId?: number | null;
  level?: string | null;
  trainingPerWeek?: number | null;
  profilePicture?: string | null;
};

const MIN_YOUTH_DISPLAY_AGE = 7;

function normalizeManagedAthleteAge(age?: number | null) {
  if (age == null || !Number.isFinite(age)) return null;
  return Math.max(MIN_YOUTH_DISPLAY_AGE, Math.trunc(age));
}

export type AppCapabilities = {
  training: boolean;
  schedule: boolean;
  coachBooking: boolean;
  messaging: boolean;
  groupChat: boolean;
  nutrition: boolean;
  nutritionReview: boolean;
  parentContent: boolean;
  progressTracking: boolean;
  teamTracking: boolean;
  socialTracking: boolean;
  trainingQuestionnaire: boolean;
  teamManagement: boolean;
  athleteManagement: boolean;
  planManagement: boolean;
  routeManagement: boolean;
  eventManagement: boolean;
  adminMobile: boolean;
  billingPortal: boolean;
  mobilePayments: boolean;
  semiPrivateBooking: boolean;
  coachVideoUpload: boolean;
  physioReferrals: boolean;
  runTracking: boolean;
  achievements: boolean;
  referralRewards: boolean;
};

interface UserState {
  isAuthenticated: boolean;
  token: string | null;
  refreshToken: string | null;
  profile: UserProfile;
  /** Raw API user role from /auth/me (e.g. admin/superAdmin). */
  apiUserRole: string | null;
  isLoading: boolean;
  hydrated: boolean;
  managedAthletes: ManagedAthlete[];
  appRole: AppRole | null;
  /** Normalized program tier label from API (e.g. PHP_Premium). */
  programTier: string | null;
  /** Tiers allowed for coach messaging; empty means “use defaults”. */
  messagingAccessTiers: string[];
  /** Server-derived feature flags from `/auth/me`; null before first sync. */
  capabilities: AppCapabilities | null;
  /** True after the first /auth/me response sets capabilities. */
  capabilitiesLoaded: boolean;
  /** When acting as a youth athlete account (guardian), target user id. */
  athleteUserId: number | null;
  /** Onboarding questionnaire completion for the active athlete context. */
  onboardingCompleted: boolean | null;
  /** From GET /auth/me — team label + roster id (survives appRole sync edge cases). */
  authTeamMembership: { team: string | null; teamId: number | null } | null;
  /** Plan-level feature keys from /auth/me ("video_upload", "physio_referrals", etc.). */
  planFeatures: string[];
}

const initialState: UserState = {
  isAuthenticated: false,
  token: null,
  refreshToken: null,
  profile: {
    id: null,
    name: null,
    email: null,
    avatar: null,
  },
  apiUserRole: null,
  isLoading: false,
  hydrated: false,
  managedAthletes: [],
  appRole: null,
  programTier: null,
  messagingAccessTiers: [],
  capabilities: null,
  capabilitiesLoaded: false,
  athleteUserId: null,
  onboardingCompleted: null,
  authTeamMembership: null,
  planFeatures: [],
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ token: string; profile: UserProfile; refreshToken?: string | null }>,
    ) => {
      state.isAuthenticated = true;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken ?? state.refreshToken;
      state.profile = action.payload.profile;
    },
    updateProfile: (state, action: PayloadAction<Partial<UserProfile>>) => {
      state.profile = { ...state.profile, ...action.payload };
    },
    setApiUserRole: (state, action: PayloadAction<string | null>) => {
      state.apiUserRole = action.payload;
    },
    setManagedAthletes: (state, action: PayloadAction<ManagedAthlete[]>) => {
      state.managedAthletes = action.payload.map((athlete) => ({
        ...athlete,
        age: normalizeManagedAthleteAge(athlete.age),
      }));
    },
    setAppRole: (state, action: PayloadAction<AppRole | null>) => {
      state.appRole = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setHydrated: (state, action: PayloadAction<boolean>) => {
      state.hydrated = action.payload;
    },
    setProgramTier: (state, action: PayloadAction<string | null>) => {
      state.programTier = action.payload;
    },
    setMessagingAccessTiers: (state, action: PayloadAction<string[]>) => {
      state.messagingAccessTiers = action.payload;
    },
    setCapabilities: (state, action: PayloadAction<AppCapabilities | null>) => {
      state.capabilities = action.payload;
      state.capabilitiesLoaded = true;
    },
    setAthleteUserId: (state, action: PayloadAction<number | null>) => {
      state.athleteUserId = action.payload;
    },
    setOnboardingCompleted: (state, action: PayloadAction<boolean | null>) => {
      state.onboardingCompleted = action.payload;
    },
    setAuthTeamMembership: (
      state,
      action: PayloadAction<{ team: string | null; teamId: number | null } | null>,
    ) => {
      state.authTeamMembership = action.payload;
    },
    setPlanFeatures: (state, action: PayloadAction<string[]>) => {
      state.planFeatures = action.payload;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.token = null;
      state.refreshToken = null;
      state.profile = initialState.profile;
      state.apiUserRole = null;
      state.managedAthletes = [];
      state.appRole = null;
      state.programTier = null;
      state.messagingAccessTiers = [];
      state.capabilities = null;
      state.capabilitiesLoaded = false;
      state.athleteUserId = null;
      state.onboardingCompleted = null;
      state.authTeamMembership = null;
      state.planFeatures = [];
    },
  },
});

export const {
  setCredentials,
  updateProfile,
  setApiUserRole,
  setManagedAthletes,
  setAppRole,
  setLoading,
  setHydrated,
  setProgramTier,
  setMessagingAccessTiers,
  setCapabilities,
  setAthleteUserId,
  setOnboardingCompleted,
  setAuthTeamMembership,
  setPlanFeatures,
  logout,
} = userSlice.actions;

export default userSlice.reducer;

/** True when the signed-in user is staff (coach, admin, team manager) and should NOT act as an athlete. */
export function selectIsStaffRole(state: { user: UserState }): boolean {
  const { appRole, apiUserRole } = state.user;
  if (appRole === "coach" || appRole === "team_manager") return true;
  const normalized = String(apiUserRole ?? "").trim().toLowerCase();
  return (
    normalized === "admin" ||
    normalized === "superadmin" ||
    normalized === "team_coach" ||
    normalized === "program_coach"
  );
}
