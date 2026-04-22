import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { useRunStore } from "../../store/useRunStore";
import { haversineDistance } from "../../lib/haversine";
import { getNotifications } from "@/lib/notifications";
import { sendRunProgressNotification } from "@/lib/runProgressNotifications";
import { Region } from "react-native-maps";
import { withSpring } from "react-native-reanimated";
import { SharedValue } from "react-native-reanimated";
import { BACKGROUND_LOCATION_TASK } from "../../lib/backgroundTask";

export type RouteMetrics = {
  durationSec: number;
  distanceM: number;
};

export type UseRunTrackingEngineOpts = {
  osrmRoutingEnabled: boolean;
};

export function useRunTrackingEngine(
  toastTranslateY: SharedValue<number>,
  insetsTop: number,
  opts?: UseRunTrackingEngineOpts,
) {
  // Default to enabled to preserve existing behavior for any legacy call sites.
  const osrmRoutingEnabled = opts?.osrmRoutingEnabled ?? true;

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
  const [routeMetrics, setRouteMetrics] = useState<RouteMetrics | null>(null);
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
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return;
      }
      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 8,
          timeInterval: 1000,
        },
        (loc) => {
          const lat = loc?.coords?.latitude;
          const lng = loc?.coords?.longitude;
          if (typeof lat !== "number" || typeof lng !== "number" || !isFinite(lat) || !isFinite(lng)) {
            return;
          }
          setLiveCoordinate({ latitude: lat, longitude: lng });
          addCoordinate(
            {
              latitude: lat,
              longitude: lng,
              timestamp: loc.timestamp,
              altitude: loc.coords?.altitude ?? undefined,
            },
            loc.coords?.accuracy ?? null,
          );
        },
      );
    } catch (e) {
      console.warn("startForegroundWatch failed", e);
    }
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
      const lat = current?.coords?.latitude;
      const lng = current?.coords?.longitude;
      if (typeof lat !== "number" || typeof lng !== "number" || !isFinite(lat) || !isFinite(lng)) {
        setGpsError("Couldn't read a valid GPS position. Please try again.");
        setHasGps(false);
        return;
      }
      setInitialRegion({
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setLiveCoordinate({ latitude: lat, longitude: lng });

      setHasGps(true);
    } catch {
      setGpsError("Couldn't access GPS. Please try again.");
      setHasGps(false);
    }
  }, []);

  const fetchRoute = useCallback(async (startLat: number, startLng: number, destLat: number, destLng: number) => {
    if (!osrmRoutingEnabled) return;

    const now = Date.now();
    if (now - lastRouteFetchTime.current < 30000 || isFetchingRoute) return;

    setIsFetchingRoute(true);
    lastRouteFetchTime.current = now;

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const r = data.routes[0];
        const lineString = r.geometry.coordinates;
        setRoutePolyline(lineString.map((c: [number, number]) => ({ latitude: c[1], longitude: c[0] })));
        setRouteMetrics({
          durationSec: typeof r.duration === "number" ? r.duration : 0,
          distanceM: typeof r.distance === "number" ? r.distance : 0,
        });
      } else {
        setRoutePolyline(null);
        setRouteMetrics(null);
      }
    } catch (e) {
      console.warn("OSRM route fetch failed", e);
      setRoutePolyline(null);
      setRouteMetrics(null);
    } finally {
      setIsFetchingRoute(false);
    }
  }, [isFetchingRoute, osrmRoutingEnabled]);

  useEffect(() => {
    if (useRunStore.getState().status === "idle") {
      startRun();
    }
    setupLocationAndPermissions();

    const timer = setInterval(() => {
      tick();
      const milestones = useRunStore.getState().consumeProgressMilestones();
      if (milestones.length) {
        for (const meters of milestones) {
          const km = meters >= 1000 ? (meters / 1000).toFixed(1) : null;
          void sendRunProgressNotification({
            title: km ? `Distance: ${km} km` : `Distance: ${Math.round(meters)} m`,
            body: "Keep going.",
          });
        }
      }
      // Also poll warmup state to trigger UI changes without rerendering the whole tree on every coordinate
      setIsWarmedUp(useRunStore.getState().getIsWarmedUp());
    }, 1000);

    getNotifications().then((n) => (notificationsRef.current = n));

    return () => {
      clearInterval(timer);
      stopForegroundWatch();
      Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => {});
    };
  }, [setupLocationAndPermissions, startRun, stopForegroundWatch, tick]);

  useEffect(() => {
    if (!destination) {
      setRoutePolyline(null);
      setRouteMetrics(null);
    }
  }, [destination]);

  useEffect(() => {
    if (!osrmRoutingEnabled) {
      setRoutePolyline(null);
      setRouteMetrics(null);
    }
  }, [osrmRoutingEnabled]);

  useEffect(() => {
    if (!osrmRoutingEnabled) return;

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
    isFetchingRoute,
    osrmRoutingEnabled,
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
    routeMetrics,
    isFetchingRoute,
    isWarmedUp,
  };
}
