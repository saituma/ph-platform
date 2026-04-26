import { apiRequest } from "@/lib/api";
import { setupNotificationChannels } from "@/lib/notificationSetup";
import type { AppDispatch } from "@/store";
import { setPushRegistration } from "@/store/slices";

import { getNotifications } from "./notifications";

type RegisterPushTokenOptions = {
  token: string;
  dispatch?: AppDispatch;
  requestPermission?: boolean;
  skipBackendSync?: boolean;
};

type RegisterPushTokenResult = {
  support: "supported" | "expo_go" | "unavailable";
  permissionStatus: "granted" | "denied" | "undetermined";
  expoPushToken: string | null;
  devicePushToken: string | null;
  devicePushTokenType: "fcm" | "apns" | "unknown" | null;
  devicePushTokenError: string | null;
  projectId: string | null;
  synced: boolean;
  error: string | null;
};

async function getProjectId() {
  const Constants = await import("expo-constants");
  const anyConstants = Constants as any;
  return (
    anyConstants?.default?.expoConfig?.extra?.eas?.projectId ??
    anyConstants?.expoConfig?.extra?.eas?.projectId ??
    anyConstants?.default?.easConfig?.projectId ??
    anyConstants?.easConfig?.projectId ??
    null
  );
}

function syncPushState(
  dispatch: AppDispatch | undefined,
  payload: Partial<RegisterPushTokenResult> & {
    lastAttemptAt?: string | null;
    lastSyncedAt?: string | null;
    lastError?: string | null;
  },
) {
  if (!dispatch) return;
  dispatch(
    setPushRegistration({
      support: payload.support,
      permissionStatus: payload.permissionStatus,
      expoPushToken: payload.expoPushToken,
      devicePushToken: payload.devicePushToken,
      devicePushTokenType: payload.devicePushTokenType,
      devicePushTokenError: payload.devicePushTokenError,
      projectId: payload.projectId,
      lastAttemptAt: payload.lastAttemptAt ?? new Date().toISOString(),
      lastSyncedAt: payload.lastSyncedAt ?? null,
      lastError: payload.lastError ?? payload.error ?? null,
    }),
  );
}

