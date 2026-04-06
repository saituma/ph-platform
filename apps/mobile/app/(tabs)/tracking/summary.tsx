import React, { useEffect } from "react";
import { View, Text, Pressable, ScrollView, SafeAreaView } from "react-native";
import MapView, { Polyline, Marker } from "react-native-maps";
import { useRunStore } from "../../../store/useRunStore";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, fonts, radius, icons as themeIcons } from "@/constants/theme";
import { PulsingDot } from "../../../components/tracking/PulsingDot";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function RunSummaryScreen() {
  const router = useRouter();
  const { distanceMeters, elapsedSeconds, coordinates, resetRun } = useRunStore();

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

  const formatDistance = (meters: number) => (meters / 1000).toFixed(2);
  const formatTime = (secs: number) => {
    const s = secs % 60;
    const m = Math.floor(secs / 60) % 60;
    const h = Math.floor(secs / 3600);
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const distanceKm = distanceMeters / 1000;
  const currentPace = (distanceMeters > 0 && elapsedSeconds > 0) 
    ? ((elapsedSeconds / 60) / distanceKm).toFixed(2) 
    : "0.00";

  const currentSpeed = (distanceMeters > 0 && elapsedSeconds > 0)
    ? (distanceKm / (elapsedSeconds / 3600)).toFixed(1)
    : "0.0";
    
  const calories = Math.floor(distanceKm * 60);

  const initialRegion = coordinates.length > 0 ? {
    latitude: coordinates[0].latitude,
    longitude: coordinates[0].longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  } : undefined;

  const animatedScreenStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
    flex: 1,
  }));

  const animatedRateBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleRateBtn.value }]
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Animated.ScrollView 
        bounces={true} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 40, paddingBottom: 40 }}
        style={animatedScreenStyle}
      >
        {/* Celebration Header */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View style={{ 
            width: 96,
            height: 96,
            borderRadius: radius.pill,
            backgroundColor: colors.limeGlow,
            borderColor: colors.borderLime,
            borderWidth: 1.5,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: colors.lime, shadowOpacity: 0.4, shadowRadius: 30, shadowOffset: { width: 0, height: 10 }, 
            marginBottom: 20,
            elevation: 10,
          }}>
            <MaterialCommunityIcons name={themeIcons.medal.name as any} size={56} color={colors.lime} />
          </View>
          <Text style={{ fontFamily: fonts.heroDisplay, fontSize: 44, color: colors.textPrimary, letterSpacing: -1 }}>Run Complete!</Text>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.textSecondary, marginTop: 4 }}>
            You crushed it today
          </Text>
        </View>

        {/* Hero Distance Card */}
        <View style={{ 
          backgroundColor: colors.limeGlow, 
          borderColor: colors.borderLime, 
          borderWidth: 1.5, 
          borderRadius: radius.xxl, 
          padding: 24, 
          alignItems: 'center', 
          marginBottom: 24 
        }}>
          <MaterialCommunityIcons name={themeIcons.distance.name as any} size={22} color={colors.lime} style={{ marginBottom: 4 }} />
          <Text style={{ fontFamily: fonts.labelCaps, fontSize: 11, color: colors.lime, letterSpacing: 2.5, marginBottom: -6 }}>TOTAL DISTANCE</Text>
          <Text style={{ fontFamily: fonts.heroNumber, fontSize: 80, color: colors.lime, letterSpacing: -2, fontVariant: ['tabular-nums'] }}>
            {distanceMeters === 0 && elapsedSeconds < 2 ? "--" : formatDistance(distanceMeters)}
          </Text>
          <Text style={{ fontFamily: fonts.labelMedium, fontSize: 13, color: colors.lime, opacity: 0.7, marginTop: -8 }}>
            KILOMETERS
          </Text>
        </View>

        {/* Stats Grid 2x2 */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
           {/* Time */}
           <View style={{ flex: 1, minWidth: '45%', backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderWidth: 1, borderRadius: radius.xl, padding: 20 }}>
               <View style={{ position: 'absolute', left: 0, top: 20, bottom: 20, width: 3, backgroundColor: colors.textPrimary, borderTopRightRadius: radius.pill, borderBottomRightRadius: radius.pill }} />
               <Ionicons name={themeIcons.timer.name as any} size={20} color={colors.textPrimary} style={{ marginBottom: 12 }} />
               <Text style={{ fontFamily: fonts.statNumber, fontSize: 30, color: colors.textPrimary, fontVariant: ['tabular-nums'] }}>{formatTime(elapsedSeconds)}</Text>
               <Text style={{ fontFamily: fonts.labelCaps, fontSize: 10, color: colors.textSecondary, letterSpacing: 2, marginTop: 4 }}>TIME</Text>
           </View>
           {/* Pace */}
           <View style={{ flex: 1, minWidth: '45%', backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderWidth: 1, borderRadius: radius.xl, padding: 20 }}>
               <View style={{ position: 'absolute', left: 0, top: 20, bottom: 20, width: 3, backgroundColor: colors.purple, borderTopRightRadius: radius.pill, borderBottomRightRadius: radius.pill }} />
               <MaterialCommunityIcons name={themeIcons.pace.name as any} size={20} color={colors.purple} style={{ marginBottom: 12 }} />
               <Text style={{ fontFamily: fonts.statNumber, fontSize: 30, color: colors.purple, fontVariant: ['tabular-nums'] }}>{currentPace}</Text>
               <Text style={{ fontFamily: fonts.labelCaps, fontSize: 10, color: colors.textSecondary, letterSpacing: 2, marginTop: 4 }}>MIN/KM</Text>
           </View>
           {/* Speed */}
           <View style={{ flex: 1, minWidth: '45%', backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderWidth: 1, borderRadius: radius.xl, padding: 20 }}>
               <View style={{ position: 'absolute', left: 0, top: 20, bottom: 20, width: 3, backgroundColor: colors.cyan, borderTopRightRadius: radius.pill, borderBottomRightRadius: radius.pill }} />
               <Ionicons name={themeIcons.speed.name as any} size={20} color={colors.cyan} style={{ marginBottom: 12 }} />
               <Text style={{ fontFamily: fonts.statNumber, fontSize: 30, color: colors.cyan, fontVariant: ['tabular-nums'] }}>{currentSpeed}</Text>
               <Text style={{ fontFamily: fonts.labelCaps, fontSize: 10, color: colors.textSecondary, letterSpacing: 2, marginTop: 4 }}>KM/H</Text>
           </View>
           {/* Calories */}
           <View style={{ flex: 1, minWidth: '45%', backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderWidth: 1, borderRadius: radius.xl, padding: 20 }}>
               <View style={{ position: 'absolute', left: 0, top: 20, bottom: 20, width: 3, backgroundColor: colors.amber, borderTopRightRadius: radius.pill, borderBottomRightRadius: radius.pill }} />
               <MaterialCommunityIcons name={themeIcons.calories.name as any} size={20} color={colors.amber} style={{ marginBottom: 12 }} />
               <Text style={{ fontFamily: fonts.statNumber, fontSize: 30, color: colors.amber, fontVariant: ['tabular-nums'] }}>{calories}</Text>
               <Text style={{ fontFamily: fonts.labelCaps, fontSize: 10, color: colors.textSecondary, letterSpacing: 2, marginTop: 4 }}>KCAL</Text>
           </View>
        </View>

        {/* Map route preview */}
        <View style={{ marginBottom: 32 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Ionicons name={themeIcons.route.name as any} size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={{ fontFamily: fonts.labelCaps, fontSize: 11, color: colors.textSecondary, letterSpacing: 2.5 }}>YOUR ROUTE</Text>
          </View>
          <View style={{ height: 220, borderRadius: radius.xxl, borderColor: colors.borderSubtle, borderWidth: 1, overflow: 'hidden' }}>
             {coordinates.length > 0 ? (
               <MapView 
                 style={{ flex: 1 }} 
                 initialRegion={initialRegion} 
                 userInterfaceStyle="dark" 
                 scrollEnabled={false} 
                 zoomEnabled={false}
                 provider="google"
                 customMapStyle={[]} 
               >
                 <Polyline 
                   coordinates={coordinates.map(c => ({ latitude: c.latitude, longitude: c.longitude }))} 
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
             ) : (
               <View style={{ flex: 1, backgroundColor: colors.surfaceHigh }} />
             )}
          </View>
        </View>

        {/* Buttons */}
        <View style={{ gap: 16 }}>
           <AnimatedPressable 
              onPress={handleSaveAndRate}
              onPressIn={() => scaleRateBtn.value = withSpring(0.96, { damping: 15, stiffness: 300 })}
              onPressOut={() => scaleRateBtn.value = withSpring(1, { damping: 15, stiffness: 300 })}
              style={[animatedRateBtnStyle, { 
                width: '100%',
                height: 68,
                backgroundColor: colors.lime,
                borderRadius: radius.xxl, 
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
              <Text style={{ fontFamily: fonts.heading1, fontSize: 20, color: colors.textInverse, marginRight: 8, marginTop: 4 }}>RATE THIS RUN</Text>
              <Ionicons name={themeIcons.chevronRight.name as any} size={24} color={colors.textInverse} />
           </AnimatedPressable>

           <Pressable 
              onPress={handleDiscard}
              style={{ 
                height: 56,
                backgroundColor: 'transparent',
                borderRadius: radius.xxl, 
                borderColor: colors.borderCoral, 
                borderWidth: 1, 
                flexDirection: 'row', 
                justifyContent: 'center', 
                alignItems: 'center' 
              }}
           >
              <Ionicons name={themeIcons.discard.name as any} size={20} color={colors.coral} style={{ marginRight: 8 }} />
              <Text style={{ fontFamily: fonts.heading3, fontSize: 16, color: colors.coral }}>Discard Run</Text>
           </Pressable>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
