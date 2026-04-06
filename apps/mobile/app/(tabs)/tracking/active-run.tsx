import React, { useEffect, useState } from "react";
import { View, Text, Pressable, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { startLocationTracking, stopLocationTracking } from "../../../lib/backgroundTask";
import { useRunStore } from "../../../store/useRunStore";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, withSpring, useSharedValue, withTiming, withSequence } from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, fonts, radius, icons as themeIcons } from "@/constants/theme";
import MapView, { Polyline, Marker } from "react-native-maps";
import { PulsingDot } from "../../../components/tracking/PulsingDot";
import MapNightStyle from "../../../constants/mapNightStyle.json"; // Need to make sure this or similar exists, else won't crash just pass []

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ActiveRunScreen() {
  const router = useRouter();
  const { 
    status, startRun, pauseRun, resumeRun, stopRun, 
    tick, addCoordinate, elapsedSeconds, distanceMeters, coordinates
  } = useRunStore();

  const [hasGps, setHasGps] = useState(false);
  const [showStopSheet, setShowStopSheet] = useState(false);
  
  const distanceAnim = useSharedValue(1);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);
  
  const sheetTranslateY = useSharedValue(800); 
  const btnScaleResume = useSharedValue(1);
  const btnScaleStop = useSharedValue(1);
  const btnScalePause = useSharedValue(1);

  useEffect(() => {
    // Screen entry animation
    opacity.value = withTiming(1, { duration: 350 });
    translateY.value = withSpring(0, { damping: 18, stiffness: 200 });

    startRun();
    setupLocation();
    
    // Timer interval
    const timer = setInterval(() => {
      tick();
      // Dev mode explicit coordination emulation
      useRunStore.setState((s) => {
        if (__DEV__ && s.status === "running" && s.elapsedSeconds > 0 && s.elapsedSeconds % 5 === 0) {
           const lastLat = s.coordinates.length > 0 ? s.coordinates[s.coordinates.length - 1].latitude : 37.7749;
           const lastLng = s.coordinates.length > 0 ? s.coordinates[s.coordinates.length - 1].longitude : -122.4194;
           s.addCoordinate({
             latitude: lastLat + (Math.random() * 0.001), 
             longitude: lastLng + (Math.random() * 0.001),
             timestamp: Date.now()
           });
        }
        return s;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      stopLocationTracking();
    };
  }, []);

  // Trigger distance jump
  useEffect(() => {
    distanceAnim.value = withSequence(
      withSpring(1.04, { damping: 10, stiffness: 400 }),
      withSpring(1.0, { damping: 12, stiffness: 300 })
    );
  }, [distanceMeters]);

  const setupLocation = async () => {
    await startLocationTracking();
    setHasGps(true);
  };

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

  const formatDistance = (meters: number) => (meters / 1000).toFixed(2);
  const formatTime = (secs: number) => {
    const s = secs % 60;
    const m = Math.floor(secs / 60) % 60;
    const h = Math.floor(secs / 3600);
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentPace = (distanceMeters > 0 && elapsedSeconds > 0) 
    ? ((elapsedSeconds / 60) / (distanceMeters / 1000)).toFixed(2) 
    : "0.00";

  const currentSpeed = (distanceMeters > 0 && elapsedSeconds > 0)
    ? ((distanceMeters / 1000) / (elapsedSeconds / 3600)).toFixed(1)
    : "0.0";

  const distStyle = useAnimatedStyle(() => ({
    transform: [{ scale: distanceAnim.value }]
  }));

  const screenStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
    flex: 1,
    backgroundColor: colors.bg
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }]
  }));

  if (!hasGps) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={themeIcons.gpsSearching.name as any} size={48} color={colors.warning} style={{ marginBottom: 16 }} />
        <Text style={{ fontFamily: fonts.heading2, fontSize: 20, color: colors.textSecondary }}>
          Acquiring GPS...
        </Text>
      </View>
    );
  }

  const activeRegion = coordinates.length > 0 ? {
    latitude: coordinates[coordinates.length - 1].latitude,
    longitude: coordinates[coordinates.length - 1].longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : undefined;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Animated.View style={screenStyle}>
        
        {/* Subtle radial glow behind distance - simulated with large soft circle */}
        <View style={{ position: 'absolute', top: '15%', left: '50%', transform: [{ translateX: -150 }], width: 300, height: 300, borderRadius: radius.pill, backgroundColor: colors.lime, opacity: 0.04, zIndex: 0 }} />

        {/* Top bar */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceHigh, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderSubtle }}>
            <PulsingDot size={6} color={colors.cyan} />
            <Text style={{ fontFamily: fonts.labelCaps, fontSize: 10, color: colors.cyan, letterSpacing: 2, marginLeft: 6 }}>GPS ACTIVE</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: fonts.labelCaps, fontSize: 10, color: colors.textSecondary, letterSpacing: 2 }}>DURATION</Text>
            <Text style={{ fontFamily: fonts.statLabel, fontSize: 14, color: colors.textSecondary, fontVariant: ['tabular-nums'] }}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
        </View>

        {/* Hero section */}
        <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, zIndex: 1 }}>
          <Text style={{ fontFamily: fonts.labelCaps, fontSize: 11, color: colors.textSecondary, letterSpacing: 3, marginBottom: -10 }}>DISTANCE</Text>
          <Animated.Text 
            style={[distStyle, { fontFamily: fonts.heroNumber, fontSize: 96, color: colors.lime, letterSpacing: -3, fontVariant: ['tabular-nums'] }]}
          >
            {distanceMeters === 0 && elapsedSeconds < 2 ? "--" : formatDistance(distanceMeters)}
          </Animated.Text>
          <Text style={{ fontFamily: fonts.labelBold, fontSize: 18, color: colors.textSecondary, letterSpacing: 1, marginTop: -20 }}>KM</Text>

          {/* Timer */}
          <View style={{ alignItems: 'center', marginTop: 32 }}>
            <Ionicons name={themeIcons.timer.name as any} size={14} color={colors.textDim} style={{ marginBottom: 4 }} />
            <Text style={{ fontFamily: fonts.statNumber, fontSize: 52, color: colors.textPrimary, fontVariant: ['tabular-nums'] }}>
              {formatTime(elapsedSeconds)}
            </Text>
          </View>
        </View>

        {/* Secondary stats row */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 20 }}>
          {/* Pace tile */}
          <View style={{ flex: 1, backgroundColor: colors.surface, borderColor: colors.borderMid, borderWidth: 1, borderRadius: radius.lg, padding: 16, paddingLeft: 19 }}>
            <View style={{ position: 'absolute', left: 0, top: 16, bottom: 16, width: 3, backgroundColor: colors.purple, borderTopRightRadius: radius.pill, borderBottomRightRadius: radius.pill }} />
            <MaterialCommunityIcons name={themeIcons.pace.name as any} size={18} color={colors.purple} style={{ marginBottom: 8 }} />
            <Text style={{ fontFamily: fonts.labelCaps, fontSize: 10, color: colors.textDim, letterSpacing: 2 }}>PACE</Text>
            <Text style={{ fontFamily: fonts.statNumber, fontSize: 26, color: colors.textPrimary, fontVariant: ['tabular-nums'] }}>{currentPace}</Text>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textSecondary }}>MIN/KM</Text>
          </View>
          {/* Speed tile */}
          <View style={{ flex: 1, backgroundColor: colors.surface, borderColor: colors.borderMid, borderWidth: 1, borderRadius: radius.lg, padding: 16, paddingLeft: 19 }}>
            <View style={{ position: 'absolute', left: 0, top: 16, bottom: 16, width: 3, backgroundColor: colors.cyan, borderTopRightRadius: radius.pill, borderBottomRightRadius: radius.pill }} />
            <Ionicons name={themeIcons.speed.name as any} size={18} color={colors.cyan} style={{ marginBottom: 8 }} />
            <Text style={{ fontFamily: fonts.labelCaps, fontSize: 10, color: colors.textDim, letterSpacing: 2 }}>SPEED</Text>
            <Text style={{ fontFamily: fonts.statNumber, fontSize: 26, color: colors.textPrimary, fontVariant: ['tabular-nums'] }}>{currentSpeed}</Text>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textSecondary }}>KM/H</Text>
          </View>
        </View>

        {/* Mini route map */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{ height: 150, borderRadius: radius.xl, borderColor: colors.borderSubtle, borderWidth: 1, overflow: 'hidden' }}>
            {coordinates.length > 0 ? (
              <MapView 
                style={{ flex: 1 }} 
                initialRegion={activeRegion}
                region={activeRegion}
                scrollEnabled={false}
                zoomEnabled={false}
                provider="google"
                customMapStyle={[]} // Empty array if style not found, avoids crash. In production supply NightStyle JSON array here.
              >
                <Polyline 
                  coordinates={coordinates.map(c => ({ latitude: c.latitude, longitude: c.longitude }))} 
                  strokeColor={colors.mapRoute} 
                  strokeWidth={3} 
                />
                <Marker coordinate={coordinates[coordinates.length - 1]}>
                  <PulsingDot size={8} color={colors.cyan} />
                </Marker>
              </MapView>
            ) : (
              <View style={{ flex: 1, backgroundColor: colors.surfaceHigh }} />
            )}
          </View>
        </View>

        {/* Controls — bottom section */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row', justifyContent: 'center' }}>
          {status === "paused" ? (
            <View style={{ flexDirection: 'row', width: '100%', gap: 16 }}>
              {/* RESUME */}
              <AnimatedPressable 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  resumeRun();
                }}
                onPressIn={() => btnScaleResume.value = withSpring(0.96, { damping: 15, stiffness: 300 })}
                onPressOut={() => btnScaleResume.value = withSpring(1, { damping: 15, stiffness: 300 })}
                style={[useAnimatedStyle(() => ({ transform: [{ scale: btnScaleResume.value }] })), {
                  flex: 1.5,
                  height: 72,
                  borderRadius: radius.xxl,
                  backgroundColor: colors.lime,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: colors.lime,
                  shadowOpacity: 0.4,
                  shadowRadius: 24,
                  shadowOffset: { width: 0, height: 10 },
                  elevation: 10,
                }]}
              >
                <Ionicons name={themeIcons.resume.name as any} size={28} color={colors.textInverse} style={{ marginRight: 8 }} />
                <Text style={{ fontFamily: fonts.heading1, fontSize: 18, color: colors.textInverse }}>RESUME</Text>
              </AnimatedPressable>

              {/* STOP */}
              <AnimatedPressable 
                onPress={openStopDialog}
                onPressIn={() => btnScaleStop.value = withSpring(0.96, { damping: 15, stiffness: 300 })}
                onPressOut={() => btnScaleStop.value = withSpring(1, { damping: 15, stiffness: 300 })}
                style={[useAnimatedStyle(() => ({ transform: [{ scale: btnScaleStop.value }] })), {
                  flex: 1,
                  height: 72,
                  backgroundColor: colors.coralGlow,
                  borderColor: colors.borderCoral,
                  borderWidth: 1,
                  borderRadius: radius.xxl,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                }]}
              >
                <Ionicons name={themeIcons.stop.name as any} size={24} color={colors.coral} style={{ marginRight: 8 }} />
                <Text style={{ fontFamily: fonts.heading2, fontSize: 16, color: colors.coral }}>STOP</Text>
              </AnimatedPressable>
            </View>
          ) : (
            /* PAUSE */
            <AnimatedPressable 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                pauseRun();
              }}
              onPressIn={() => btnScalePause.value = withSpring(0.96, { damping: 15, stiffness: 300 })}
              onPressOut={() => btnScalePause.value = withSpring(1, { damping: 15, stiffness: 300 })}
              style={[useAnimatedStyle(() => ({ transform: [{ scale: btnScalePause.value }] })), {
                width: '100%',
                height: 72,
                backgroundColor: colors.surfaceHigh,
                borderColor: colors.borderMid,
                borderWidth: 1,
                borderRadius: radius.xxl,
                flexDirection: 'row', 
                justifyContent: 'center', 
                alignItems: 'center'
              }]}
            >
               <Ionicons name={themeIcons.pause.name as any} size={28} color={colors.textPrimary} style={{ marginRight: 8 }} />
               <Text style={{ fontFamily: fonts.heading2, fontSize: 18, color: colors.textPrimary }}>PAUSE</Text>
            </AnimatedPressable>
          )}
        </View>

        {/* Stop confirmation bottom sheet */}
        {showStopSheet && (
          <>
            {/* Backdrop */}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 90 }} />
            
            {/* Sheet */}
            <Animated.View 
              style={[sheetStyle, { 
                position: 'absolute', bottom: 0, left: 0, right: 0, 
                backgroundColor: colors.surfaceHigh, 
                borderTopColor: colors.borderMid, borderTopWidth: 1, 
                borderTopLeftRadius: 32, borderTopRightRadius: 32, 
                paddingTop: 16, paddingHorizontal: 24, paddingBottom: 40,
                zIndex: 100 
              }]}
            >
              {/* Handle bar */}
              <View style={{ width: 36, height: 4, backgroundColor: colors.surfaceHigher, borderRadius: radius.pill, alignSelf: 'center', marginBottom: 24 }} />
              
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <Ionicons name={themeIcons.stop.name as any} size={36} color={colors.coral} style={{ marginBottom: 16 }} />
                <Text style={{ fontFamily: fonts.heading1, fontSize: 26, color: colors.textPrimary }}>End this run?</Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 32 }}>
                <View style={{ flex: 1, backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderWidth: 1, borderRadius: radius.xl, padding: 16, alignItems: 'center' }}>
                   <Text style={{ fontFamily: fonts.statNumber, fontSize: 28, color: colors.textPrimary, fontVariant: ['tabular-nums'] }}>{formatDistance(distanceMeters)}</Text>
                   <Text style={{ fontFamily: fonts.labelCaps, fontSize: 11, letterSpacing: 2, color: colors.textSecondary }}>KM</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderWidth: 1, borderRadius: radius.xl, padding: 16, alignItems: 'center' }}>
                   <Text style={{ fontFamily: fonts.statNumber, fontSize: 28, color: colors.textPrimary, fontVariant: ['tabular-nums'] }}>{formatTime(elapsedSeconds)}</Text>
                   <Text style={{ fontFamily: fonts.labelCaps, fontSize: 11, letterSpacing: 2, color: colors.textSecondary }}>TIME</Text>
                </View>
              </View>

              <Pressable 
                 onPress={handleFinishRun}
                 style={{ width: '100%', height: 68, backgroundColor: colors.coral, borderRadius: radius.xxl, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}
              >
                <Ionicons name={themeIcons.save.name as any} size={24} color={colors.textPrimary} style={{ marginRight: 8 }} />
                <Text style={{ fontFamily: fonts.heading1, fontSize: 18, color: colors.textPrimary }}>YES, FINISH</Text>
              </Pressable>

              <Pressable 
                 onPress={closeStopDialogAndResume}
                 style={{ width: '100%', height: 56, backgroundColor: 'transparent', borderColor: colors.borderSubtle, borderWidth: 1, borderRadius: radius.xxl, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}
              >
                <Text style={{ fontFamily: fonts.heading3, fontSize: 16, color: colors.textSecondary }}>Keep going</Text>
              </Pressable>
            </Animated.View>
          </>
        )}

      </Animated.View>
    </SafeAreaView>
  );
}
