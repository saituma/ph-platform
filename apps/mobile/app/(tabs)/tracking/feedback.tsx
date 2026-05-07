import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  Platform,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  Smile,
  Save,
  CheckCircle2,
  MessageSquare,
  Activity,
  Heart,
} from "lucide-react-native";

import { useRunStore } from "../../../store/useRunStore";
import { updateRunFeedback } from "../../../lib/sqliteRuns";
import { pushRunsToCloud } from "../../../lib/runSync";

import { EffortSelector } from "../../../components/tracking/EffortSelector";
import {
  FeelTagSelector,
  FEEL_TAGS,
} from "../../../components/tracking/FeelTagSelector";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { Text as ScaledText } from "@/components/ScaledText";
import { trackingScrollBottomPad } from "../../../lib/tracking/mainTabBarInset";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppToast } from "@/hooks/useAppToast";

export default function FeedbackScreen() {
  const router = useRouter();
  const insets = useAppSafeAreaInsets();
  const toast = useAppToast();
  const p = useAdminPastel();
  const {
    status,
    resetRun,
    currentRunId,
  } = useRunStore();

  useEffect(() => {
    if (status !== "stopped") {
      router.replace("/(tabs)/tracking" as any);
    }
  }, [status, router]);

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
    if (effort === null || !currentRunId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      updateRunFeedback(currentRunId, {
        effort_level: effort * 2,
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
      toast.error("Error", "Could not save run data.");
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

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
      <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <Animated.ScrollView
            bounces={true}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 40,
              paddingBottom: trackingScrollBottomPad(insets),
            }}
            style={animatedScreenStyle}
          >
          {/* Header */}
          <View style={{ alignItems: "center", marginBottom: 40 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: p.accentSoft, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Smile size={32} color={p.accent} strokeWidth={2.5} />
            </View>
            <ScaledText
              style={{
                fontFamily: "Outfit-Bold",
                fontSize: 34,
                color: p.textPrimary,
                textAlign: "center",
                letterSpacing: -0.5,
              }}
            >
              How did it go?
            </ScaledText>
            <ScaledText
              style={{
                fontFamily: "Outfit-Regular",
                fontSize: 15,
                color: p.textSecondary,
                marginTop: 6,
              }}
            >
              Rate your effort and how you felt
            </ScaledText>
          </View>

          {/* Effort Level card */}
          <View
            style={{
              backgroundColor: p.cardWhite,
              borderRadius: 22,
              padding: 24,
              marginBottom: 24,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <Activity size={18} color={p.accent} strokeWidth={2.5} />
              <ScaledText style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: p.textSecondary, letterSpacing: 2 }}>
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
              backgroundColor: p.cardWhite,
              borderRadius: 22,
              padding: 24,
              marginBottom: 24,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <Heart size={18} color={p.accent} strokeWidth={2.5} />
              <ScaledText style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: p.textSecondary, letterSpacing: 2 }}>
                HOW DID YOU FEEL?
              </ScaledText>
            </View>
            <FeelTagSelector selectedKeys={selectedTags} onToggle={toggleTag} />
          </View>

          {/* Notes card */}
          <View
            style={{
              backgroundColor: p.cardWhite,
              borderRadius: 22,
              padding: 24,
              marginBottom: 40,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <MessageSquare size={18} color={p.textSecondary} strokeWidth={2.5} />
                <ScaledText style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: p.textSecondary, letterSpacing: 2 }}>
                  NOTES
                </ScaledText>
              </View>
              <ScaledText style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: p.textMuted }}>
                {notes.length} / 200
              </ScaledText>
            </View>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="What was on your mind today?"
              placeholderTextColor={p.textMuted}
              multiline
              maxLength={200}
              textAlignVertical="top"
              style={{
                backgroundColor: p.inputBg,
                borderColor: isFocused ? p.accent : p.divider,
                borderWidth: 1,
                borderRadius: 16,
                padding: 16,
                minHeight: 120,
                fontFamily: "Outfit-Regular",
                fontSize: 15,
                color: p.textPrimary,
              }}
            />
          </View>

          {/* Save button */}
          <GestureDetector gesture={
            Gesture.Tap()
              .enabled(effort !== null)
              .onBegin(() => {
                'worklet';
                scaleSaveBtn.value = withSpring(0.96, { damping: 15, stiffness: 400, mass: 0.3 });
                runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
              })
              .onFinalize(() => {
                'worklet';
                scaleSaveBtn.value = withSpring(1, { damping: 20, stiffness: 300, mass: 0.4 });
              })
              .onEnd(() => {
                'worklet';
                runOnJS(handleSave)();
              })
          }>
            <Animated.View
              style={[
                animatedSaveBtnStyle,
                {
                  width: "100%",
                  height: 72,
                  backgroundColor: p.accent,
                  borderRadius: 100,
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 12,
                  opacity: effort === null ? 0.4 : 1,
                },
              ]}
            >
              <Save size={22} color={p.buttonPrimaryText} strokeWidth={2.5} />
              <ScaledText style={{ fontFamily: "Outfit-Bold", fontSize: 20, color: p.buttonPrimaryText }}>
                SAVE WORKOUT
              </ScaledText>
            </Animated.View>
          </GestureDetector>
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
              backgroundColor: p.cardWhite,
              borderRadius: 22,
              padding: 16,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: 12,
              zIndex: 999,
            },
          ]}
        >
          <CheckCircle2 size={22} color={p.accent} strokeWidth={2.5} />
          <ScaledText
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: 16,
              color: p.textPrimary,
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
