import * as SecureStore from "expo-secure-store";
import React, { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "./hooks";
import { setCredentials, logout, setOnboardingCompleted, setAthleteUserId } from "./slices/userSlice";
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
  const [hydrated, setHydrated] = useState(false);
  const lastSavedToken = useRef<string | null>(null);

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
            { token: storedToken }
          );
          dispatch(setOnboardingCompleted(Boolean(onboarding.athlete?.onboardingCompleted)));
          dispatch(setAthleteUserId(onboarding.athlete?.userId ?? null));
        } catch {
          dispatch(setOnboardingCompleted(null));
          dispatch(setAthleteUserId(null));
        }
      } else {
        dispatch(logout());
      }
      setHydrated(true);
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
      }
    })();
  }, [hydrated, isAuthenticated, token, profile]);

  return null;
}
