import React, { useCallback, useEffect, memo } from "react";
import { Alert, Image, Pressable, View, Dimensions, StyleSheet, UIManager } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  User,
  LogOut,
  Moon,
  Sun,
  Shield,
  Info,
  ChevronRight,
  Cpu,
  Fingerprint,
} from "lucide-react-native";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/slices/userSlice";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useProfileSettings } from "@/components/more/profile/hooks/useProfileSettings";

import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { AdminHeader, AdminScreen } from "@/components/admin/AdminUI";
import { AdminAvatarSection } from "../components/AdminAvatarSection";
import { 
  UICard, 
  UIButton, 
  UIChip, 
  UISectionHeader, 
  Avatar, 
  Separator,
} from "@/components/ui/hero";
import { LiquidGlass } from "@/components/ui/LiquidGlass";
import { MeshGradientView } from "expo-mesh-gradient";
import { Shadows } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const Springs = {
  snappy: { damping: 15, stiffness: 400, mass: 0.3 },
};

// ── Enhanced Particle System ──────────────────────────────────────────

const FloatingParticle = memo(({ size, color, delay }: { size: number, color: string, delay: number }) => {
  const tx = useSharedValue(Math.random() * SCREEN_WIDTH);
  const ty = useSharedValue(Math.random() * 200);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withRepeat(withSequence(withTiming(0.6, { duration: 2000 }), withTiming(0, { duration: 2000 })), -1, true));
    scale.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 2000 }), withTiming(0.3, { duration: 2000 })), -1, true));
    
    tx.value = withRepeat(withTiming(tx.value + (Math.random() - 0.5) * 40, { duration: 4000, easing: Easing.inOut(Easing.sin) }), -1, true);
    ty.value = withRepeat(withTiming(ty.value + (Math.random() - 0.5) * 40, { duration: 4000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [delay, opacity, scale, tx, ty]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value }
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
});

function HeaderParticles() {
  const { colors } = useAppTheme();
  
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: 12 }).map((_, i) => (
        <FloatingParticle 
          key={i} 
          size={Math.random() * 4 + 2} 
          color={i % 3 === 0 ? colors.accent : "#FFF"} 
          delay={i * 300} 
        />
      ))}
    </View>
  );
}

const MESH_POINTS: number[][] = [
  [0, 0], [0.5, 0], [1, 0],
  [0, 0.5], [0.5, 0.5], [1, 0.5],
  [0, 1], [0.5, 1], [1, 1],
];

const HAS_MESH_GRADIENT = Boolean(
  UIManager.getViewManagerConfig?.("ViewManagerAdapter_ExpoMeshGradient") ||
    UIManager.getViewManagerConfig?.("RCTViewManagerAdapter_ExpoMeshGradient"),
);

// ── Main screen ──────────────────────────────────────────────────────

