import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { useRunStore } from "../../store/useRunStore";
import { haversineDistance } from "../../lib/haversine";
import { getNotifications } from "@/lib/notifications";
import { Region } from "react-native-maps";
import { withSpring } from "react-native-reanimated";
import { SharedValue } from "react-native-reanimated";

export function useRunTrackingEngine(
  toastTranslateY: SharedValue<number>,
  insetsTop: number,
) {
  const {
    status,
    tick,
    addCoordinate,
    distanceMeters,
    goalKm,
    destination,
    goalReached,
    destinationReached,
    markGoalReached,
    markDestinationReached,
    startRun,
    stopRun,
    getIsWarmedUp,
  } = useRunStore();

  const [hasGps, setHasGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [followUser, setFollowUser] = useState(true);
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  /** Latest GPS fix (unfiltered) for map position; trail in the store is jitter-filtered. */
  const [liveCoordinate, setLiveCoordinate] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [routePolyline, setRoutePolyline] = useState<{ latitude: number; longitude: number }[] | null>(null);
  const [isFetchingRoute, setIsFetchingRoute] = useState(false);

  // Poll for warmup status instead of triggering standard react state updates on every frame
  const [isWarmedUp, setIsWarmedUp] = useState(false);

  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const notificationsRef = useRef<any | null>(null);
  const lastRouteFetchTime = useRef<number>(0);

  const stopForegroundWatch = useCallback(() => {
    watchRef.current?.remove();
    watchRef.current = null;
  }, []);

  const startForegroundWatch = useCallback(async () => {
    stopForegroundWatch();
    watchRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 8,
        timeInterval: 1000,
      },
      (loc) => {
        const { latitude, longitude } = loc.coords;
        setLiveCoordinate({ latitude, longitude });
        addCoordinate({
          latitude,
          longitude,
          timestamp: loc.timestamp,
          altitude: loc.coords.altitude || undefined,
        }, loc.coords.accuracy);
      },
    );
  }, [addCoordinate, stopForegroundWatch]);

  const triggerGoalFeedback = useCallback(
    async (title: string, body: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setToastMessage(body);
      toastTranslateY.value = withSpring(insetsTop + 12, {
        damping: 15,
        stiffness: 220,
      });
      setTimeout(() => {
        toastTranslateY.value = withSpring(-120, {
          damping: 15,
          stiffness: 220,
        });
        setTimeout(() => setToastMessage(null), 300);
      }, 2500);

      try {
        const Notifications =
          notificationsRef.current ?? (await getNotifications());
        if (!Notifications) return;

        let { status: notifStatus } = await Notifications.getPermissionsAsync();
        if (notifStatus !== "granted") {
          const req = await Notifications.requestPermissionsAsync();
          notifStatus = req.status;
        }
        if (notifStatus === "granted") {
          await Notifications.scheduleNotificationAsync({
            content: { title, body },
            trigger: null,
          });
        }
      } catch {
        // ignore notification errors
      }
    },
    [insetsTop, toastTranslateY],
  );

  const setupLocationAndPermissions = useCallback(async () => {
    setGpsError(null);
    try {
      const { status: fgStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== "granted") {
        setGpsError("Location permission is required to track your run.");
        setHasGps(false);
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = current.coords;
      setInitialRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setLiveCoordinate({ latitude, longitude });

      setHasGps(true);
    } catch {
      setGpsError("Couldn't access GPS. Please try again.");
      setHasGps(false);
    }
  }, []);

  const fetchRoute = useCallback(async (startLat: number, startLng: number, destLat: number, destLng: number) => {
    const now = Date.now();
    if (now - lastRouteFetchTime.current < 30000 || isFetchingRoute) return;

    setIsFetchingRoute(true);
    lastRouteFetchTime.current = now;

    try {
      const url = `https://router.project-osrm.org/route/v1/foot/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const lineString = data.routes[0].geometry.coordinates;
        setRoutePolyline(lineString.map((c: [number, number]) => ({ latitude: c[1], longitude: c[0] })));
      }
    } catch (e) {
      console.warn("OSRM route fetch failed", e);
      setRoutePolyline(null);
    } finally {
      setIsFetchingRoute(false);
    }
  }, [isFetchingRoute]);

  useEffect(() => {
    if (useRunStore.getState().status === "idle") {
      startRun();
    }
    setupLocationAndPermissions();

    const timer = setInterval(() => {
      tick();
      // Also poll warmup state to trigger UI changes without rerendering the whole tree on every coordinate
      setIsWarmedUp(useRunStore.getState().getIsWarmedUp());
    }, 1000);

    getNotifications().then((n) => (notificationsRef.current = n));

    return () => {
      clearInterval(timer);
      stopForegroundWatch();
    };
  }, [setupLocationAndPermissions, startRun, stopForegroundWatch, tick]);

  useEffect(() => {
    const destinationThresholdMeters = 40;
    if (goalKm && !goalReached && distanceMeters >= goalKm * 1000) {
      markGoalReached();
      triggerGoalFeedback("Goal reached", "Goal reached!");
    }
    if (destination && !destinationReached && liveCoordinate) {
      const dist = haversineDistance(
        liveCoordinate.latitude,
        liveCoordinate.longitude,
        destination.latitude,
        destination.longitude,
      );
      if (dist <= destinationThresholdMeters) {
        markDestinationReached();
        triggerGoalFeedback("Destination reached", "Destination reached!");
      }

      const now = Date.now();
      if (routePolyline && routePolyline.length > 0 && !isFetchingRoute) {
        let minDistance = Infinity;
        for (const pt of routePolyline) {
          const d = haversineDistance(liveCoordinate.latitude, liveCoordinate.longitude, pt.latitude, pt.longitude);
          if (d < minDistance) minDistance = d;
        }
        if (minDistance > 200 && (now - lastRouteFetchTime.current >= 30000)) {
          fetchRoute(liveCoordinate.latitude, liveCoordinate.longitude, destination.latitude, destination.longitude);
        }
      } else if (!routePolyline && !isFetchingRoute && (now - lastRouteFetchTime.current >= 30000)) {
        fetchRoute(liveCoordinate.latitude, liveCoordinate.longitude, destination.latitude, destination.longitude);
      }
    }
  }, [
    goalKm,
    goalReached,
    distanceMeters,
    destination,
    destinationReached,
    liveCoordinate,
    markGoalReached,
    markDestinationReached,
    triggerGoalFeedback,
    fetchRoute,
    routePolyline,
    isFetchingRoute
  ]);

  const lastCoordinate = liveCoordinate;

  const activeRegion: Region | null = useMemo(() => {
    if (liveCoordinate) {
      return {
        latitude: liveCoordinate.latitude,
        longitude: liveCoordinate.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    return initialRegion;
  }, [initialRegion, liveCoordinate]);

  return {
    hasGps,
    gpsError,
    followUser,
    setFollowUser,
    activeRegion,
    toastMessage,
    startForegroundWatch,
    stopForegroundWatch,
    setupLocationAndPermissions,
    lastCoordinate,
    routePolyline,
    isFetchingRoute,
    isWarmedUp,
  };
}
