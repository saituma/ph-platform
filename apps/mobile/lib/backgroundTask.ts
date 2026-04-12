import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import { useRunStore } from "../store/useRunStore";
import { Alert } from "react-native";

export const BACKGROUND_LOCATION_TASK = "BACKGROUND_LOCATION_TASK";

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error("Background Location Error", error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const addCoordinate = useRunStore.getState().addCoordinate;
    
    locations.forEach((loc) => {
      addCoordinate({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        timestamp: loc.timestamp,
      });
    });
  }
});

export async function startLocationTracking() {
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== "granted") {
    console.warn("Permission to access location in foreground was denied");
    return;
  }

  const bgStatusBefore = await Location.getBackgroundPermissionsAsync();
  if (bgStatusBefore.status !== "granted") {
    const userProceeds = await new Promise<boolean>((resolve) => {
      Alert.alert(
        "Background Location Usage",
        "PHP Performance collects location data to track your run distance and pace even when the app is closed or not in use.",
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          { text: "Continue", onPress: () => resolve(true) }
        ]
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

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    activityType: Location.ActivityType.Fitness,
    distanceInterval: 5,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "Run Tracking Active",
      notificationBody: "Tracking your distance and pace.",
      notificationColor: "#00FF87",
    },
  });
}

export async function stopLocationTracking() {
  const hasTask = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  if (hasTask) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
}