export default function AdminProfileScreen() {
  const { colors, isDark, toggleColorScheme } = useAppTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const insets = useAppSafeAreaInsets();
  const token = useAppSelector((s) => s.user.token);

  const {
    profile,
    name,
    setName,
    email,
    isUploadingAvatar,
    pendingAvatarUri,
    setPendingAvatarUri,
    isSaving,
    handlePickAvatar,
    handleConfirmAvatar,
    handleSave,
  } = useProfileSettings();

  const pulseValue = useSharedValue(1);
  useEffect(() => {
    pulseValue.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [pulseValue]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseValue.value }],
    opacity: 1.5 - pulseValue.value,
  }));

  const handleLogout = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Terminate Session", "You will be disconnected from administrative systems. Proceed?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Terminate",
        style: "destructive",
        onPress: () => {
          if (token) {
            import("@/lib/pushRegistration").then(({ clearDevicePushToken }) => {
              void clearDevicePushToken(token);
            });
          }
          dispatch(logout());
          router.replace("/(auth)/login");
        },
      },
    ]);
  }, [dispatch, router, token]);

  const appearanceValue = useSharedValue(isDark ? 1 : 0);
  useEffect(() => {
    appearanceValue.value = withSpring(isDark ? 1 : 0, Springs.snappy);
  }, [isDark, appearanceValue]);

  const toggleIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: appearanceValue.value * (SCREEN_WIDTH * 0.42) }] 
  }));

  const MESH_COLORS = isDark 
    ? ["#0A0A14", "#7B61FF", "#0A0A14", "#00E5FF", "#0F0F2A", "#7B61FF", "#0A0A14", "#00E5FF", "#0A0A14"]
    : ["#F8F7FF", "#7B61FF20", "#FFFFFF", "#00E5FF15", "#FFFFFF", "#7B61FF15", "#FFFFFF", "#F8F7FF", "#FFFFFF"];

  return (
    <AdminScreen>
      <ThemedScrollView
        contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
      >
        <View style={{ marginBottom: 10 }}>
          <AdminHeader
            eyebrow="Administrative Control (HeroUI Enabled)"
            title="Profile"
            subtitle="System clearance level: Elite"
            tone="accent"
          />
          <HeaderParticles />
        </View>

        {/* ── STAFF HERO HEADER ── */}
        <Animated.View 
          entering={FadeInDown.delay(100).duration(800)}
          className="px-6 mb-10"
        >
          <View className="rounded-[40px] overflow-hidden border border-white/10" style={Shadows.xl}>
            <View style={StyleSheet.absoluteFill}>
              {HAS_MESH_GRADIENT ? (
                <MeshGradientView
                  columns={3}
                  rows={3}
                  points={MESH_POINTS}
                  colors={MESH_COLORS}
                  style={StyleSheet.absoluteFill}
                />
              ) : (
                <LinearGradient
                  colors={isDark ? ["#0A0A14", "#1C1C3A", "#0F0F2A"] : ["#F8F7FF", "#E0E7FF", "#FFFFFF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
            </View>

            <LiquidGlass 
              glassStyle="clear" 
              className="p-10"
              isInteractive
            >
              <View className="flex-row items-start justify-between mb-8">
                <View className="relative">
                  <View 
                    style={{
                      position: "absolute",
                      top: -4,
                      left: -4,
                      right: -4,
                      bottom: -4,
                      borderRadius: 42,
                      borderWidth: 2,
                      borderColor: colors.accent,
                      opacity: 0.3,
                    }}
                  />
                  <Avatar size="lg" className="h-32 w-32 rounded-[38px] border-4 border-white/40">
                    {profile.avatar ? (
                      <Avatar.Image source={{ uri: profile.avatar }} className="rounded-[34px]" />
                    ) : (
                      <Avatar.Fallback className="bg-white/15">
                        <User size={56} color="#FFF" strokeWidth={1.2} />
                      </Avatar.Fallback>
                    )}
                  </Avatar>
                  <View className="absolute -bottom-1 -right-1 h-11 w-11 rounded-[14px] bg-[#7B61FF] items-center justify-center border-[5px] border-[#07070F]">
                    <Shield size={20} color="#FFF" strokeWidth={2.5} />
                  </View>
                </View>

                <View className="items-end gap-3">
                  <View className="flex-row items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20">
                    <View className="relative h-2.5 w-2.5">
                        <Animated.View className="absolute inset-0 rounded-full bg-success" style={pulseStyle} />
                        <View className="h-2.5 w-2.5 rounded-full bg-success shadow-[0_0_8px_var(--color-success)]" />
                    </View>
                    <Text className="text-[11px] font-black text-white tracking-[0.15em] uppercase">Status: Online</Text>
                  </View>
                  <UIChip label="Level 5 Administrator" color="accent" />
                </View>
              </View>

              <View className="mb-10">
                <Text className="text-[44px] font-black font-clash text-white leading-none tracking-tighter mb-2">
                  {profile.name || "Master Admin"}
                </Text>
                <View className="flex-row items-center gap-2.5">
                    <Fingerprint size={16} color="rgba(255,255,255,0.6)" />
                    <Text className="text-white/70 font-outfit text-lg font-medium">
                    {profile.email || "staff.id_primary_ops"}
                    </Text>
                </View>
              </View>

              <View className="flex-row gap-5">
                <UIButton 
                  label="Update Assets" 
                  variant="outline" 
                  className="flex-1 min-h-0 py-4 rounded-[22px] border-white/25 bg-white/10"
                  textClassName="text-white font-black tracking-widest uppercase text-xs"
                  onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)}
                />
                <UIButton 
                    variant="secondary"
                    className="w-16 h-16 p-0 rounded-[22px] bg-white/15 border-white/20"
                    onPress={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}
                >
                    <Cpu size={24} color="#FFF" />
                </UIButton>
              </View>
            </LiquidGlass>
          </View>
        </Animated.View>

        <View className="px-6 gap-10">
          {/* ── System Theme ── */}
          <Animated.View entering={FadeInDown.delay(300).duration(600)}>
            <UISectionHeader 
              title="Interface" 
              description="Calibrate the platform visual engine"
              className="mb-6 px-1"
            />
            <UICard className="p-1.5 rounded-[32px]">
              <Pressable 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleColorScheme();
                }}
                className="flex-row"
              >
                <View className="flex-1 flex-row items-center justify-center gap-2.5 py-4 z-10">
                  <Sun size={18} color={!isDark ? colors.accent : colors.textSecondary} strokeWidth={!isDark ? 2.5 : 2} />
                  <Text style={{ fontFamily: "Outfit-Black", fontSize: 12, color: !isDark ? colors.textPrimary : colors.textSecondary, tracking: 1 }}>DAY OPS</Text>
                </View>
                <View className="flex-1 flex-row items-center justify-center gap-2.5 py-4 z-10">
                  <Moon size={18} color={isDark ? colors.accent : colors.textSecondary} strokeWidth={isDark ? 2.5 : 2} />
                  <Text style={{ fontFamily: "Outfit-Black", fontSize: 12, color: isDark ? colors.textPrimary : colors.textSecondary, tracking: 1 }}>NIGHT OPS</Text>
                </View>
                
                <Animated.View 
                  className="absolute top-1.5 bottom-1.5 left-1.5 rounded-[26px]"
                  style={[
                    { 
                      width: "48.5%", 
                      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#FFF",
                      borderWidth: 1,
                      borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.05)",
                      ...(isDark ? {} : Shadows.md)
                    },
                    toggleIndicatorStyle
                  ]}
                />
              </Pressable>
            </UICard>
          </Animated.View>

          <Separator className="opacity-10" />

          {/* ── Staff Credentials ── */}
          <Animated.View entering={FadeInDown.delay(400).duration(600)}>
            <UISectionHeader 
              title="Staff Record" 
              description="Authenticated identity synchronization"
              className="mb-6 px-1"
            />
            <UICard className="p-8 rounded-[38px]">
              <AdminAvatarSection
                  avatar={profile.avatar ?? null}
                  name={name}
                  setName={setName}
                  email={email}
                  isUploadingAvatar={isUploadingAvatar}
                  onPickAvatar={handlePickAvatar}
              />
              <View className="mt-8">
                  <UIButton
                      label={isSaving ? "SYNCING..." : "SYNC RECORD"}
                      variant="primary"
                      className="h-16 rounded-[24px]"
                      textClassName="font-black tracking-[0.2em] text-xs"
                      onPress={() => {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          handleSave();
                      }}
                      disabled={isSaving}
                  />
              </View>
            </UICard>
          </Animated.View>

          <Separator className="opacity-10" />

          {/* ── Control Center ── */}
          <Animated.View entering={FadeInDown.delay(500).duration(600)}>
            <UISectionHeader 
              title="Command Center" 
              description="Security protocols and system manifest"
              className="mb-6 px-1"
            />
            <UICard className="p-0 overflow-hidden rounded-[38px]">
              <MenuItem
                icon={Fingerprint}
                label="Biometric Security"
                detail="Lock protocols and encryption"
                onPress={() => router.navigate("/privacy-security")}
              />
              <MenuItem
                icon={Shield}
                label="Access Clearances"
                detail="System-wide permission levels"
                onPress={() => router.navigate("/permissions")}
              />
              <MenuItem
                icon={Cpu}
                label="Kernel Debug"
                detail="Advanced developer diagnostic tools"
                onPress={() => Haptics.selectionAsync()}
              />
              <MenuItem
                icon={Info}
                label="System Manifest"
                detail="Build logs and platform versioning"
                isLast
                onPress={() => router.push("/about")}
              />
            </UICard>
          </Animated.View>

          {/* ── Logout ── */}
          <Animated.View entering={FadeInDown.delay(600).duration(600)} className="mb-10">
            <Pressable
                onPress={handleLogout}
                style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
            >
                <View
                className="h-20 flex-row items-center justify-center gap-4 rounded-[30px]"
                style={{ backgroundColor: "rgba(239, 68, 68, 0.08)", borderWidth: 1, borderColor: "rgba(239, 68, 68, 0.2)" }}
                >
                <View className="w-10 h-10 items-center justify-center rounded-2xl bg-danger/10">
                  <LogOut size={20} color="#EF4444" strokeWidth={2.5} />
                </View>
                <Text style={{ fontFamily: "Outfit-Black", fontSize: 13, color: "#EF4444", letterSpacing: 2 }}>
                    TERMINATE ADMIN SESSION
                </Text>
                </View>
            </Pressable>
          </Animated.View>
        </View>
      </ThemedScrollView>
    </AdminScreen>
  );
}

