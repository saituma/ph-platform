import React, { useCallback, useState } from "react";
import { Dimensions, Modal, Pressable, View } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";

const WALKTHROUGH_KEY = "ph-app:walkthrough-seen";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  React.useEffect(() => {
    (async () => {
      const seen = await AsyncStorage.getItem(WALKTHROUGH_KEY);
      if (!seen) setVisible(true);
    })();
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

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View
        entering={FadeIn}
        exiting={FadeOut}
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: isDark ? "rgba(0,0,0,0.85)" : "rgba(15,23,42,0.7)" }}
      >
        <Animated.View
          key={step}
          entering={SlideInRight.springify().damping(20)}
          exiting={SlideOutLeft.duration(200)}
          className="w-full max-w-[360px] rounded-[32px] overflow-hidden border"
          style={{
            backgroundColor: colors.card,
            borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)",
          }}
        >
          <View className="items-center pt-10 pb-6 px-8">
            <View
              className="h-20 w-20 rounded-[28px] items-center justify-center mb-6"
              style={{ backgroundColor: `${current.iconColor}18` }}
            >
              <Ionicons name={current.icon} size={36} color={current.iconColor} />
            </View>

            <Text className="text-2xl font-clash font-bold text-app text-center mb-3">
              {current.title}
            </Text>
            <Text className="text-base font-outfit text-secondary text-center leading-relaxed">
              {current.body}
            </Text>
          </View>

          <View className="flex-row items-center justify-center gap-2 mb-5">
            {STEPS.map((_, i) => (
              <View
                key={i}
                className="rounded-full"
                style={{
                  width: i === step ? 24 : 8,
                  height: 8,
                  backgroundColor: i === step ? colors.accent : (isDark ? "rgba(255,255,255,0.15)" : "rgba(15,23,42,0.1)"),
                }}
              />
            ))}
          </View>

          <View className="flex-row gap-3 px-6 pb-8">
            <Pressable
              onPress={skip}
              className="flex-1 rounded-full py-3.5 items-center border"
              style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)" }}
            >
              <Text className="text-sm font-outfit font-semibold text-secondary">Skip</Text>
            </Pressable>
            <Pressable
              onPress={next}
              className="flex-1 rounded-full py-3.5 items-center"
              style={{ backgroundColor: colors.accent }}
            >
              <Text className="text-sm font-outfit font-semibold text-white">
                {step === STEPS.length - 1 ? "Get Started" : "Next"}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
