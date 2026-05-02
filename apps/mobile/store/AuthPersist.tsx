import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useAppDispatch, useAppSelector } from "./hooks";
import {
  selectBootstrapReady,
  selectPushRegistration,
  setBootstrapReady,
} from "./slices/appSlice";
import {
  setCredentials,
  logout,
  setHydrated,
  updateProfile,
  setManagedAthletes,
  setAppRole,
  setApiUserRole,
  setProgramTier,
  setMessagingAccessTiers,
  setCapabilities,
  setAuthTeamMembership,
  setPlanFeatures,
  type AppCapabilities,
} from "./slices/userSlice";
import { apiRequest, clearApiCache } from "@/lib/api";
import {
  hydrateFromStorage,
  persistCredentials,
  clearCredentials,
  refreshAccessToken,
  forceLogout,
} from "@/lib/auth/session";
import { registerDevicePushToken } from "@/lib/pushRegistration";
import { resolveAppRole } from "@/lib/appRole";
import { Sentry } from "@/lib/sentry";
import { hasAssignedTeam } from "@/lib/teamMembership";
import { enrichTeamFieldsIfOnboardingHasThem } from "@/lib/auth/enrichTeamFromOnboarding";
import { parseTeamIdFromApi } from "@/lib/tracking/teamTrackingGate";
import { promptBatteryOptimizationConsentOnce } from "@/lib/batteryOptimizationConsent";

const isUnauthorizedError = (error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  return message.startsWith("401 ") || message.startsWith("403 ");
};

