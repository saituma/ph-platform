import { useCallback, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { useRunStore } from "../../store/useRunStore";
import { haversineDistance } from "../../lib/haversine";
import { getNotifications } from "@/lib/notifications";
import { sendRunProgressNotification } from "@/lib/runProgressNotifications";
import { announceKilometerSplit, announceAutoPause } from "@/lib/tracking/audioCues";
import { Region } from "react-native-maps";
import { withSpring } from "react-native-reanimated";
import { SharedValue } from "react-native-reanimated";
import { BACKGROUND_LOCATION_TASK } from "../../lib/backgroundTask";

// Module-level cache — survives re-mounts within the same JS session.
// Avoids showing "Acquiring GPS" on every navigation to the active-run screen.
let _fgPermissionGranted = false;
let _lastKnownRegion: Region | null = null;

export type RouteMetrics = {
  durationSec: number;
  distanceM: number;
};

export type UseRunTrackingEngineOpts = {
  osrmRoutingEnabled: boolean;
  autoPauseEnabled: boolean;
  audioCuesEnabled: boolean;
};

export function useRunTrackingEngine(
  toastTranslateY: SharedValue<number>,
  insetsTop: number,
  opts?: UseRunTrackingEngineOpts,
) {
  const osrmRoutingEnabled = opts?.osrmRoutingEnabled ?? true;
  const autoPauseEnabled = opts?.autoPauseEnabled ?? true;
  const audioCuesEnabled = opts?.audioCuesEnabled ?? true;

  // Per-tick state (liveCoordinate, distanceMeters, etc.) is read imperatively via
  // useRunStore.getState() in callbacks — so the engine does NOT re-render on every GPS tick.
  // Action references are stable in zustand. Only `destination` is selector-subscribed because
  // changes there must trigger a route re-fetch, and it changes rarely (user tap only).
  const destination = useRunStore((s) => s.destination);
  const tick = useRunStore.getState().tick;
  const addCoordinate = useRunStore.getState().addCoordinate;

  const [hasGps, setHasGps] = useState(() => _fgPermissionGranted);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [followUser, setFollowUser] = useState(true);
  const [initialRegion, setInitialRegion] = useState<Region | null>(() => _lastKnownRegion);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [routePolyline, setRoutePolyline] = useState<{ latitude: number; longitude: number }[] | null>(null);
  const [routeMetrics, setRouteMetrics] = useState<RouteMetrics | null>(null);
  const [isFetchingRoute, setIsFetchingRoute] = useState(false);
  const isFetchingRouteRef = useRef(false);

  // Poll for warmup status instead of triggering standard react state updates on every frame
  const [isWarmedUp, setIsWarmedUp] = useState(false);

  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const notificationsRef = useRef<any | null>(null);
  const lastRouteFetchTime = useRef<number>(0);
  const lastSpeedRef = useRef<number>(0);
  // When the user pans/zooms the map, suppress auto-pause/resume for a few seconds.
  // Otherwise the auto-pause logic fires while the user is exploring the map (stationary).
  const lastMapInteractionRef = useRef<number>(0);
  const recordMapInteraction = useCallback(() => {
    lastMapInteractionRef.current = Date.now();
  }, []);

  // Refs so the 1-second interval always sees the latest toggle values without re-creating the timer.
  const autoPauseEnabledRef = useRef(autoPauseEnabled);
  const audioCuesEnabledRef = useRef(audioCuesEnabled);
  const osrmRoutingEnabledRef = useRef(osrmRoutingEnabled);
  const routePolylineRef = useRef<{ latitude: number; longitude: number }[] | null>(null);
  useEffect(() => { autoPauseEnabledRef.current = autoPauseEnabled; }, [autoPauseEnabled]);
  useEffect(() => { audioCuesEnabledRef.current = audioCuesEnabled; }, [audioCuesEnabled]);
  useEffect(() => { osrmRoutingEnabledRef.current = osrmRoutingEnabled; }, [osrmRoutingEnabled]);
  useEffect(() => { routePolylineRef.current = routePolyline; }, [routePolyline]);

  const stopForegroundWatch = useCallback(() => {
    watchRef.current?.remove();
    watchRef.current = null;
  }, []);

  const startForegroundWatch = useCallback(async () => {
    stopForegroundWatch();
    try {
      // Use non-prompting check — permission was already granted in setupLocationAndPermissions.
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        return;
      }
      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
        },
        (loc) => {
          const lat = loc?.coords?.latitude;
          const lng = loc?.coords?.longitude;
          if (typeof lat !== "number" || typeof lng !== "number" || !isFinite(lat) || !isFinite(lng)) {
            return;
          }
          useRunStore.getState().setLiveCoordinate({ latitude: lat, longitude: lng });
          _lastKnownRegion = { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 };
          addCoordinate(
            {
              latitude: lat,
              longitude: lng,
              timestamp: loc.timestamp,
              altitude: loc.coords?.altitude ?? undefined,
            },
            loc.coords?.accuracy ?? null,
          );
          const speed = loc.coords?.speed;
          if (typeof speed === "number" && Number.isFinite(speed)) {
            lastSpeedRef.current = Math.max(0, speed);
          }
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

    // Seed cached liveCoordinate into the store on first mount so the map can render without waiting.
    if (_lastKnownRegion && !useRunStore.getState().liveCoordinate) {
      useRunStore.getState().setLiveCoordinate({
        latitude: _lastKnownRegion.latitude,
        longitude: _lastKnownRegion.longitude,
      });
    }

    // If permission was already granted this JS session, skip the async check entirely.
    if (_fgPermissionGranted) {
      setHasGps(true);
      startForegroundWatch();
      return;
    }

    try {
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== "granted") {
        setGpsError("Location permission is required to track your run.");
        setHasGps(false);
        return;
      }

      _fgPermissionGranted = true;
      setHasGps(true);

      // Seed map with last cached fix while GPS warms up.
      Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 }).then((last) => {
        const lat = last?.coords?.latitude;
        const lng = last?.coords?.longitude;
        if (typeof lat === "number" && typeof lng === "number" && isFinite(lat) && isFinite(lng)) {
          const region = { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 };
          _lastKnownRegion = region;
          setInitialRegion((prev) => prev ?? region);
          if (!useRunStore.getState().liveCoordinate) {
            useRunStore.getState().setLiveCoordinate({ latitude: lat, longitude: lng });
          }
        }
      });

      startForegroundWatch();
    } catch {
      setGpsError("Couldn't access GPS. Please try again.");
      setHasGps(false);
    }
  }, [startForegroundWatch]);

  const fetchRoute = useCallback(async (startLat: number, startLng: number, destLat: number, destLng: number, force = false) => {
    const now = Date.now();
    if (!force && (now - lastRouteFetchTime.current < 30000 || isFetchingRouteRef.current)) return;
    if (isFetchingRouteRef.current) return;

    isFetchingRouteRef.current = true;
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
      isFetchingRouteRef.current = false;
      setIsFetchingRoute(false);
    }
  }, [osrmRoutingEnabled]);

  useEffect(() => {
    setupLocationAndPermissions();

    const AUTO_PAUSE_SPEED_THRESHOLD = 0.3; // m/s (~1.1 km/h) — only true stillness
    const AUTO_PAUSE_DELAY_MS = 8000;        // require 8s of continuous stillness
    const AUTO_PAUSE_GRACE_MS = 25000;       // 25s grace after manual resume
    const AUTO_RESUME_SPEED_THRESHOLD = 2.0; // m/s (~7.2 km/h) — clear sustained motion

    const timer = setInterval(() => {
      const store = useRunStore.getState();
      tick();

      // --- Auto-pause logic ---
      // Skip auto-pause/resume entirely if the user touched the map within the last 6s.
      // This prevents the spurious "auto-paused" while the user is exploring the map.
      const recentMapInteraction =
        Date.now() - lastMapInteractionRef.current < 6000;

      if (
        autoPauseEnabledRef.current &&
        store.status === "running" &&
        store.getIsWarmedUp() &&
        !recentMapInteraction
      ) {
        const now = Date.now();
        // Grace window after manual resume — gives the user time to actually start moving.
        const inGracePeriod = store.lastManualResumeAt != null && (now - store.lastManualResumeAt) < AUTO_PAUSE_GRACE_MS;
        if (!inGracePeriod) {
          const speed = lastSpeedRef.current;
          if (speed < AUTO_PAUSE_SPEED_THRESHOLD) {
            if (!store.autoPauseStillSince) {
              store.setAutoPauseStillSince(now);
            } else if (now - store.autoPauseStillSince >= AUTO_PAUSE_DELAY_MS) {
              store.pauseRun();
              store.setAutoPaused(true);
              if (audioCuesEnabledRef.current) announceAutoPause(true);
              triggerGoalFeedback("Auto-paused", "Stopped moving — run paused");
            }
          } else {
            store.setAutoPauseStillSince(null);
          }
        }
      }
      // Auto-resume when moving again — also blocked while the map is being interacted with.
      if (
        autoPauseEnabledRef.current &&
        store.isAutoPaused &&
        store.status === "paused" &&
        !recentMapInteraction
      ) {
        if (lastSpeedRef.current >= AUTO_RESUME_SPEED_THRESHOLD) {
          store.resumeRun();
          store.setAutoPaused(false);
          store.setAutoPauseStillSince(null);
          if (audioCuesEnabledRef.current) announceAutoPause(false);
          triggerGoalFeedback("Resumed", "Movement detected — run resumed");
        }
      }

      // --- Audio cues: km split announcements ---
      if (audioCuesEnabledRef.current) {
        const km = store.consumeKmAnnouncement();
        if (km) {
          announceKilometerSplit({
            km,
            totalDistanceMeters: store.distanceMeters,
            elapsedSeconds: store.elapsedSeconds,
          });
        }
      }

      // --- Goal / destination proximity / auto-reroute (was a useEffect) ---
      const ds = useRunStore.getState();
      const destinationThresholdMeters = 40;
      if (ds.goalKm && !ds.goalReached && ds.distanceMeters >= ds.goalKm * 1000) {
        ds.markGoalReached();
        triggerGoalFeedback("Goal reached", "Goal reached!");
      }
      if (ds.destination && !ds.destinationReached && ds.liveCoordinate) {
        const dist = haversineDistance(
          ds.liveCoordinate.latitude,
          ds.liveCoordinate.longitude,
          ds.destination.latitude,
          ds.destination.longitude,
        );
        if (dist <= destinationThresholdMeters) {
          ds.markDestinationReached();
          triggerGoalFeedback("Destination reached", "Destination reached!");
        }
        // Auto-reroute when user deviates (only when OSRM preference is on)
        if (osrmRoutingEnabledRef.current && routePolylineRef.current && routePolylineRef.current.length > 0 && !isFetchingRouteRef.current) {
          const nowReroute = Date.now();
          let minDistance = Infinity;
          for (const pt of routePolylineRef.current) {
            const d = haversineDistance(ds.liveCoordinate.latitude, ds.liveCoordinate.longitude, pt.latitude, pt.longitude);
            if (d < minDistance) minDistance = d;
          }
          if (minDistance > 200 && (nowReroute - lastRouteFetchTime.current >= 30000)) {
            fetchRoute(ds.liveCoordinate.latitude, ds.liveCoordinate.longitude, ds.destination.latitude, ds.destination.longitude);
          }
        }
      }

      // --- Progress milestone notifications ---
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
      setIsWarmedUp(useRunStore.getState().getIsWarmedUp());
    }, 1000);

    getNotifications().then((n) => (notificationsRef.current = n));

    return () => {
      clearInterval(timer);
      stopForegroundWatch();
      Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => {});
    };
  }, [setupLocationAndPermissions, stopForegroundWatch, tick]);

  useEffect(() => {
    if (!destination) {
      setRoutePolyline(null);
      setRouteMetrics(null);
      return;
    }
    // New destination tapped — reset throttle and fetch immediately
    lastRouteFetchTime.current = 0;
    const coord = useRunStore.getState().liveCoordinate;
    if (coord) {
      void fetchRoute(coord.latitude, coord.longitude, destination.latitude, destination.longitude, true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination]);

  useEffect(() => {
    // When OSRM is disabled, only clear rerouting — existing drawn route stays
    if (!osrmRoutingEnabled && !destination) {
      setRoutePolyline(null);
      setRouteMetrics(null);
    }
  }, [osrmRoutingEnabled, destination]);

  return {
    hasGps,
    gpsError,
    followUser,
    setFollowUser,
    initialRegion,
    toastMessage,
    startForegroundWatch,
    stopForegroundWatch,
    setupLocationAndPermissions,
    routePolyline,
    routeMetrics,
    isFetchingRoute,
    isWarmedUp,
    recordMapInteraction,
  };
}
