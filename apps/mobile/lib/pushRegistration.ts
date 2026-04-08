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
      const expoPushToken = "ExponentPushToken[expo_go_mock_token]";
      let synced = false;
      let error: string | null = null;
      if (!skipBackendSync) {
        try {
          await apiRequest("/users/push-token", {
            method: "POST",
            body: { token: expoPushToken },
            token,
            suppressStatusCodes: [401, 403],
          });
          synced = true;
        } catch (syncError) {
          error = syncError instanceof Error ? syncError.message : "Failed to sync mock Expo push token with backend.";
        }
      }
      
      const result: RegisterPushTokenResult = {
        support: "expo_go",
        permissionStatus: "granted",
        expoPushToken,
        projectId: "mock-project-id",
        synced,
        error,
      };
      syncPushState(dispatch, { ...result, lastAttemptAt: attemptedAt, lastSyncedAt: synced ? attemptedAt : null, lastError: error });
      return result;
    }

    const result: RegisterPushTokenResult = {
      support: "unavailable",
      permissionStatus: "undetermined",
      expoPushToken: null,
      projectId: null,
      synced: false,
      error: "Push notifications require a native build.",
    };
    syncPushState(dispatch, { ...result, lastAttemptAt: attemptedAt, lastError: result.error });
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
        projectId: await getProjectId(),
        synced: false,
        error: "Notification permission not granted.",
      };
      syncPushState(dispatch, { ...result, lastAttemptAt: attemptedAt, lastError: result.error });
      return result;
    }

    const projectId = await getProjectId();
    if (!projectId) {
      const result: RegisterPushTokenResult = {
        support: "supported",
        permissionStatus,
        expoPushToken: null,
        projectId: null,
        synced: false,
        error: "Missing Expo project ID for push token registration.",
      };
      syncPushState(dispatch, { ...result, lastAttemptAt: attemptedAt, lastError: result.error });
      return result;
    }

    const pushTokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const expoPushToken = pushTokenResponse?.data ?? null;
    if (!expoPushToken) {
      const result: RegisterPushTokenResult = {
        support: "supported",
        permissionStatus,
        expoPushToken: null,
        projectId,
        synced: false,
        error: "Expo push token was empty.",
      };
      syncPushState(dispatch, { ...result, lastAttemptAt: attemptedAt, lastError: result.error });
      return result;
    }

    let synced = false;
    let error: string | null = null;
    if (!skipBackendSync) {
      try {
        await apiRequest("/users/push-token", {
          method: "POST",
          body: { token: expoPushToken },
          token,
          suppressStatusCodes: [401, 403],
        });
        synced = true;
      } catch (syncError) {
        error =
          syncError instanceof Error
            ? syncError.message
            : "Failed to sync Expo push token with backend.";
      }
    }

    const result: RegisterPushTokenResult = {
      support: "supported",
      permissionStatus,
      expoPushToken,
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
    return result;
  } catch (error) {
    const projectId = await getProjectId().catch(() => null);
    const message =
      error instanceof Error ? error.message : "Push registration failed unexpectedly.";
    const result: RegisterPushTokenResult = {
      support: "supported",
      permissionStatus: "undetermined",
      expoPushToken: null,
      projectId,
      synced: false,
      error: message,
    };
    syncPushState(dispatch, { ...result, lastAttemptAt: attemptedAt, lastError: message });
    return result;
  }
}
