import * as SecureStore from "expo-secure-store";
import React, { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "expo-router";
import { useAppDispatch, useAppSelector } from "./hooks";
import {
  setCredentials,
  logout,
  setOnboardingCompleted,
  setAthleteUserId,
  setHydrated,
  setProgramTier,
  setLatestSubscriptionRequest,
} from "./slices/userSlice";
import { apiRequest } from "@/lib/api";

const STORAGE_KEYS = {
  token: "authToken",
  id: "profileId",
  name: "profileName",
  email: "profileEmail",
  avatar: "profileAvatar",
};

export function AuthPersist() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, token, profile } = useAppSelector((state) => state.user);
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydratedState] = useState(false);
  const lastSavedToken = useRef<string | null>(null);
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
      const storedToken = await SecureStore.getItemAsync(STORAGE_KEYS.token);
      const storedId = await SecureStore.getItemAsync(STORAGE_KEYS.id);
      const storedName = await SecureStore.getItemAsync(STORAGE_KEYS.name);
      const storedEmail = await SecureStore.getItemAsync(STORAGE_KEYS.email);
      const storedAvatar = await SecureStore.getItemAsync(STORAGE_KEYS.avatar);

      if (!mounted) return;
      if (storedToken) {
        dispatch(
          setCredentials({
            token: storedToken,
            profile: {
              id: storedId ?? null,
              name: storedName ?? null,
              email: storedEmail ?? null,
              avatar: storedAvatar ?? null,
            },
          })
        );
        lastSavedToken.current = storedToken;
        try {
          const onboarding = await apiRequest<{ athlete: { onboardingCompleted?: boolean; userId?: number } | null }>(
            "/onboarding",
            { token: storedToken, suppressStatusCodes: [401] }
          );
          dispatch(setOnboardingCompleted(Boolean(onboarding.athlete?.onboardingCompleted)));
          dispatch(setAthleteUserId(onboarding.athlete?.userId ?? null));
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
        } catch {
          // Invalid/expired token - reset and send to login.
          dispatch(setOnboardingCompleted(null));
          dispatch(setAthleteUserId(null));
          dispatch(setProgramTier(null));
          dispatch(setLatestSubscriptionRequest(null));
          dispatch(logout());
          if (!isAuthRoute) {
            router.replace("/(auth)/login");
          }
        }
      } else {
        dispatch(logout());
        if (!isAuthRoute) {
          router.replace("/(auth)/login");
        }
      }
      setHydratedState(true);
      dispatch(setHydrated(true));
    })();
    return () => {
      mounted = false;
    };
  }, [dispatch]);

  useEffect(() => {
    if (!hydrated) return;
    (async () => {
      if (isAuthenticated && token) {
        if (lastSavedToken.current === token) {
          return;
        }
        await SecureStore.setItemAsync(STORAGE_KEYS.token, token);
        await SecureStore.setItemAsync(STORAGE_KEYS.id, profile.id ?? "");
        await SecureStore.setItemAsync(STORAGE_KEYS.name, profile.name ?? "");
        await SecureStore.setItemAsync(STORAGE_KEYS.email, profile.email ?? "");
        await SecureStore.setItemAsync(STORAGE_KEYS.avatar, profile.avatar ?? "");
        lastSavedToken.current = token;
      } else {
        await SecureStore.deleteItemAsync(STORAGE_KEYS.token);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.id);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.name);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.email);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.avatar);
        lastSavedToken.current = null;
        if (!isAuthRoute) {
          router.replace("/(auth)/login");
        }
      }
    })();
  }, [hydrated, isAuthenticated, token, profile, pathname, router, isAuthRoute]);

  return null;
}
