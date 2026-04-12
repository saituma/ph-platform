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
  setOnboardingCompleted,
  setAthleteUserId,
  setHydrated,
  setProgramTier,
  setMessagingAccessTiers,
  setLatestSubscriptionRequest,
  updateProfile,
  setManagedAthletes,
  setAppRole,
  setApiUserRole,
} from "./slices/userSlice";
import { apiRequest, clearApiCache } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { reduxStateFromOnboardingAthlete } from "@/lib/onboardingFromApi";
import { registerDevicePushToken } from "@/lib/pushRegistration";
import { resolveAppRole } from "@/lib/appRole";

const STORAGE_KEYS = {
  token: "authToken",
  refreshToken: "authRefreshToken",
  id: "profileId",
  name: "profileName",
  email: "profileEmail",
  avatar: "profileAvatar",
  onboardingCompleted: "onboardingCompleted",
  athleteUserId: "athleteUserId",
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
  const onboardingCompleted = useAppSelector(
    (state) => state.user.onboardingCompleted,
  );
  const athleteUserId = useAppSelector((state) => state.user.athleteUserId);
  const bootstrapReady = useAppSelector(selectBootstrapReady);
  const pushRegistration = useAppSelector(selectPushRegistration);
  const isAuthRoute = false;
  const [hydrated, setHydratedState] = useState(false);
  const lastSavedToken = useRef<string | null>(null);
  const lastSavedRefreshToken = useRef<string | null>(null);
  const lastBillingSnapshot = useRef<{
    tier: string | null;
    requestStatus: string | null;
  } | null>(null);
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
          await SecureStore.deleteItemAsync(STORAGE_KEYS.onboardingCompleted);
          await SecureStore.deleteItemAsync(STORAGE_KEYS.athleteUserId);
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
          await SecureStore.deleteItemAsync(STORAGE_KEYS.onboardingCompleted);
          await SecureStore.deleteItemAsync(STORAGE_KEYS.athleteUserId);
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

        const storedOnboarding = await SecureStore.getItemAsync(
          STORAGE_KEYS.onboardingCompleted,
        );
        const storedAthleteUserId = await SecureStore.getItemAsync(
          STORAGE_KEYS.athleteUserId,
        );

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
        const parsedAid = (() => {
          const raw = storedAthleteUserId?.trim();
          if (!raw) return null;
          const n = parseInt(raw, 10);
          return Number.isFinite(n) ? n : null;
        })();
        if (storedOnboarding === "1") {
          dispatch(setOnboardingCompleted(true));
          dispatch(setAthleteUserId(parsedAid));
        } else if (storedOnboarding === "0") {
          dispatch(setOnboardingCompleted(false));
          dispatch(setAthleteUserId(parsedAid));
        }
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
      userId?: number;
      athleteType?: "youth" | "adult" | null;
      team?: string | null;
    } | null = null;

    const syncResolvedAppRole = () => {
      if (!active || !latestUserRole) return;
      dispatch(
        setAppRole(
          resolveAppRole({
            userRole: latestUserRole,
            athlete: latestOnboardingAthlete,
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
          };
        }>("/auth/me", { token, suppressStatusCodes: [401, 403] });
        if (!active || !me.user) return;
        latestUserRole = me.user.role ?? null;
        dispatch(setApiUserRole(latestUserRole));
        dispatch(
          updateProfile({
            name: me.user.name ?? null,
            email: me.user.email ?? null,
            avatar: me.user.profilePicture ?? null,
          }),
        );
      } catch {
        if (!active) return;
      }
    };

    const syncOnboarding = async () => {
      try {
        const onboarding = await apiRequest<{
          athlete: {
            onboardingCompleted?: boolean;
            userId?: number;
            athleteType?: "youth" | "adult" | null;
            team?: string | null;
          } | null;
        }>("/onboarding", {
          token,
          suppressStatusCodes: [401, 403, 500],
          skipCache: true,
          forceRefresh: true,
        });
        if (!active) return;
        latestOnboardingAthlete = onboarding.athlete ?? null;
        if (onboarding.athlete == null) {
          if (__DEV__) {
            console.log(
              "[AuthPersist] GET /onboarding returned no athlete; keeping existing onboarding state",
            );
          }
          return;
        }
        const next = reduxStateFromOnboardingAthlete(onboarding.athlete);
        dispatch(setOnboardingCompleted(next.onboardingCompleted));
        dispatch(setAthleteUserId(next.athleteUserId));
        if (__DEV__) {
          console.log("[AuthPersist] onboarding synced", next);
        }
      } catch (error) {
        if (!active) return;
        if (isUnauthorizedError(error)) {
          latestOnboardingAthlete = null;
          dispatch(setOnboardingCompleted(null));
          dispatch(setAthleteUserId(null));
        }
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
            team?: string | null;
            level?: string | null;
            trainingPerWeek?: number | null;
            profilePicture?: string | null;
          }[];
        }>("/onboarding/athletes", {
          token,
          suppressStatusCodes: [401, 403, 404],
        });
        if (!active) return;
        dispatch(setManagedAthletes(data.athletes ?? []));
      } catch {
        if (!active) return;
        dispatch(setManagedAthletes([]));
      }
    };

    const syncBillingStatus = async (allowNotify: boolean) => {
      try {
        const status = await apiRequest<{
          currentProgramTier?: string | null;
          messagingAccessTiers?: string[] | null;
          latestRequest?: {
            status?: string | null;
            paymentStatus?: string | null;
            planTier?: string | null;
            createdAt?: string | null;
          } | null;
        }>("/billing/status", {
          token,
          suppressStatusCodes: [401, 403, 404],
          skipCache: true,
        });
        if (!active) return;

        const nextRequestStatus = status?.latestRequest?.status ?? null;
        const nextTier =
          status?.currentProgramTier ??
          (nextRequestStatus === "approved"
            ? (status?.latestRequest?.planTier ?? null)
            : null);
        const previous = lastBillingSnapshot.current;
        const becameApproved =
          previous &&
          previous.requestStatus !== "approved" &&
          nextRequestStatus === "approved";
        const tierChanged = previous && previous.tier !== nextTier;

        dispatch(setProgramTier(nextTier));
        dispatch(
          setMessagingAccessTiers(
            Array.isArray(status?.messagingAccessTiers)
              ? status!.messagingAccessTiers!
              : ["PHP", "PHP_Premium", "PHP_Premium_Plus", "PHP_Pro"],
          ),
        );
        dispatch(setLatestSubscriptionRequest(status?.latestRequest ?? null));
        lastBillingSnapshot.current = {
          tier: nextTier,
          requestStatus: nextRequestStatus,
        };

        if (allowNotify && (becameApproved || tierChanged)) {
          // Push notifications are handled server-side.
        }
      } catch {
        if (!active) return;
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
      } catch (error) {
        if (__DEV__) console.warn("[PushTokenSync] Failed:", error);
      }
    };

    void Promise.allSettled([
      syncBillingStatus(false),
      syncProfile(),
      syncOnboarding(),
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
      void syncBillingStatus(initialized);
    }, 30000);

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void syncBillingStatus(initialized);
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
        if (onboardingCompleted !== null) {
          await SecureStore.setItemAsync(
            STORAGE_KEYS.onboardingCompleted,
            onboardingCompleted ? "1" : "0",
          );
          await SecureStore.setItemAsync(
            STORAGE_KEYS.athleteUserId,
            athleteUserId != null ? String(athleteUserId) : "",
          );
        }
      } else {
        dispatch(setBootstrapReady(false));
        await SecureStore.deleteItemAsync(STORAGE_KEYS.token);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.refreshToken);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.id);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.name);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.email);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.avatar);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.onboardingCompleted);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.athleteUserId);
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
    onboardingCompleted,
    athleteUserId,
    isAuthRoute,
  ]);

  return null;
}
