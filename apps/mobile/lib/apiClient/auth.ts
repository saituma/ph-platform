import { apiRequest } from "@/lib/api";
import type { AppCapabilities } from "@/store/slices/userSlice";

export type MeUser = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
  profilePicture?: string | null;
  programTier?: string | null;
  messagingAccessTiers?: string[];
  capabilities?: AppCapabilities | null;
  planFeatures?: string[];
  team?: unknown;
  teamId?: number | null;
  athleteType?: "youth" | "adult" | null;
  debugProgramAccess?: {
    athleteProgramTier?: string | null;
    teamProgramTier?: string | null;
    teamPlanTierSource?: string;
    teamPlanId?: number | null;
    teamSubscriptionStatus?: string | null;
    effectiveProgramTier?: string | null;
    effectiveTierSource?: string;
    coachVideoUpload?: boolean;
  };
};

type MeOptions = {
  token?: string | null;
  forceRefresh?: boolean;
  suppressStatusCodes?: number[];
  skipSessionInvalidateOn401?: boolean;
};

export const authApi = {
  me(options?: MeOptions) {
    return apiRequest<{ user?: MeUser }>("/auth/me", options);
  },

  refresh(refreshToken: string) {
    return apiRequest<{ idToken?: string; accessToken?: string; refreshToken?: string }>(
      "/auth/refresh",
      { method: "POST", body: { refreshToken }, skipAuthRefresh: true },
    );
  },
};