/* ─── Local UI Helpers ─────────────────────────────────────────────────── */

function MenuItem({
  icon: Icon,
  label,
  detail,
  isLast = false,
  onPress,
}: {
  icon: any;
  label: string;
  detail?: string;
  isLast?: boolean;
  onPress?: () => void;
}) {
  const { colors, isDark } = useAppTheme();

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 28,
          paddingVertical: 24,
          backgroundColor: pressed ? (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)") : "transparent",
        },
        !isLast && { borderBottomWidth: 1, borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }
      ]}
    >
      <View 
        className="w-12 h-12 items-center justify-center rounded-[18px] mr-5"
        style={{ 
          backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.03)",
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.05)" : "transparent"
        }}
      >
        <Icon size={22} color={isDark ? colors.accent : colors.textPrimary} strokeWidth={2} />
      </View>
      <View className="flex-1 mr-4">
        <Text className="font-outfit-bold text-[17px] text-app mb-0.5">
          {label}
        </Text>
        {detail ? (
          <Text className="font-outfit text-xs text-secondary opacity-60 uppercase tracking-wider">
            {detail}
          </Text>
        ) : null}
      </View>
      <ChevronRight size={18} color={colors.textSecondary} strokeWidth={3} opacity={0.3} />
    </Pressable>
  );
}
