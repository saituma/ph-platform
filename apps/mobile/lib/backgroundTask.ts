import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import { useRunStore } from "../store/useRunStore";
import { Alert, Platform } from "react-native";
import { NOTIFICATION_CHANNELS } from "@/lib/notificationSetup";
import { getNotifications } from "@/lib/notifications";
import { store } from "@/store";
import { sendLiveLocation } from "@/services/tracking/locationService";
import { thinRoutePointsForDisplay } from "@/lib/tracking/thinRoute";

export const BACKGROUND_LOCATION_TASK = "BACKGROUND_LOCATION_TASK";

let lastLocationSentAt = 0;
const LOCATION_SEND_INTERVAL_MS = 10000; // Send at most every 10 seconds

// Deep forest green — low saturation, professional (avoids neon eye strain).
const NOTIF_COLOR = "#1A7848";

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`}`;
};

const formatPace = (distanceMeters: number, elapsedSeconds: number): string => {
  const km = distanceMeters / 1000;
  if (km < 0.05 || elapsedSeconds < 5) return "--";
  const secPerKm = elapsedSeconds / km;
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.floor(secPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const refreshRunNotification = async () => {
  const { distanceMeters, elapsedSeconds, status } = useRunStore.getState();
  if (status !== "running") return;

  const kms = (distanceMeters / 1000).toFixed(2);
  const time = formatTime(elapsedSeconds);
  const pace = formatPace(distanceMeters, elapsedSeconds);
  const paceStr = pace !== "--" ? ` · ${pace} /km` : "";

  try {
    // Re-calling startLocationUpdatesAsync with updated foregroundService settings
    // effectively updates the existing sticky notification on Android.
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      activityType: Location.ActivityType.Fitness,
      distanceInterval: 5,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: `${kms} km${paceStr}`,
        notificationBody: `${time} elapsed  ·  Tap to return`,
        notificationColor: NOTIF_COLOR,
      },
    });
  } catch (e) {
    // silent
  }
};

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error("Background Location Error", error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const addCoordinate = useRunStore.getState().addCoordinate;
    const tick = useRunStore.getState().tick;
    const consumeProgressMilestones = useRunStore.getState().consumeProgressMilestones;
    const { shareLiveLocationEnabled } = useRunStore.getState();

    let changed = false;
    let latestCoord: { latitude: number; longitude: number; accuracy: number | null } | null = null;

    locations.forEach((loc) => {
      const lat = loc?.coords?.latitude;
      const lng = loc?.coords?.longitude;
      if (typeof lat !== "number" || typeof lng !== "number" || !isFinite(lat) || !isFinite(lng)) {
        return;
      }
      addCoordinate(
        {
          latitude: lat,
          longitude: lng,
          timestamp: loc.timestamp,
          altitude: loc.coords?.altitude ?? undefined,
        },
        loc.coords?.accuracy ?? null,
      );
      changed = true;
      latestCoord = {
        latitude: lat,
        longitude: lng,
        accuracy: loc.coords?.accuracy ?? null,
      };
    });

    if (changed) {
      tick();
      void refreshRunNotification();

      // Send live location if enabled and enough time has passed
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const coordSnapshot = latestCoord as { latitude: number; longitude: number; accuracy: number | null } | null;
      if (shareLiveLocationEnabled && coordSnapshot) {
        const now = Date.now();
        if (now - lastLocationSentAt > LOCATION_SEND_INTERVAL_MS) {
          const token = store.getState().user.token;
          if (token) {
            lastLocationSentAt = now;
            const { coordinates } = useRunStore.getState();
            const thinned = thinRoutePointsForDisplay(coordinates, 30)
              .slice(-50)
              .map((c) => ({ lat: c.latitude, lng: c.longitude }));
            void sendLiveLocation(token, {
              latitude: coordSnapshot.latitude,
              longitude: coordSnapshot.longitude,
              accuracy: coordSnapshot.accuracy,
              routePoints: thinned.length > 1 ? thinned : null,
            }).catch(() => {});
          }
        }
      }

      try {
        const Notifications = await getNotifications();
        if (!Notifications) {
          return;
        }
        const { status } = await Notifications.getPermissionsAsync();
        if (status === "granted") {
          const milestones = consumeProgressMilestones();
          for (const meters of milestones) {
            const km = meters >= 1000 ? (meters / 1000).toFixed(1) : null;
            const title = km ? `${km} km reached` : `${Math.round(meters)} m reached`;
            const body = "Keep going — you're doing great.";
            const content: any = { title, body, sound: "default", data: { type: "run_progress" } };
            if (Platform.OS === "android") {
              content.channelId = NOTIFICATION_CHANNELS.system;
            }
            await Notifications.scheduleNotificationAsync({ content, trigger: null });
          }
        }
      } catch {
        // ignore notification failures
      }
    }
  }
});

export async function startLocationTracking() {
  try {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== "granted") {
      console.warn("Permission to access location in foreground was denied");
      return;
    }

    const bgStatusBefore = await Location.getBackgroundPermissionsAsync();
    if (bgStatusBefore.status !== "granted") {
      const userProceeds = await new Promise<boolean>((resolve) => {
        Alert.alert(
          "Location Disclosure",
          "PHP Performance collects location data to enable run tracking, distance calculation, and pace monitoring even when the app is closed or not in use.\n\nThis data is only collected during an active run session that you start manually.",
          [
            { text: "Deny", style: "cancel", onPress: () => resolve(false) },
            { text: "Accept & Continue", onPress: () => resolve(true) },
          ],
        );
      });

      if (!userProceeds) {
        console.warn("User cancelled background permission request");
        return;
      }
    }

    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== "granted") {
      console.warn("Permission to access background location was denied");
      return;
    }

    const alreadyRunning = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    if (alreadyRunning) {
      return;
    }

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      activityType: Location.ActivityType.Fitness,
      distanceInterval: 5,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "PH Performance · Running",
        notificationBody: "Tracking your distance and pace",
        notificationColor: NOTIF_COLOR,
      },
    });
  } catch (e) {
    console.warn("startLocationTracking failed", e);
  }
}

export async function stopLocationTracking() {
  try {
    const hasTask = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    if (hasTask) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
  } catch (e) {
    console.warn("stopLocationTracking", e);
  }
}