export function AuthPersist() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const token = useAppSelector((state) => state.user.token);
  const refreshToken = useAppSelector((state) => state.user.refreshToken);
  const profile = useAppSelector((state) => state.user.profile);
  const bootstrapReady = useAppSelector(selectBootstrapReady);
  const pushRegistration = useAppSelector(selectPushRegistration);
  const [hydrated, setHydratedState] = useState(false);
  const lastSavedToken = useRef<string | null>(null);
  const lastSavedRefreshToken = useRef<string | null>(null);
  const lastPushToken = useRef<string | null>(null);

  // ── Startup hydration ────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    dispatch(setBootstrapReady(false));

    (async () => {
      try {
        if (
          process.env.EXPO_PUBLIC_FORCE_LOGOUT === "1" ||
          process.env.EXPO_PUBLIC_FORCE_LOGOUT === "true"
        ) {
          await forceLogout();
          return;
        }

        let session = await hydrateFromStorage();

        // No token but have a refresh token — try a silent refresh before giving up.
        if (!session.token && session.refreshToken) {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            session = await hydrateFromStorage();
          }
        }

        if (!mounted) return;

        if (!session.token) {
          dispatch(logout());
          return;
        }

        // Validate the token is still accepted by the server.
        let tokenIsValid = true;
        try {
          await apiRequest("/auth/me", {
            token: session.token,
            suppressStatusCodes: [401, 403],
            skipSessionInvalidateOn401: true,
          });
        } catch (error) {
          if (isUnauthorizedError(error)) {
            tokenIsValid = false;
          }
          // Network/timeout: keep session so user stays signed in offline.
        }

        if (!mounted) return;

        if (!tokenIsValid) {
          Sentry.addBreadcrumb({ category: "auth", message: "stored token rejected by /auth/me", level: "warning" });
          await clearCredentials();
          return;
        }

        // Re-read after potential refresh above to get the freshest values.
        const fresh = await hydrateFromStorage();
        const activeToken = fresh.token ?? session.token;

        dispatch(
          setCredentials({
            token: activeToken,
            refreshToken: fresh.refreshToken ?? session.refreshToken ?? null,
            profile: fresh.profile,
          }),
        );
        lastSavedToken.current = activeToken;
        lastSavedRefreshToken.current =
          fresh.refreshToken ?? session.refreshToken ?? null;
      } finally {
        if (!mounted) return;
        setHydratedState(true);
        dispatch(setHydrated(true));
      }
    })();

    return () => {
      mounted = false;
    };
  }, [dispatch]);

  // ── Bootstrap sync (profile + athletes + push) ───────────────────────────────
  useEffect(() => {
    if (!hydrated || !isAuthenticated || !token) return;
    let active = true;
    let latestUserRole: string | null = null;
    let latestOnboardingAthlete: {
      onboardingCompleted?: boolean;
      userId?: number | null;
      athleteType?: "youth" | "adult" | null;
      team?: string | null;
      teamId?: number | null;
    } | null = null;
    let latestMeAthleteHint: {
      athleteType?: "youth" | "adult" | null;
      team?: string | null;
      teamId?: number | null;
    } | null = null;

    const syncResolvedAppRole = () => {
      if (!active) return;
      const effectiveUserRole =
        (latestUserRole && String(latestUserRole).trim()) || "guardian";
      const tOnboarding = latestOnboardingAthlete?.team;
      const tMe = latestMeAthleteHint?.team;
      const teamForRole = hasAssignedTeam(tOnboarding)
        ? tOnboarding
        : hasAssignedTeam(tMe)
          ? tMe
          : tOnboarding ?? tMe ?? null;
      const idOnboarding = parseTeamIdFromApi(latestOnboardingAthlete?.teamId);
      const idMe = parseTeamIdFromApi(latestMeAthleteHint?.teamId);
      const teamIdForRole = idOnboarding ?? idMe ?? null;
      const athleteTypeForRole =
        latestOnboardingAthlete?.athleteType ??
        latestMeAthleteHint?.athleteType ??
        null;
      dispatch(
        setAppRole(
          resolveAppRole({
            userRole: effectiveUserRole,
            athlete: {
              team: teamForRole,
              teamId: teamIdForRole,
              athleteType: athleteTypeForRole,
            },
          }),
        ),
      );
    };

    const syncProfile = async () => {
      try {
        const me = await apiRequest<{
          user?: {
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
        }>("/auth/me", {
          token,
          suppressStatusCodes: [401, 403],
          forceRefresh: true,
        });
        if (!active || !me.user) return;
        latestUserRole = me.user.role ?? null;
        const { fields: enrichedTeam, athleteType: enrichedAthleteType } =
          await enrichTeamFieldsIfOnboardingHasThem({
            token,
            meUser: me.user,
          });
        latestMeAthleteHint = {
          athleteType: enrichedAthleteType ?? me.user.athleteType ?? null,
          team: enrichedTeam.team,
          teamId: enrichedTeam.teamId,
        };
        dispatch(
          setAuthTeamMembership({
            team: enrichedTeam.team,
            teamId: enrichedTeam.teamId,
          }),
        );
        dispatch(setApiUserRole(latestUserRole));
        dispatch(setProgramTier(me.user.programTier ?? null));
        dispatch(setMessagingAccessTiers(me.user.messagingAccessTiers ?? []));
        dispatch(setCapabilities(me.user.capabilities ?? null));
        dispatch(setPlanFeatures(me.user.planFeatures ?? []));
        dispatch(
          updateProfile({
            name: me.user.name ?? null,
            email: me.user.email ?? null,
            avatar: me.user.profilePicture ?? null,
          }),
        );
        if (__DEV__ && me.user.debugProgramAccess) {
          console.log(
            "[AuthPersist] debugProgramAccess",
            me.user.debugProgramAccess,
          );
        }
        syncResolvedAppRole();
      } catch (error) {
        if (!active) return;
        Sentry.addBreadcrumb({ category: "auth", message: "syncProfile failed", level: "warning" });
      }
    };

    const syncManagedAthletes = async () => {
      try {
        const data = await apiRequest<{
          athletes?: {
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
          }[];
        }>("/onboarding/athletes", {
          token,
          suppressStatusCodes: [401, 403, 404],
        });
        if (!active) return;
        const athletes = data.athletes ?? [];
        dispatch(setManagedAthletes(athletes));
        if (athletes.length > 0) {
          latestOnboardingAthlete = athletes[0];
        }
      } catch {
        if (!active) return;
        dispatch(setManagedAthletes([]));
      }
    };

    const syncPushToken = async () => {
      try {
        const result = await registerDevicePushToken({ token, dispatch });
        if (result.expoPushToken) {
          lastPushToken.current = result.expoPushToken;
        }
        if (
          result.support === "supported" &&
          result.permissionStatus === "granted"
        ) {
          await promptBatteryOptimizationConsentOnce();
        }
      } catch (error) {
        if (__DEV__) console.warn("[PushTokenSync] Failed:", error);
      }
    };

    void Promise.allSettled([
      syncProfile(),
      syncManagedAthletes(),
      syncPushToken(),
    ]).then(() => {
      if (!active) return;
      syncResolvedAppRole();
      const state = require("@/store").store.getState();
      const p = state.user.profile;
      if (p?.id || p?.email) {
        Sentry.setUser({ id: p.id ? String(p.id) : undefined, email: p.email ?? undefined });
      }
      dispatch(setBootstrapReady(true));
    });

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void syncProfile();
        void syncPushToken();
      }
    });

    return () => {
      active = false;
      appStateSub.remove();
    };
  }, [dispatch, hydrated, isAuthenticated, token]);

  // ── Retry push token registration until synced ───────────────────────────────
  useEffect(() => {
    if (!hydrated || !isAuthenticated || !token || !bootstrapReady) return;
    if (pushRegistration.lastSyncedAt) return;
    if (pushRegistration.support !== "supported") return;

    const delayed = setTimeout(() => {
      void registerDevicePushToken({ token, dispatch });
    }, 2500);

    const interval = setInterval(() => {
      void registerDevicePushToken({ token, dispatch });
    }, 90_000);

    return () => {
      clearTimeout(delayed);
      clearInterval(interval);
    };
  }, [
    hydrated,
    isAuthenticated,
    token,
    bootstrapReady,
    dispatch,
    pushRegistration.lastSyncedAt,
    pushRegistration.support,
  ]);

  // ── Persist token changes to SecureStore ─────────────────────────────────────
  useEffect(() => {
    if (!hydrated) return;
    (async () => {
      if (isAuthenticated && token) {
        const tokenUnchanged =
          lastSavedToken.current === token &&
          lastSavedRefreshToken.current === (refreshToken ?? null);
        if (!tokenUnchanged) {
          await persistCredentials({ token, refreshToken: refreshToken ?? null, profile });
          lastSavedToken.current = token;
          lastSavedRefreshToken.current = refreshToken ?? null;
        }
      } else {
        Sentry.setUser(null);
        dispatch(setBootstrapReady(false));
        await clearCredentials();
        clearApiCache();
        lastSavedToken.current = null;
        lastSavedRefreshToken.current = null;
      }
    })();
  }, [hydrated, isAuthenticated, token, refreshToken, profile]);

  return null;
}
