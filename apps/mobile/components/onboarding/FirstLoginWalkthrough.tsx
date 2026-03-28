import React, { useCallback, useState } from "react";
import { InteractionManager, Modal, Pressable, View } from "react-native";
import Animated, { Easing, FadeIn, FadeOut, SlideInRight, SlideOutLeft } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";

const WALKTHROUGH_KEY = "ph-app:walkthrough-seen";

type Step = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    icon: "home",
    iconColor: "#22C55E",
    title: "Your dashboard",
    body: "Your hub for training updates, coach stories, and what to do next — all in one place.",
  },
  {
    icon: "pulse",
    iconColor: "#3B82F6",
    title: "Your Programs",
    body: "Find your training plan here. Each program has warm-ups, exercises with video demos, and cooldowns ready to go.",
  },
  {
    icon: "chatbox-ellipses",
    iconColor: "#8B5CF6",
    title: "Message Your Coach",
    body: "Send your coach a text, photo, or video any time. Premium members get priority replies.",
  },
  {
    icon: "calendar",
    iconColor: "#F59E0B",
    title: "Book Sessions",
    body: "Pick a session type, choose a day, and request a time. Your coach confirms it and you're all set.",
  },
  {
    icon: "menu",
    iconColor: "#EF4444",
    title: "More Options",
    body: "Update your profile, check notifications, access parent education, upload training videos, and more.",
  },
];

export function FirstLoginWalkthrough() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  React.useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      void (async () => {
        const seen = await AsyncStorage.getItem(WALKTHROUGH_KEY);
        if (!seen) setVisible(true);
      })();
    });
    return () => task?.cancel?.();
  }, []);

  const dismiss = useCallback(async () => {
    await AsyncStorage.setItem(WALKTHROUGH_KEY, "1");
    setVisible(false);
  }, []);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((prev) => prev + 1);
    } else {
      void dismiss();
    }
  }, [dismiss, step]);

  const skip = useCallback(() => {
    void dismiss();
  }, [dismiss]);

  if (!visible) return null;

  const current = STEPS[step];

  const footerPad = Math.max(insets.bottom, 12) + 16;

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View
        entering={FadeIn}
        exiting={FadeOut}
        className="flex-1"
        style={{
          backgroundColor: isDark ? "rgba(0,0,0,0.88)" : "rgba(15,23,42,0.72)",
          paddingTop: insets.top + 10,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 10,
        }}
      >
        <Animated.View
          key={step}
          entering={SlideInRight.duration(280).easing(Easing.out(Easing.cubic))}
          exiting={SlideOutLeft.duration(200)}
          className="flex-1 rounded-[28px] overflow-hidden border"
          style={{
            backgroundColor: colors.card,
            borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)",
          }}
        >
          <View className="flex-1 items-center justify-center px-7 pt-6 pb-4">
            <View
              className="h-[88px] w-[88px] rounded-[30px] items-center justify-center mb-7"
              style={{ backgroundColor: `${current.iconColor}18` }}
            >
              <Ionicons name={current.icon} size={42} color={current.iconColor} />
            </View>

            <Text className="text-3xl font-clash font-bold text-app text-center mb-4 px-1">
              {current.title}
            </Text>
            <Text className="text-lg font-outfit text-secondary text-center leading-relaxed px-1">
              {current.body}
            </Text>

            <View className="flex-row items-center justify-center gap-2.5 mt-8">
              {STEPS.map((_, i) => (
                <View
                  key={i}
                  className="rounded-full"
                  style={{
                    width: i === step ? 28 : 9,
                    height: 9,
                    backgroundColor:
                      i === step ? colors.accent : isDark ? "rgba(255,255,255,0.15)" : "rgba(15,23,42,0.12)",
                  }}
                />
              ))}
            </View>
          </View>

          <View className="gap-3 px-5 pt-2" style={{ paddingBottom: footerPad }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Skip walkthrough"
              onPress={skip}
              className="w-full rounded-2xl items-center justify-center border-2 active:opacity-80"
              style={{
                minHeight: 56,
                paddingVertical: 16,
                borderColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(15,23,42,0.12)",
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
              }}
            >
              <Text className="text-lg font-outfit font-semibold text-secondary">Skip</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={step === STEPS.length - 1 ? "Get started" : "Next step"}
              onPress={next}
              className="w-full rounded-2xl items-center justify-center active:opacity-90"
              style={{
                minHeight: 60,
                paddingVertical: 18,
                backgroundColor: colors.accent,
              }}
            >
              <Text className="text-lg font-outfit font-bold text-white">
                {step === STEPS.length - 1 ? "Get Started" : "Next"}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
