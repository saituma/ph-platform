import * as SecureStore from "expo-secure-store";
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
import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { registerDevicePushToken } from "@/lib/pushRegistration";
import { resolveAppRole } from "@/lib/appRole";
import { hasAssignedTeam } from "@/lib/teamMembership";
import { enrichTeamFieldsIfOnboardingHasThem } from "@/lib/auth/enrichTeamFromOnboarding";
import { parseTeamIdFromApi } from "@/lib/tracking/teamTrackingGate";
import { promptBatteryOptimizationConsentOnce } from "@/lib/batteryOptimizationConsent";

const STORAGE_KEYS = {
  token: "authToken",
  refreshToken: "authRefreshToken",
  id: "profileId",
  name: "profileName",
  email: "profileEmail",
  avatar: "profileAvatar",
};

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
  const isAuthRoute = false;
  const [hydrated, setHydratedState] = useState(false);
  const lastSavedToken = useRef<string | null>(null);
  const lastSavedRefreshToken = useRef<string | null>(null);
  const lastPushToken = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    dispatch(setBootstrapReady(false));
    (async () => {
      try {
        const forceLogout =
          process.env.EXPO_PUBLIC_FORCE_LOGOUT === "1" ||
          process.env.EXPO_PUBLIC_FORCE_LOGOUT === "true";
        if (forceLogout) {
          await SecureStore.deleteItemAsync(STORAGE_KEYS.token);
          await SecureStore.deleteItemAsync(STORAGE_KEYS.refreshToken);
          await SecureStore.deleteItemAsync(STORAGE_KEYS.id);
          await SecureStore.deleteItemAsync(STORAGE_KEYS.name);
          await SecureStore.deleteItemAsync(STORAGE_KEYS.email);
          await SecureStore.deleteItemAsync(STORAGE_KEYS.avatar);
          dispatch(logout());
          return;
        }
        const storedTokenRaw = await SecureStore.getItemAsync(
          STORAGE_KEYS.token,
        );
        const storedRefreshToken = await SecureStore.getItemAsync(
          STORAGE_KEYS.refreshToken,
        );
        const storedId = await SecureStore.getItemAsync(STORAGE_KEYS.id);
        const storedName = await SecureStore.getItemAsync(STORAGE_KEYS.name);
        const storedEmail = await SecureStore.getItemAsync(STORAGE_KEYS.email);
        const storedAvatar = await SecureStore.getItemAsync(
          STORAGE_KEYS.avatar,
        );
        let storedToken = storedTokenRaw?.trim() ?? null;
        const hasRefreshToken =
          Boolean(storedRefreshToken) &&
          storedRefreshToken !== "null" &&
          storedRefreshToken !== "undefined";
        let hasValidToken =
          Boolean(storedToken) &&
          storedToken !== "null" &&
          storedToken !== "undefined";

        if (!mounted) return;
        if (!hasValidToken && hasRefreshToken) {
          try {
            const baseUrl = getApiBaseUrl();
            const normalizedBaseUrl = baseUrl
              ?.replace(/\/+$/, "")
              .endsWith("/api")
              ? baseUrl.replace(/\/+$/, "")
              : `${baseUrl?.replace(/\/+$/, "")}/api`;
            const refreshResponse = await fetch(
              `${normalizedBaseUrl}/auth/refresh`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken: storedRefreshToken }),
              },
            );
            if (refreshResponse.ok) {
              const payload = await refreshResponse.json().catch(() => null);
              const refreshedToken =
                typeof payload?.idToken === "string"
                  ? payload.idToken
                  : typeof payload?.accessToken === "string"
                    ? payload.accessToken
                    : null;
              const refreshedRefreshToken =
                typeof payload?.refreshToken === "string" &&
                payload.refreshToken.trim().length
                  ? payload.refreshToken.trim()
                  : storedRefreshToken;
              if (refreshedToken) {
                await SecureStore.setItemAsync(
                  STORAGE_KEYS.token,
                  refreshedToken,
                );
                await SecureStore.setItemAsync(
                  STORAGE_KEYS.refreshToken,
                  refreshedRefreshToken ?? "",
                );
                storedToken = refreshedToken;
                hasValidToken = true;
              }
            }
          } catch {
            // Continue to logout path if refresh fails.
          }
        }

        if (!hasValidToken) {
          dispatch(logout());
          return;
        }

        let tokenIsValid = true;
        try {
          await apiRequest("/auth/me", {
            token: storedToken,
            suppressStatusCodes: [401, 403],
            // Hydration owns clearing SecureStore on invalid session; avoid duplicate global logout.
            skipSessionInvalidateOn401: true,
          });
        } catch (error) {
          if (isUnauthorizedError(error)) {
            tokenIsValid = false;
          }
          // Network / timeout: keep stored session so the user stays signed in offline or flaky networks.
        }

        if (!mounted) return;
        if (!tokenIsValid) {
          await SecureStore.deleteItemAsync(STORAGE_KEYS.token);
          await SecureStore.deleteItemAsync(STORAGE_KEYS.refreshToken);
          await SecureStore.deleteItemAsync(STORAGE_KEYS.id);
          await SecureStore.deleteItemAsync(STORAGE_KEYS.name);
          await SecureStore.deleteItemAsync(STORAGE_KEYS.email);
          await SecureStore.deleteItemAsync(STORAGE_KEYS.avatar);
          dispatch(logout());
          return;
        }

        const currentTokenRaw = await SecureStore.getItemAsync(
          STORAGE_KEYS.token,
        );
        const currentRefreshToken = await SecureStore.getItemAsync(
          STORAGE_KEYS.refreshToken,
        );
        const activeToken = currentTokenRaw?.trim() || storedToken;

        dispatch(
          setCredentials({
            token: activeToken!,
            refreshToken: currentRefreshToken ?? storedRefreshToken ?? null,
            profile: {
              id: storedId ?? null,
              name: storedName ?? null,
              email: storedEmail ?? null,
              avatar: storedAvatar ?? null,
            },
          }),
        );
        lastSavedToken.current = activeToken;
        lastSavedRefreshToken.current =
          currentRefreshToken ?? storedRefreshToken ?? null;
      } finally {
        if (!mounted) return;
        setHydratedState(true);
        dispatch(setHydrated(true));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [dispatch, isAuthRoute]);

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !token) return;
    let active = true;
    let initialized = false;
    let latestUserRole: string | null = null;
    let latestOnboardingAthlete: {
      onboardingCompleted?: boolean;
      userId?: number | null;
      athleteType?: "youth" | "adult" | null;
      team?: string | null;
      teamId?: number | null;
    } | null = null;
    /** From GET /auth/me — used when /onboarding/athletes is empty (e.g. athlete logged in without a guardian row). */
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
        latestOnboardingAthlete?.athleteType ?? latestMeAthleteHint?.athleteType ?? null;
      const athleteForRole = {
        team: teamForRole,
        teamId: teamIdForRole,
        athleteType: athleteTypeForRole,
      };
      dispatch(
        setAppRole(
          resolveAppRole({
            userRole: effectiveUserRole,
            athlete: athleteForRole,
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
          // Avoid stale cached /auth/me (team label / teamId) after server or roster changes.
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
          console.log("[AuthPersist] debugProgramAccess", me.user.debugProgramAccess);
        }
        syncResolvedAppRole();
      } catch {
        if (!active) return;
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
        const result = await registerDevicePushToken({
          token,
          dispatch,
        });
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
      // One dispatch after profile + onboarding refs are both updated — avoids
      // swapping tab layouts twice (home "reloading") when parallel syncs finish out of order.
      syncResolvedAppRole();
      dispatch(setBootstrapReady(true));
      initialized = true;
    });

    const interval = setInterval(() => {
      /* Periodic background syncs */
    }, 30000);

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void syncProfile();
        void syncPushToken();
      }
    });

    return () => {
      active = false;
      clearInterval(interval);
      appStateSub.remove();
    };
  }, [dispatch, hydrated, isAuthenticated, token]);

  /** Until the API stores a push token, remote notifications cannot be sent (see Render `no_expo_token_for_user`). */
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

  useEffect(() => {
    if (!hydrated) return;
    (async () => {
      if (isAuthenticated && token) {
        const tokenUnchanged =
          lastSavedToken.current === token &&
          lastSavedRefreshToken.current === (refreshToken ?? null);
        if (!tokenUnchanged) {
          await SecureStore.setItemAsync(STORAGE_KEYS.token, token);
          if (refreshToken) {
            await SecureStore.setItemAsync(
              STORAGE_KEYS.refreshToken,
              refreshToken,
            );
          } else {
            await SecureStore.deleteItemAsync(STORAGE_KEYS.refreshToken);
          }
          await SecureStore.setItemAsync(STORAGE_KEYS.id, profile.id ?? "");
          await SecureStore.setItemAsync(STORAGE_KEYS.name, profile.name ?? "");
          await SecureStore.setItemAsync(
            STORAGE_KEYS.email,
            profile.email ?? "",
          );
          await SecureStore.setItemAsync(
            STORAGE_KEYS.avatar,
            profile.avatar ?? "",
          );
          lastSavedToken.current = token;
          lastSavedRefreshToken.current = refreshToken ?? null;
        }
      } else {
        dispatch(setBootstrapReady(false));
        await SecureStore.deleteItemAsync(STORAGE_KEYS.token);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.refreshToken);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.id);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.name);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.email);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.avatar);
        lastSavedToken.current = null;
        lastSavedRefreshToken.current = null;
        clearApiCache();
        // navigation disabled outside router context
      }
    })();
  }, [
    hydrated,
    isAuthenticated,
    token,
    refreshToken,
    profile,
    isAuthRoute,
  ]);

  return null;
}