export async function registerDevicePushToken({
  token,
  dispatch,
  requestPermission = true,
  skipBackendSync = false,
}: RegisterPushTokenOptions): Promise<RegisterPushTokenResult> {
  const attemptedAt = new Date().toISOString();
  const Notifications = await getNotifications();

  if (!Notifications) {
    const isExpoGo = await import("expo-constants").then((c: any) => 
      (c?.default?.appOwnership ?? c?.appOwnership) === "expo"
    ).catch(() => false);

    if (isExpoGo) {
      // Expo Go cannot receive remote pushes. Don't generate/sync a fake token,
      // otherwise the backend will try to send pushes that can never deliver.
      const result: RegisterPushTokenResult = {
        support: "expo_go",
        permissionStatus: "undetermined",
        expoPushToken: null,
        devicePushToken: null,
        devicePushTokenType: null,
        devicePushTokenError: null,
        projectId: await getProjectId().catch(() => null),
        synced: false,
        error: "Expo Go does not support remote push notifications. Use an EAS dev build or a store build to test.",
      };
      syncPushState(dispatch, {
        ...result,
        lastAttemptAt: attemptedAt,
        lastSyncedAt: null,
        lastError: result.error,
      });
      console.warn("[PushRegistration]", result.error);
      return result;
    }

    const result: RegisterPushTokenResult = {
      support: "unavailable",
      permissionStatus: "undetermined",
      expoPushToken: null,
      devicePushToken: null,
      devicePushTokenType: null,
      devicePushTokenError: null,
      projectId: null,
      synced: false,
      error: "Push notifications require a native build.",
    };
    syncPushState(dispatch, { ...result, lastAttemptAt: attemptedAt, lastError: result.error });
    console.warn("[PushRegistration]", result.error);
    return result;
  }

  try {
    await setupNotificationChannels();
    const existingPermission = await Notifications.getPermissionsAsync();
    let permissionStatus = existingPermission.status;

    if (permissionStatus !== "granted" && requestPermission) {
      const nextPermission = await Notifications.requestPermissionsAsync();
      permissionStatus = nextPermission.status;
    }

    if (permissionStatus !== "granted") {
      const result: RegisterPushTokenResult = {
        support: "supported",
        permissionStatus,
        expoPushToken: null,
        devicePushToken: null,
        devicePushTokenType: null,
        devicePushTokenError: null,
        projectId: await getProjectId(),
        synced: false,
        error: "Notification permission not granted.",
      };
      syncPushState(dispatch, { ...result, lastAttemptAt: attemptedAt, lastError: result.error });
      console.warn("[PushRegistration]", result.error);
      return result;
    }

    const projectId = await getProjectId();
    if (!projectId) {
      const result: RegisterPushTokenResult = {
        support: "supported",
        permissionStatus,
        expoPushToken: null,
        devicePushToken: null,
        devicePushTokenType: null,
        devicePushTokenError: null,
        projectId: null,
        synced: false,
        error: "Missing Expo project ID for push token registration.",
      };
      syncPushState(dispatch, { ...result, lastAttemptAt: attemptedAt, lastError: result.error });
      console.warn("[PushRegistration]", result.error);
      return result;
    }

    let devicePushToken: string | null = null;
    let devicePushTokenType: "fcm" | "apns" | "unknown" | null = null;
    let devicePushTokenError: string | null = null;

    if (typeof (Notifications as any).getDevicePushTokenAsync === "function") {
      try {
        const resp = await (Notifications as any).getDevicePushTokenAsync();
        devicePushToken = resp?.data ?? null;
        if (resp?.type === "android") devicePushTokenType = "fcm";
        else if (resp?.type === "ios") devicePushTokenType = "apns";
        else if (devicePushToken) devicePushTokenType = "unknown";
      } catch (e) {
        devicePushTokenError =
          e instanceof Error ? e.message : "Failed to get device push token.";
      }
    }

    const pushTokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const expoPushToken = pushTokenResponse?.data ?? null;
    if (!expoPushToken) {
      const result: RegisterPushTokenResult = {
        support: "supported",
        permissionStatus,
        expoPushToken: null,
        devicePushToken,
        devicePushTokenType,
        devicePushTokenError,
        projectId,
        synced: false,
        error: "Expo push token was empty.",
      };
      syncPushState(dispatch, { ...result, lastAttemptAt: attemptedAt, lastError: result.error });
      return result;
    }

    // Get a stable device identifier for multi-device push support.
    let deviceId: string | undefined;
    try {
      const Device = await import("expo-device");
      const raw = (Device as any).default?.osBuildId ?? (Device as any).osBuildId ?? null;
      if (raw && typeof raw === "string" && raw.trim()) {
        deviceId = raw.trim();
      }
    } catch {
      // expo-device not available; fall back to single-token mode
    }

    let synced = false;
    let error: string | null = null;
    if (!skipBackendSync) {
      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await apiRequest("/users/push-token", {
            method: "POST",
            body: {
              token: expoPushToken,
              devicePushToken,
              devicePushTokenType: devicePushTokenType ?? undefined,
              ...(deviceId ? { deviceId } : {}),
            },
            token,
            suppressStatusCodes: [401, 403],
          });
          synced = true;
          break;
        } catch (syncError) {
          error =
            syncError instanceof Error
              ? syncError.message
              : "Failed to sync Expo push token with backend.";
          if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, 400 * attempt));
          }
        }
      }
    }

    const result: RegisterPushTokenResult = {
      support: "supported",
      permissionStatus,
      expoPushToken,
      devicePushToken,
      devicePushTokenType,
      devicePushTokenError,
      projectId,
      synced,
      error,
    };
    syncPushState(dispatch, {
      ...result,
      lastAttemptAt: attemptedAt,
      lastSyncedAt: synced ? attemptedAt : null,
      lastError: error,
    });
    if (!skipBackendSync && expoPushToken && !synced && error) {
      console.warn("[PushRegistration] Expo token not saved to API:", error);
    }
    return result;
  } catch (error) {
    const projectId = await getProjectId().catch(() => null);
    const message =
      error instanceof Error ? error.message : "Push registration failed unexpectedly.";
    const result: RegisterPushTokenResult = {
      support: "supported",
      permissionStatus: "undetermined",
      expoPushToken: null,
      devicePushToken: null,
      devicePushTokenType: null,
      devicePushTokenError: null,
      projectId,
      synced: false,
      error: message,
    };
    syncPushState(dispatch, { ...result, lastAttemptAt: attemptedAt, lastError: message });
    return result;
  }
}
