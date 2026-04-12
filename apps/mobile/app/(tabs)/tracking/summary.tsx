import React, { useEffect, useMemo, useState } from "react";
import { View, Pressable, Platform, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Polyline, Marker } from "react-native-maps";

import { useRunStore } from "../../../store/useRunStore";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { fonts, radius, icons as themeIcons } from "@/constants/theme";
import { PulsingDot } from "../../../components/tracking/PulsingDot";
import MapNightStyle from "../../../constants/mapNightStyle.json";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import {
  calculatePaceAndSpeed,
  estimateCalories,
  formatDistanceKm,
  formatDurationClock,
} from "../../../lib/tracking/runUtils";
import { TrackingMetricTile } from "../../../components/tracking/TrackingMetricTile";
import { OsmMapView } from "../../../components/tracking/OsmMapView";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function RunSummaryScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const {
    distanceMeters,
    distanceOverrideMeters,
    setDistanceOverrideMeters,
    elapsedSeconds,
    coordinates,
    resetRun,
  } = useRunStore();

  const [isEditingDistance, setIsEditingDistance] = useState(false);
  const [distanceKmText, setDistanceKmText] = useState("");

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);
  const scaleRateBtn = useSharedValue(1);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 350 });
    translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
  }, []);

  const handleDiscard = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    resetRun();
    router.replace("/(tabs)/tracking" as any);
  };

  const handleSaveAndRate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.replace("/(tabs)/tracking/feedback" as any);
  };

  const finalDistanceMeters = useMemo(
    () =>
      typeof distanceOverrideMeters === "number"
        ? distanceOverrideMeters
        : distanceMeters,
    [distanceOverrideMeters, distanceMeters],
  );

  const onStartEditDistance = () => {
    setDistanceKmText((finalDistanceMeters / 1000).toFixed(2));
    setIsEditingDistance(true);
  };

  const onApplyDistanceEdit = () => {
    const normalized = distanceKmText.replace(",", ".").trim();
    const km = Number(normalized);
    if (!Number.isFinite(km) || km < 0) {
      Alert.alert("Invalid distance", "Enter a valid distance in kilometers.");
      return;
    }
    setDistanceOverrideMeters(km === 0 ? null : Math.round(km * 1000));
    setIsEditingDistance(false);
  };

  const onCancelDistanceEdit = () => {
    setIsEditingDistance(false);
    setDistanceKmText("");
  };

  const { paceMinPerKm: currentPace, speedKmH: currentSpeed } =
    calculatePaceAndSpeed(finalDistanceMeters, elapsedSeconds);
  const calories = estimateCalories(finalDistanceMeters);

  const initialRegion =
    coordinates.length > 0
      ? {
          latitude: coordinates[0].latitude,
          longitude: coordinates[0].longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }
      : undefined;

  const useOsmMap = false; // User explicitly requested realistic map (native MapView)

  const animatedScreenStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
    flex: 1,
  }));

  const animatedRateBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleRateBtn.value }],
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.ScrollView
        bounces={true}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 40,
          paddingBottom: 40,
        }}
        style={animatedScreenStyle}
      >
        {/* Celebration Header */}
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: radius.pill,
              backgroundColor: colors.accentLight,
              borderColor: colors.border,
              borderWidth: 1,
              justifyContent: "center",
              alignItems: "center",
              ...(isDark
                ? {}
                : {
                    shadowColor: colors.accent,
                    shadowOpacity: 0.18,
                    shadowRadius: 18,
                    shadowOffset: { width: 0, height: 10 },
                    elevation: 6,
                  }),
              marginBottom: 20,
            }}
          >
            <MaterialCommunityIcons
              name={themeIcons.medal.name as any}
              size={56}
              color={colors.accent}
            />
          </View>
          <Text
            style={{
              fontFamily: fonts.heroDisplay,
              fontSize: 44,
              color: colors.text,
              letterSpacing: -1,
            }}
          >
            Run Complete!
          </Text>
          <Text
            style={{
              fontFamily: fonts.bodyMedium,
              fontSize: 16,
              color: colors.textSecondary,
              marginTop: 4,
            }}
          >
            You crushed it today
          </Text>
        </View>

        {/* Hero Distance Card */}
        <View
          style={{
            backgroundColor: isDark ? colors.card : colors.cardElevated,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: radius.xxl,
            padding: 24,
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <MaterialCommunityIcons
            name={themeIcons.distance.name as any}
            size={22}
            color={colors.accent}
            style={{ marginBottom: 4 }}
          />
          <Text
            style={{
              fontFamily: fonts.labelCaps,
              fontSize: 11,
              color: colors.textSecondary,
              letterSpacing: 2.5,
              marginBottom: -6,
            }}
          >
            TOTAL DISTANCE
          </Text>
          <Text
            style={{
              fontFamily: fonts.heroNumber,
              fontSize: 80,
              color: colors.text,
              letterSpacing: -2,
              fontVariant: ["tabular-nums"],
            }}
          >
            {finalDistanceMeters === 0 && elapsedSeconds < 2
              ? "--"
              : formatDistanceKm(finalDistanceMeters, 2)}
          </Text>
          <Text
            style={{
              fontFamily: fonts.labelMedium,
              fontSize: 13,
              color: colors.textSecondary,
              marginTop: -8,
            }}
          >
            KILOMETERS
          </Text>

          {/* Manual distance override */}
          <View style={{ width: "100%", marginTop: 14 }}>
            {!isEditingDistance ? (
              <Pressable
                onPress={onStartEditDistance}
                style={{
                  height: 42,
                  borderRadius: radius.lg,
                  borderColor: colors.border,
                  borderWidth: 1,
                  backgroundColor: colors.inputBackground,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Ionicons
                  name={themeIcons.edit.name as any}
                  size={16}
                  color={colors.textSecondary}
                />
                <Text
                  style={{
                    fontFamily: fonts.bodyMedium,
                    fontSize: 13,
                    color: colors.textSecondary,
                  }}
                >
                  Edit distance
                </Text>
              </Pressable>
            ) : (
              <View
                style={{ flexDirection: "row", gap: 10, alignItems: "center" }}
              >
                <TextInput
                  value={distanceKmText}
                  onChangeText={setDistanceKmText}
                  placeholder="Distance (km)"
                  placeholderTextColor={colors.textDim}
                  keyboardType={
                    Platform.OS === "ios" ? "decimal-pad" : "numeric"
                  }
                  style={{
                    flex: 1,
                    height: 42,
                    borderRadius: radius.lg,
                    borderColor: colors.accent,
                    borderWidth: 1,
                    paddingHorizontal: 12,
                    fontFamily: fonts.bodyMedium,
                    fontSize: 14,
                    color: colors.text,
                    backgroundColor: colors.inputBackground,
                  }}
                />
                <Pressable
                  onPress={onApplyDistanceEdit}
                  style={{
                    height: 42,
                    paddingHorizontal: 14,
                    borderRadius: radius.lg,
                    backgroundColor: colors.accent,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.heading3,
                      fontSize: 14,
                      color: colors.textInverse,
                      marginTop: 3,
                    }}
                  >
                    Done
                  </Text>
                </Pressable>
                <Pressable
                  onPress={onCancelDistanceEdit}
                  style={{
                    height: 42,
                    paddingHorizontal: 14,
                    borderRadius: radius.lg,
                    borderColor: colors.border,
                    borderWidth: 1,
                    backgroundColor: "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.heading3,
                      fontSize: 14,
                      color: colors.textSecondary,
                      marginTop: 3,
                    }}
                  >
                    Cancel
                  </Text>
                </Pressable>
              </View>
            )}

            {typeof distanceOverrideMeters === "number" &&
            !isEditingDistance ? (
              <View style={{ marginTop: 10, alignItems: "center" }}>
                <Pressable
                  onPress={() => setDistanceOverrideMeters(null)}
                  style={{
                    height: 34,
                    paddingHorizontal: 12,
                    borderRadius: radius.pill,
                    borderColor: colors.border,
                    borderWidth: 1,
                    backgroundColor: "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 6,
                  }}
                >
                  <Ionicons
                    name={themeIcons.gpsActive.name as any}
                    size={14}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={{
                      fontFamily: fonts.bodyMedium,
                      fontSize: 12,
                      color: colors.textSecondary,
                    }}
                  >
                    Use GPS distance
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>

        {/* Stats Grid 2x2 */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <TrackingMetricTile
            iconLibrary="Ionicons"
            iconName={themeIcons.timer.name as any}
            iconColor={colors.textPrimary}
            accentColor={colors.textPrimary}
            value={formatDurationClock(elapsedSeconds)}
            bottomLabel="TIME"
          />
          <TrackingMetricTile
            iconLibrary="MaterialCommunityIcons"
            iconName={themeIcons.pace.name as any}
            iconColor={colors.purple}
            accentColor={colors.purple}
            value={currentPace}
            valueColor={colors.purple}
            bottomLabel="MIN/KM"
          />
          <TrackingMetricTile
            iconLibrary="Ionicons"
            iconName={themeIcons.speed.name as any}
            iconColor={colors.cyan}
            accentColor={colors.cyan}
            value={currentSpeed}
            valueColor={colors.cyan}
            bottomLabel="KM/H"
          />
          <TrackingMetricTile
            iconLibrary="MaterialCommunityIcons"
            iconName={themeIcons.calories.name as any}
            iconColor={colors.amber}
            accentColor={colors.amber}
            value={String(calories)}
            valueColor={colors.amber}
            bottomLabel="KCAL"
          />
        </View>

        {/* Map route preview */}
        <View style={{ marginBottom: 32 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Ionicons
              name={themeIcons.route.name as any}
              size={16}
              color={colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={{
                fontFamily: fonts.labelCaps,
                fontSize: 11,
                color: colors.textSecondary,
                letterSpacing: 2.5,
              }}
            >
              YOUR ROUTE
            </Text>
          </View>
          <View
            style={{
              height: 220,
              borderRadius: radius.xxl,
              borderColor: colors.border,
              borderWidth: 1,
              overflow: "hidden",
            }}
          >
            {coordinates.length > 0 ? (
              useOsmMap ? (
                <OsmMapView
                  coordinates={coordinates}
                  routeColor={colors.mapRoute}
                  startColor={colors.mapStart}
                  endColor={colors.mapEnd}
                  backgroundColor={colors.surfaceHigh}
                  isDark={isDark}
                />
              ) : (
                <MapView
                  style={{ flex: 1 }}
                  initialRegion={initialRegion}
                  userInterfaceStyle={isDark ? "dark" : "light"}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  provider={Platform.OS === "android" ? "google" : undefined}
                  mapType="standard"
                  showsBuildings={false}
                  customMapStyle={isDark ? (MapNightStyle as any) : ([] as any)}
                >
                  <Polyline
                    coordinates={coordinates.map((c) => ({
                      latitude: c.latitude,
                      longitude: c.longitude,
                    }))}
                    strokeColor={colors.mapRoute}
                    strokeWidth={4}
                  />
                  <Marker coordinate={coordinates[0]}>
                    <PulsingDot size={12} color={colors.mapStart} />
                  </Marker>
                  <Marker coordinate={coordinates[coordinates.length - 1]}>
                    <PulsingDot size={12} color={colors.mapEnd} />
                  </Marker>
                </MapView>
              )
            ) : (
              <View style={{ flex: 1, backgroundColor: colors.surfaceHigh }} />
            )}
          </View>
        </View>

        {/* Buttons */}
        <View style={{ gap: 16 }}>
          <AnimatedPressable
            onPress={handleSaveAndRate}
            onPressIn={() =>
              (scaleRateBtn.value = withSpring(0.96, {
                damping: 15,
                stiffness: 300,
              }))
            }
            onPressOut={() =>
              (scaleRateBtn.value = withSpring(1, {
                damping: 15,
                stiffness: 300,
              }))
            }
            style={[
              animatedRateBtnStyle,
              {
                width: "100%",
                height: 68,
                backgroundColor: colors.accent,
                borderRadius: radius.xxl,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                ...(isDark
                  ? {}
                  : {
                      shadowColor: colors.accent,
                      shadowOpacity: 0.18,
                      shadowRadius: 18,
                      shadowOffset: { width: 0, height: 10 },
                      elevation: 6,
                    }),
              },
            ]}
          >
            <Text
              style={{
                fontFamily: fonts.heading1,
                fontSize: 20,
                color: colors.textInverse,
                marginRight: 8,
                marginTop: 4,
              }}
            >
              RATE THIS RUN
            </Text>
            <Ionicons
              name={themeIcons.chevronRight.name as any}
              size={24}
              color={colors.textInverse}
            />
          </AnimatedPressable>

          <Pressable
            onPress={handleDiscard}
            style={{
              height: 56,
              backgroundColor: "transparent",
              borderRadius: radius.xxl,
              borderColor: colors.dangerSoft,
              borderWidth: 1,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons
              name={themeIcons.discard.name as any}
              size={20}
              color={colors.danger}
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                fontFamily: fonts.heading3,
                fontSize: 16,
                color: colors.danger,
              }}
            >
              Discard Run
            </Text>
          </Pressable>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
