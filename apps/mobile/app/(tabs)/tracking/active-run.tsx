import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform, SafeAreaView, Text, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import {
  startLocationTracking,
  stopLocationTracking,
} from "../../../lib/backgroundTask";
import { useRunStore } from "../../../store/useRunStore";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { fonts, radius, icons as themeIcons } from "@/constants/theme";
import MapView, { Marker, Polyline, Region } from "react-native-maps";
import { PulsingDot } from "../../../components/tracking/PulsingDot";
import MapNightStyle from "../../../constants/mapNightStyle.json";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import {
  formatDistanceKm,
  formatDurationClock,
} from "../../../lib/tracking/runUtils";
import { OsmMapView } from "../../../components/tracking/OsmMapView";
import { haversineDistance } from "../../../lib/haversine";
import { getNotifications } from "@/lib/notifications";

export default function ActiveRunScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const {
    status,
    startRun,
    pauseRun,
    resumeRun,
    stopRun,
    tick,
    addCoordinate,
    elapsedSeconds,
    distanceMeters,
    coordinates,
    goalKm,
    destination,
    goalReached,
    destinationReached,
    markGoalReached,
    markDestinationReached,
  } = useRunStore();

  const [hasGps, setHasGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [followUser, setFollowUser] = useState(true);
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  const [showStopSheet, setShowStopSheet] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);

  const sheetTranslateY = useSharedValue(800);
  const toastTranslateY = useSharedValue(-120);
  const mapRef = useRef<MapView | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const notificationsRef = useRef<any | null>(null);
  const useOsmMap = Platform.OS === "android";
  const bottomBarHeight = 88;
  const overlayGap = 16;
  const glassBg = isDark ? "rgba(20,20,20,0.55)" : "rgba(255,255,255,0.72)";
  const glassBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  const glassShadow = isDark
    ? {
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
      }
    : {
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 8,
      };

  const stopForegroundWatch = useCallback(() => {
    watchRef.current?.remove();
    watchRef.current = null;
  }, []);

  const startForegroundWatch = useCallback(async () => {
    stopForegroundWatch();
    watchRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 5,
        timeInterval: 1000,
      },
      (loc) => {
        addCoordinate({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: loc.timestamp,
        });
      },
    );
  }, [addCoordinate, stopForegroundWatch]);

  useEffect(() => {
    // Screen entry animation
    opacity.value = withTiming(1, { duration: 350 });
    translateY.value = withSpring(0, { damping: 18, stiffness: 200 });

    if (useRunStore.getState().status === "idle") {
      startRun();
    }
    setupLocationAndPermissions();

    // Timer interval
    const timer = setInterval(() => {
      tick();
    }, 1000);

    return () => {
      clearInterval(timer);
      stopForegroundWatch();
      stopLocationTracking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Preload notifications API (Expo Go-safe via getNotifications).
    getNotifications()
      .then((Notifications) => {
        notificationsRef.current = Notifications;
      })
      .catch(() => {
        notificationsRef.current = null;
      });
  }, []);

  const setupLocationAndPermissions = async () => {
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
      setInitialRegion({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      setHasGps(true);
      await startLocationTracking();
    } catch {
      setGpsError("Couldn't access GPS. Please try again.");
      setHasGps(false);
    }
  };

  useEffect(() => {
    if (!hasGps) return;

    if (status === "running") {
      startForegroundWatch().catch(() => null);
      startLocationTracking().catch(() => null);
      return;
    }

    stopForegroundWatch();
    stopLocationTracking().catch(() => null);
  }, [hasGps, startForegroundWatch, status, stopForegroundWatch]);

  const openStopDialog = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    pauseRun();
    setShowStopSheet(true);
    sheetTranslateY.value = withSpring(0, { damping: 20, stiffness: 200 });
  };

  const closeStopDialogAndResume = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    sheetTranslateY.value = withSpring(800, { damping: 20, stiffness: 200 });
    setTimeout(() => {
      setShowStopSheet(false);
      resumeRun();
    }, 300);
  };

  const handleFinishRun = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    stopRun();
    setShowStopSheet(false);
    router.replace("/(tabs)/tracking/summary" as any);
  };

  const lastCoordinate =
    coordinates.length > 0 ? coordinates[coordinates.length - 1] : null;
  const activeRegion: Region | null = useMemo(() => {
    if (lastCoordinate) {
      return {
        latitude: lastCoordinate.latitude,
        longitude: lastCoordinate.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    return initialRegion;
  }, [initialRegion, lastCoordinate]);

  useEffect(() => {
    if (!followUser) return;
    if (!activeRegion) return;
    mapRef.current?.animateToRegion(activeRegion, 450);
  }, [activeRegion, followUser]);

  const screenStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
    flex: 1,
    backgroundColor: colors.bg,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const toastStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toastTranslateY.value }],
  }));

  const triggerGoalFeedback = useCallback(
    async (title: string, body: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setToastMessage(body);
      toastTranslateY.value = withSpring(insets.top + 12, {
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

        let { status } = await Notifications.getPermissionsAsync();
        if (status !== "granted") {
          const req = await Notifications.requestPermissionsAsync();
          status = req.status;
        }
        if (status === "granted") {
          await Notifications.scheduleNotificationAsync({
            content: { title, body },
            trigger: null,
          });
        }
      } catch {
        // ignore notification errors
      }
    },
    [insets.top, toastTranslateY],
  );

  useEffect(() => {
    const destinationThresholdMeters = 40;
    if (goalKm && !goalReached && distanceMeters >= goalKm * 1000) {
      markGoalReached();
      triggerGoalFeedback("Goal reached", "Goal reached!");
    }
    if (destination && !destinationReached && lastCoordinate) {
      const dist = haversineDistance(
        lastCoordinate.latitude,
        lastCoordinate.longitude,
        destination.latitude,
        destination.longitude,
      );
      if (dist <= destinationThresholdMeters) {
        markDestinationReached();
        triggerGoalFeedback("Destination reached", "Destination reached!");
      }
    }
  }, [
    goalKm,
    goalReached,
    distanceMeters,
    destination,
    destinationReached,
    lastCoordinate,
    markGoalReached,
    markDestinationReached,
    triggerGoalFeedback,
  ]);

  if (!hasGps) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons
          name={themeIcons.gpsSearching.name as any}
          size={48}
          color={colors.warning}
          style={{ marginBottom: 16 }}
        />
        <Text
          style={{
            fontFamily: fonts.heading2,
            fontSize: 20,
            color: colors.textSecondary,
          }}
        >
          {gpsError ?? "Acquiring GPS..."}
        </Text>
        {gpsError ? (
          <Pressable
            onPress={() => setupLocationAndPermissions()}
            style={{
              marginTop: 16,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: radius.pill,
              backgroundColor: colors.surfaceHigh,
              borderWidth: 1,
              borderColor: colors.borderSubtle,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.bodyMedium,
                color: colors.textPrimary,
              }}
            >
              Try again
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Animated.View style={screenStyle}>
        {/* Full screen map */}
        <View
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <View style={{ flex: 1 }}>
            {activeRegion ? (
              useOsmMap ? (
                <OsmMapView
                  coordinates={coordinates}
                  routeColor={colors.mapRoute}
                  startColor={colors.lime}
                  endColor={colors.cyan}
                  backgroundColor={colors.surfaceHigh}
                  isDark={isDark}
                  destination={destination}
                />
              ) : (
                <MapView
                  ref={(ref) => {
                    mapRef.current = ref;
                  }}
                  style={{ flex: 1 }}
                  initialRegion={activeRegion}
                  customMapStyle={isDark ? (MapNightStyle as any) : ([] as any)}
                  provider={Platform.OS === "android" ? "google" : undefined}
                  mapType={Platform.OS === "ios" ? "mutedStandard" : "standard"}
                  userInterfaceStyle={isDark ? "dark" : "light"}
                  showsUserLocation={true}
                  showsMyLocationButton={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                  onTouchStart={() => setFollowUser(false)}
                >
                  {coordinates.length > 1 ? (
                    <Polyline
                      coordinates={coordinates.map((c) => ({
                        latitude: c.latitude,
                        longitude: c.longitude,
                      }))}
                      strokeColor={colors.mapRoute}
                      strokeWidth={4}
                    />
                  ) : null}

                  {coordinates.length > 0 ? (
                    <>
                      <Marker
                        coordinate={coordinates[0]}
                        anchor={{ x: 0.5, y: 0.5 }}
                      >
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: radius.pill,
                            backgroundColor: colors.lime,
                            borderWidth: 2,
                            borderColor: colors.bg,
                          }}
                        />
                      </Marker>
                      {lastCoordinate ? (
                        <Marker
                          coordinate={{
                            latitude: lastCoordinate.latitude,
                            longitude: lastCoordinate.longitude,
                          }}
                          anchor={{ x: 0.5, y: 0.5 }}
                        >
                          <PulsingDot size={8} color={colors.cyan} />
                        </Marker>
                      ) : null}
                    </>
                  ) : null}
                  {destination ? (
                    <Marker coordinate={destination} anchor={{ x: 0.5, y: 1 }}>
                      <Ionicons name="flag" size={24} color={colors.coral} />
                    </Marker>
                  ) : null}
                </MapView>
              )
            ) : (
              <View style={{ flex: 1, backgroundColor: colors.surfaceHigh }} />
            )}

            {/* Tone map to match app palette (especially when map can't be styled). */}
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: colors.bg,
                opacity: isDark ? 0.14 : 0.04,
              }}
            />

            {coordinates.length < 2 ? (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: 12,
                  top: 12,
                  right: 72,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 16,
                  backgroundColor: colors.surfaceHigh,
                  borderWidth: 1,
                  borderColor: colors.borderSubtle,
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.bodyMedium,
                    color: colors.textPrimary,
                  }}
                >
                  Waiting for GPS lock…
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.bodyRegular,
                    color: colors.textSecondary,
                    marginTop: 2,
                  }}
                >
                  Start moving to see your route.
                </Text>
              </View>
            ) : null}

            {/* Map overlay controls */}
            {!useOsmMap ? (
              <View
                style={{ position: "absolute", top: 12, right: 12, gap: 8 }}
              >
                <Pressable
                  onPress={() => {
                    setFollowUser(true);
                    if (activeRegion) {
                      mapRef.current?.animateToRegion(activeRegion, 350);
                    }
                  }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: colors.surfaceHigh,
                    borderWidth: 1,
                    borderColor: colors.borderSubtle,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: 0.92,
                  }}
                >
                  <Ionicons
                    name="locate"
                    size={18}
                    color={colors.textPrimary}
                  />
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>

        {/* Top-left status chip */}
        <View
          style={{
            position: "absolute",
            top: insets.top + 12,
            left: 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: glassBg,
              borderColor: glassBorder,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: radius.pill,
              borderWidth: 1,
              ...glassShadow,
            }}
          >
            <PulsingDot
              size={6}
              color={status === "paused" ? colors.coral : colors.lime}
            />
            <Text
              style={{
                fontFamily: fonts.labelCaps,
                fontSize: 10,
                color: status === "paused" ? colors.coral : colors.lime,
                letterSpacing: 2,
                marginLeft: 6,
              }}
            >
              {status === "paused" ? "PAUSED" : "RUNNING"}
            </Text>
            <View
              style={{
                width: 1,
                height: 12,
                marginHorizontal: 10,
                backgroundColor: colors.borderMid,
                opacity: 0.7,
              }}
            />
            <Ionicons name="navigate" size={12} color={colors.cyan} />
            <Text
              style={{
                fontFamily: fonts.labelCaps,
                fontSize: 10,
                color: colors.cyan,
                letterSpacing: 2,
                marginLeft: 6,
              }}
            >
              GPS
            </Text>
          </View>
          {goalKm || destination ? (
            <View style={{ marginTop: 8, gap: 6 }}>
              {goalKm ? (
                <View
                  style={{
                    alignSelf: "flex-start",
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: radius.pill,
                    backgroundColor: glassBg,
                    borderColor: glassBorder,
                    borderWidth: 1,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bodyMedium,
                      fontSize: 12,
                      color: colors.textPrimary,
                    }}
                  >
                    Goal: {goalKm.toFixed(1)} km
                  </Text>
                </View>
              ) : null}
              {destination ? (
                <View
                  style={{
                    alignSelf: "flex-start",
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: radius.pill,
                    backgroundColor: glassBg,
                    borderColor: glassBorder,
                    borderWidth: 1,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bodyMedium,
                      fontSize: 12,
                      color: colors.textPrimary,
                    }}
                  >
                    Destination set
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Overlay action buttons */}
        <View
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: insets.bottom + bottomBarHeight + overlayGap + 8,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              status === "paused" ? "Resume run" : "Pause run"
            }
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (status === "paused") {
                resumeRun();
                return;
              }
              pauseRun();
            }}
            style={({ pressed }) => ({
              height: 56,
              minWidth: 140,
              borderRadius: radius.pill,
              backgroundColor: status === "paused" ? colors.lime : glassBg,
              borderWidth: 1,
              borderColor:
                status === "paused" ? colors.borderLime : glassBorder,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 16,
              opacity: pressed ? 0.82 : 1,
              transform: [{ scale: pressed ? 0.985 : 1 }],
              ...glassShadow,
            })}
          >
            <Ionicons
              name={
                (status === "paused"
                  ? themeIcons.resume.name
                  : themeIcons.pause.name) as any
              }
              size={20}
              color={
                status === "paused" ? colors.textInverse : colors.textPrimary
              }
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                fontFamily: fonts.heading2,
                fontSize: 14,
                color:
                  status === "paused" ? colors.textInverse : colors.textPrimary,
                letterSpacing: 0.6,
              }}
            >
              {status === "paused" ? "RESUME" : "PAUSE"}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Stop run"
            onPress={openStopDialog}
            style={({ pressed }) => ({
              height: 56,
              minWidth: 120,
              borderRadius: radius.pill,
              backgroundColor: colors.coralGlow,
              borderWidth: 1,
              borderColor: colors.borderCoral,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 16,
              opacity: pressed ? 0.82 : 1,
              transform: [{ scale: pressed ? 0.985 : 1 }],
              ...glassShadow,
            })}
          >
            <Ionicons
              name={themeIcons.stop.name as any}
              size={20}
              color={colors.coral}
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                fontFamily: fonts.heading2,
                fontSize: 14,
                color: colors.coral,
                letterSpacing: 0.6,
              }}
            >
              STOP
            </Text>
          </Pressable>
        </View>

        {/* Bottom overlay bar */}
        <View
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: insets.bottom + 16,
            height: bottomBarHeight,
            backgroundColor: glassBg,
            borderColor: glassBorder,
            borderWidth: 1,
            borderRadius: radius.xl,
            paddingHorizontal: 20,
            paddingVertical: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            ...glassShadow,
          }}
        >
          <View>
            <Text
              style={{
                fontFamily: fonts.labelCaps,
                fontSize: 10,
                color: colors.textSecondary,
                letterSpacing: 2,
              }}
            >
              TIME
            </Text>
            <Text
              style={{
                fontFamily: fonts.statLabel,
                fontSize: 20,
                color: colors.textPrimary,
              }}
            >
              {formatDurationClock(elapsedSeconds)}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={{
                fontFamily: fonts.labelCaps,
                fontSize: 10,
                color: colors.textSecondary,
                letterSpacing: 2,
              }}
            >
              DISTANCE
            </Text>
            <Text
              style={{
                fontFamily: fonts.statLabel,
                fontSize: 20,
                color: colors.textPrimary,
              }}
            >
              {distanceMeters === 0 && elapsedSeconds < 2
                ? "--"
                : formatDistanceKm(distanceMeters, 2)}{" "}
              km
            </Text>
          </View>
        </View>

        {toastMessage ? (
          <Animated.View
            style={[
              toastStyle,
              {
                position: "absolute",
                top: 0,
                left: 16,
                right: 16,
                padding: 12,
                borderRadius: radius.xl,
                backgroundColor: colors.surfaceHigh,
                borderColor: colors.borderSubtle,
                borderWidth: 1,
                alignItems: "center",
                justifyContent: "center",
                zIndex: 200,
              },
            ]}
          >
            <Text
              style={{
                fontFamily: fonts.heading3,
                fontSize: 14,
                color: colors.textPrimary,
              }}
            >
              {toastMessage}
            </Text>
          </Animated.View>
        ) : null}

        {/* Stop confirmation bottom sheet */}
        {showStopSheet && (
          <>
            {/* Backdrop */}
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.6)",
                zIndex: 90,
              }}
            />

            {/* Sheet */}
            <Animated.View
              style={[
                sheetStyle,
                {
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: colors.surfaceHigh,
                  borderTopColor: colors.borderMid,
                  borderTopWidth: 1,
                  borderTopLeftRadius: 32,
                  borderTopRightRadius: 32,
                  paddingTop: 16,
                  paddingHorizontal: 24,
                  paddingBottom: 32 + insets.bottom,
                  zIndex: 100,
                },
              ]}
            >
              {/* Handle bar */}
              <View
                style={{
                  width: 36,
                  height: 4,
                  backgroundColor: colors.surfaceHigher,
                  borderRadius: radius.pill,
                  alignSelf: "center",
                  marginBottom: 24,
                }}
              />

              <View style={{ alignItems: "center", marginBottom: 24 }}>
                <Ionicons
                  name={themeIcons.stop.name as any}
                  size={36}
                  color={colors.coral}
                  style={{ marginBottom: 16 }}
                />
                <Text
                  style={{
                    fontFamily: fonts.heading1,
                    fontSize: 26,
                    color: colors.textPrimary,
                  }}
                >
                  End this run?
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: 12, marginBottom: 32 }}>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: colors.surface,
                    borderColor: colors.borderSubtle,
                    borderWidth: 1,
                    borderRadius: radius.xl,
                    padding: 16,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.statNumber,
                      fontSize: 28,
                      color: colors.textPrimary,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {formatDistanceKm(distanceMeters, 2)}
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.labelCaps,
                      fontSize: 11,
                      letterSpacing: 2,
                      color: colors.textSecondary,
                    }}
                  >
                    KM
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: colors.surface,
                    borderColor: colors.borderSubtle,
                    borderWidth: 1,
                    borderRadius: radius.xl,
                    padding: 16,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.statNumber,
                      fontSize: 28,
                      color: colors.textPrimary,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {formatDurationClock(elapsedSeconds)}
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.labelCaps,
                      fontSize: 11,
                      letterSpacing: 2,
                      color: colors.textSecondary,
                    }}
                  >
                    TIME
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={handleFinishRun}
                style={{
                  width: "100%",
                  height: 68,
                  backgroundColor: colors.coral,
                  borderRadius: radius.xxl,
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Ionicons
                  name={themeIcons.save.name as any}
                  size={24}
                  color={colors.textPrimary}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{
                    fontFamily: fonts.heading1,
                    fontSize: 18,
                    color: colors.textPrimary,
                  }}
                >
                  YES, FINISH
                </Text>
              </Pressable>

              <Pressable
                onPress={closeStopDialogAndResume}
                style={{
                  width: "100%",
                  height: 56,
                  backgroundColor: "transparent",
                  borderColor: colors.borderSubtle,
                  borderWidth: 1,
                  borderRadius: radius.xxl,
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.heading3,
                    fontSize: 16,
                    color: colors.textSecondary,
                  }}
                >
                  Keep going
                </Text>
              </Pressable>
            </Animated.View>
          </>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}
