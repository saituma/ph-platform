import * as SecureStore from "expo-secure-store";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "expo-router";
import { AppState } from "react-native";
import { useAppDispatch, useAppSelector } from "./hooks";
import {
  setCredentials,
  logout,
  setOnboardingCompleted,
  setAthleteUserId,
  setHydrated,
  setProgramTier,
  setLatestSubscriptionRequest,
  updateProfile,
} from "./slices/userSlice";
import { apiRequest } from "@/lib/api";
import { getNotifications } from "@/lib/notifications";

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
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return message.startsWith("401 ") || message.startsWith("403 ");
};

export function AuthPersist() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const token = useAppSelector((state) => state.user.token);
  const refreshToken = useAppSelector((state) => state.user.refreshToken);
  const profile = useAppSelector((state) => state.user.profile);
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydratedState] = useState(false);
  const lastSavedToken = useRef<string | null>(null);
  const lastSavedRefreshToken = useRef<string | null>(null);
  const lastBillingSnapshot = useRef<{ tier: string | null; requestStatus: string | null } | null>(null);
  const isAuthRoute =
    pathname.startsWith("/(auth)") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/verify" ||
    pathname === "/forgot" ||
    pathname === "/reset-password";

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(STORAGE_KEYS.token);
        const storedRefreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.refreshToken);
        const storedId = await SecureStore.getItemAsync(STORAGE_KEYS.id);
        const storedName = await SecureStore.getItemAsync(STORAGE_KEYS.name);
        const storedEmail = await SecureStore.getItemAsync(STORAGE_KEYS.email);
        const storedAvatar = await SecureStore.getItemAsync(STORAGE_KEYS.avatar);

        if (!mounted) return;
        if (storedToken) {
          dispatch(
            setCredentials({
              token: storedToken,
              refreshToken: storedRefreshToken,
              profile: {
                id: storedId ?? null,
                name: storedName ?? null,
                email: storedEmail ?? null,
                avatar: storedAvatar ?? null,
              },
            })
          );
          lastSavedToken.current = storedToken;
          lastSavedRefreshToken.current = storedRefreshToken;
          try {
            const me = await apiRequest<{ user?: { name?: string | null; email?: string | null; profilePicture?: string | null } }>(
              "/auth/me",
              { token: storedToken, suppressStatusCodes: [401, 403] }
            );
            if (me.user) {
              dispatch(
                updateProfile({
                  name: me.user.name ?? null,
                  email: me.user.email ?? null,
                  avatar: me.user.profilePicture ?? null,
                })
              );
            }
          } catch {
            // no-op
          }
          try {
            const onboarding = await apiRequest<{ athlete: { onboardingCompleted?: boolean; userId?: number } | null }>(
              "/onboarding",
              { token: storedToken, suppressStatusCodes: [401, 403] }
            );
            dispatch(setOnboardingCompleted(Boolean(onboarding.athlete?.onboardingCompleted)));
            dispatch(setAthleteUserId(onboarding.athlete?.userId ?? null));
          } catch (error) {
            if (isUnauthorizedError(error)) {
              dispatch(setOnboardingCompleted(null));
              dispatch(setAthleteUserId(null));
            }
          }
          try {
            const status = await apiRequest<{
              currentProgramTier?: string | null;
              latestRequest?: {
                status?: string | null;
                paymentStatus?: string | null;
                planTier?: string | null;
                createdAt?: string | null;
              } | null;
            }>("/billing/status", {
              token: storedToken,
              suppressStatusCodes: [401, 403, 404],
            });
            dispatch(setProgramTier(status?.currentProgramTier ?? null));
            dispatch(setLatestSubscriptionRequest(status?.latestRequest ?? null));
          } catch {
            dispatch(setProgramTier(null));
            dispatch(setLatestSubscriptionRequest(null));
          }
        } else {
          dispatch(logout());
          if (!isAuthRoute) {
            router.replace("/(auth)/login");
          }
        }
      } finally {
        if (!mounted) return;
        setHydratedState(true);
        dispatch(setHydrated(true));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [dispatch, isAuthRoute, router]);

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !token) return;
    let active = true;
    let initialized = false;

    const syncProfile = async () => {
      try {
        const me = await apiRequest<{ user?: { name?: string | null; email?: string | null; profilePicture?: string | null } }>(
          "/auth/me",
          { token, suppressStatusCodes: [401, 403] }
        );
        if (!active || !me.user) return;
        dispatch(
          updateProfile({
            name: me.user.name ?? null,
            email: me.user.email ?? null,
            avatar: me.user.profilePicture ?? null,
          })
        );
      } catch {
        if (!active) return;
      }
    };

    const syncBillingStatus = async (allowNotify: boolean) => {
      try {
        const status = await apiRequest<{
          currentProgramTier?: string | null;
          latestRequest?: {
            status?: string | null;
            paymentStatus?: string | null;
            planTier?: string | null;
            createdAt?: string | null;
          } | null;
        }>("/billing/status", {
          token,
          suppressStatusCodes: [401, 403, 404],
        });
        if (!active) return;

        const nextRequestStatus = status?.latestRequest?.status ?? null;
        const nextTier =
          status?.currentProgramTier ??
          (nextRequestStatus === "approved" ? status?.latestRequest?.planTier ?? null : null);
        const previous = lastBillingSnapshot.current;
        const becameApproved =
          previous &&
          previous.requestStatus !== "approved" &&
          nextRequestStatus === "approved";
        const tierChanged = previous && previous.tier !== nextTier;

        dispatch(setProgramTier(nextTier));
        dispatch(setLatestSubscriptionRequest(status?.latestRequest ?? null));
        lastBillingSnapshot.current = { tier: nextTier, requestStatus: nextRequestStatus };

        if (allowNotify && (becameApproved || tierChanged)) {
          const Notifications = await getNotifications();
          if (Notifications && typeof Notifications.scheduleNotificationAsync === "function") {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: "Plan approved",
                body: `Your ${String(nextTier ?? "program").replace("_", " ")} access is now active.`,
                sound: "default",
                data: { screen: "plans" },
              },
              trigger: null,
            });
          }
        }
      } catch {
        if (!active) return;
      }
    };

    void syncBillingStatus(false);
    void syncProfile();
    initialized = true;
    const interval = setInterval(() => {
      void syncBillingStatus(initialized);
    }, 30000);

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void syncBillingStatus(initialized);
        void syncProfile();
      }
    });

    return () => {
      active = false;
      clearInterval(interval);
      appStateSub.remove();
    };
  }, [dispatch, hydrated, isAuthenticated, token]);

  useEffect(() => {
    if (!hydrated) return;
    (async () => {
      if (isAuthenticated && token) {
        if (lastSavedToken.current === token && lastSavedRefreshToken.current === (refreshToken ?? null)) {
          return;
        }
        await SecureStore.setItemAsync(STORAGE_KEYS.token, token);
        if (refreshToken) {
          await SecureStore.setItemAsync(STORAGE_KEYS.refreshToken, refreshToken);
        } else {
          await SecureStore.deleteItemAsync(STORAGE_KEYS.refreshToken);
        }
        await SecureStore.setItemAsync(STORAGE_KEYS.id, profile.id ?? "");
        await SecureStore.setItemAsync(STORAGE_KEYS.name, profile.name ?? "");
        await SecureStore.setItemAsync(STORAGE_KEYS.email, profile.email ?? "");
        await SecureStore.setItemAsync(STORAGE_KEYS.avatar, profile.avatar ?? "");
        lastSavedToken.current = token;
        lastSavedRefreshToken.current = refreshToken ?? null;
      } else {
        await SecureStore.deleteItemAsync(STORAGE_KEYS.token);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.refreshToken);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.id);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.name);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.email);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.avatar);
        lastSavedToken.current = null;
        lastSavedRefreshToken.current = null;
        if (!isAuthRoute) {
          router.replace("/(auth)/login");
        }
      }
    })();
  }, [hydrated, isAuthenticated, token, refreshToken, profile, pathname, router, isAuthRoute]);

  return null;
}
