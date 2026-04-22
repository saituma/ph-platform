import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { 
  Smile, 
  Tag, 
  FileText, 
  Save, 
  CheckCircle2, 
  MessageSquare,
  Activity,
  Heart
} from "lucide-react-native";
import { fonts, radius, spacing } from "@/constants/theme";

import { useRunStore } from "../../../store/useRunStore";
import { saveRunRecord } from "../../../lib/sqliteRuns";
import { pushRunsToCloud } from "../../../lib/runSync";

import { EffortSelector } from "../../../components/tracking/EffortSelector";
import {
  FeelTagSelector,
  FEEL_TAGS,
} from "../../../components/tracking/FeelTagSelector";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text as ScaledText } from "@/components/ScaledText";
import { estimateCalories } from "../../../lib/tracking/runUtils";
import { trackingScrollBottomPad } from "../../../lib/tracking/mainTabBarInset";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function FeedbackScreen() {
  const router = useRouter();
  const insets = useAppSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const {
    distanceMeters,
    distanceOverrideMeters,
    elapsedSeconds,
    coordinates,
    resetRun,
    currentRunId,
  } = useRunStore();

  const [effort, setEffort] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);
  const toastTranslateY = useSharedValue(-100);
  const scaleSaveBtn = useSharedValue(1);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    translateY.value = withSpring(0, { damping: 20, stiffness: 150 });
  }, []);

  useEffect(() => {
    if (showToast) {
      toastTranslateY.value = withSpring(0, { damping: 15, stiffness: 200 });
      setTimeout(() => {
        toastTranslateY.value = withSpring(-100, {
          damping: 15,
          stiffness: 200,
        });
      }, 2500);
    }
  }, [showToast]);

  const toggleTag = (id: string) => {
    Haptics.selectionAsync();
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const handleSave = () => {
    if (effort === null) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const finalDistanceMeters =
        typeof distanceOverrideMeters === "number"
          ? distanceOverrideMeters
          : distanceMeters;
      const distanceKm = finalDistanceMeters / 1000;
      const avg_speed =
        distanceKm > 0 && elapsedSeconds > 0
          ? distanceKm / (elapsedSeconds / 3600)
          : 0;
      const avg_pace =
        distanceKm > 0 && elapsedSeconds > 0
          ? elapsedSeconds / 60 / distanceKm
          : 0;
      const calories = estimateCalories(finalDistanceMeters);

      const rpeEffort = effort * 2;

      saveRunRecord({
        id: currentRunId ?? Crypto.randomUUID(),
        date: new Date().toISOString(),
        distance_meters: finalDistanceMeters,
        duration_seconds: elapsedSeconds,
        avg_pace: Number.isNaN(avg_pace) || !isFinite(avg_pace) ? 0 : avg_pace,
        avg_speed:
          Number.isNaN(avg_speed) || !isFinite(avg_speed) ? 0 : avg_speed,
        calories,
        coordinates: JSON.stringify(coordinates),
        effort_level: rpeEffort,
        feel_tags: JSON.stringify(
          selectedTags
            .map((st) => FEEL_TAGS.find((t) => t.id === st)?.label)
            .filter(Boolean),
        ),
        notes,
      });

      pushRunsToCloud();

      setShowToast(true);
      setTimeout(() => {
        resetRun();
        router.replace("/(tabs)/tracking" as any);
      }, 1000);
    } catch (e) {
      console.error(e);
      Alert.alert("Error saving run");
    }
  };

  const animatedScreenStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
    flex: 1,
  }));

  const animatedToastStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toastTranslateY.value }],
  }));

  const animatedSaveBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleSaveBtn.value }],
  }));

  // Design Tokens
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  const cardBg = isDark ? colors.cardElevated : colors.background;
  const accentMuted = `${colors.accent}15`;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <Animated.ScrollView
            bounces={true}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: spacing.xl,
              paddingTop: 40,
              paddingBottom: trackingScrollBottomPad(insets),
            }}
            style={animatedScreenStyle}
          >
          {/* Header */}
          <View style={{ alignItems: "center", marginBottom: 40 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: accentMuted, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Smile size={32} color={colors.accent} strokeWidth={2.5} />
            </View>
            <ScaledText
              style={{
                fontFamily: fonts.accentBold,
                fontSize: 34,
                color: colors.textPrimary,
                textAlign: "center",
                letterSpacing: -0.5,
              }}
            >
              How did it go?
            </ScaledText>
            <ScaledText
              style={{
                fontFamily: fonts.bodyMedium,
                fontSize: 15,
                color: colors.textSecondary,
                marginTop: 6,
              }}
            >
              Rate your effort and how you felt
            </ScaledText>
          </View>

          {/* Effort Level card */}
          <View
            style={{
              backgroundColor: cardBg,
              borderColor: cardBorder,
              borderWidth: 1,
              borderRadius: radius.xxl,
              padding: 24,
              marginBottom: 24,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <Activity size={18} color={colors.purple} strokeWidth={2.5} />
              <ScaledText style={{ fontFamily: fonts.labelCaps, fontSize: 11, color: colors.textSecondary, letterSpacing: 2 }}>
                EFFORT LEVEL
              </ScaledText>
            </View>
            <EffortSelector
              value={effort ?? 0}
              onChange={(val) => {
                Haptics.selectionAsync();
                setEffort(val);
              }}
            />
          </View>

          {/* Feel Tags card */}
          <View
            style={{
              backgroundColor: cardBg,
              borderColor: cardBorder,
              borderWidth: 1,
              borderRadius: radius.xxl,
              padding: 24,
              marginBottom: 24,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <Heart size={18} color={colors.cyan} strokeWidth={2.5} />
              <ScaledText style={{ fontFamily: fonts.labelCaps, fontSize: 11, color: colors.textSecondary, letterSpacing: 2 }}>
                HOW DID YOU FEEL?
              </ScaledText>
            </View>
            <FeelTagSelector selectedKeys={selectedTags} onToggle={toggleTag} />
          </View>

          {/* Notes card */}
          <View
            style={{
              backgroundColor: cardBg,
              borderColor: cardBorder,
              borderWidth: 1,
              borderRadius: radius.xxl,
              padding: 24,
              marginBottom: 40,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <MessageSquare size={18} color={colors.textSecondary} strokeWidth={2.5} />
                <ScaledText style={{ fontFamily: fonts.labelCaps, fontSize: 11, color: colors.textSecondary, letterSpacing: 2 }}>
                  NOTES
                </ScaledText>
              </View>
              <ScaledText style={{ fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textDim }}>
                {notes.length} / 200
              </ScaledText>
            </View>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="What was on your mind today?"
              placeholderTextColor={colors.placeholder}
              multiline
              maxLength={200}
              textAlignVertical="top"
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
                borderColor: isFocused ? colors.accent : cardBorder,
                borderWidth: 1,
                borderRadius: radius.xl,
                padding: 16,
                minHeight: 120,
                fontFamily: fonts.bodyMedium,
                fontSize: 15,
                color: colors.text,
              }}
            />
          </View>

          {/* Save button */}
          <AnimatedPressable
            onPress={handleSave}
            onPressIn={() => effort !== null && (scaleSaveBtn.value = withSpring(0.96, { damping: 15, stiffness: 300 }))}
            onPressOut={() => effort !== null && (scaleSaveBtn.value = withSpring(1, { damping: 15, stiffness: 300 }))}
            disabled={effort === null}
            style={[
              animatedSaveBtnStyle,
              {
                width: "100%",
                height: 72,
                backgroundColor: colors.accent,
                borderRadius: radius.xxl,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: 12,
                opacity: effort === null ? 0.4 : 1,
                ...(isDark || effort === null ? {} : { shadowColor: colors.accent, shadowOpacity: 0.3, shadowRadius: 15, shadowOffset: { width: 0, height: 10 }, elevation: 8 }),
              },
            ]}
          >
            <Save size={22} color="#FFF" strokeWidth={2.5} />
            <ScaledText style={{ fontFamily: fonts.accentBold, fontSize: 20, color: "#FFF" }}>
              SAVE WORKOUT
            </ScaledText>
          </AnimatedPressable>
          </Animated.ScrollView>
        </KeyboardAvoidingView>

      {/* Success Toast */}
      {showToast && (
        <Animated.View
          style={[
            animatedToastStyle,
            {
              position: "absolute",
              top: insets.top + 10,
              left: 20,
              right: 20,
              backgroundColor: colors.cardElevated,
              borderColor: colors.accent,
              borderWidth: 1,
              borderRadius: radius.xl,
              padding: 16,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: 12,
              zIndex: 999,
              ...(isDark ? {} : { shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 }),
            },
          ]}
        >
          <CheckCircle2 size={22} color={colors.accent} strokeWidth={2.5} />
          <ScaledText
            style={{
              fontFamily: fonts.accentBold,
              fontSize: 16,
              color: colors.textPrimary,
            }}
          >
            Workout Saved!
          </ScaledText>
        </Animated.View>
      )}
      </SafeAreaView>
    </>
  );
}
