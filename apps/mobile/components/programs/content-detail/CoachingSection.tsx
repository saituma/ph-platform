import React from "react";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { Shadows } from "@/constants/theme";
import { ExerciseMetadata } from "../../../hooks/programs/useContentDetail";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { MarkdownText } from "@/components/ui/MarkdownText";

interface CoachingSectionProps {
  meta: ExerciseMetadata;
}

export function CoachingSection({ meta }: CoachingSectionProps) {
  const { colors, isDark } = useAppTheme();
  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
  const mutedSurface = isDark
    ? "rgba(255,255,255,0.06)"
    : "rgba(15,23,42,0.04)";

  const Card = ({
    icon,
    title,
    body,
  }: {
    icon: React.ComponentProps<typeof Feather>["name"];
    title: string;
    body: string;
  }) => (
    <View
      className="rounded-[28px] border px-6 py-5 gap-3"
      style={{
        backgroundColor: colors.card,
        borderColor: borderSoft,
        ...(isDark ? Shadows.none : Shadows.sm),
      }}
    >
      <View className="flex-row items-center gap-3">
        <View
          className="h-9 w-9 rounded-full items-center justify-center"
          style={{ backgroundColor: mutedSurface }}
        >
          <Feather name={icon} size={16} color={colors.accent} />
        </View>
        <Text
          className="text-[12px] font-outfit uppercase tracking-[1.6px] font-bold"
          style={{ color: colors.textSecondary }}
        >
          {title}
        </Text>
      </View>

      <MarkdownText
        text={body}
        baseStyle={{
          fontSize: 15,
          lineHeight: 24,
          color: colors.text,
        }}
        headingStyle={{
          fontSize: 16,
          lineHeight: 24,
          color: colors.text,
          fontWeight: "700",
        }}
        subheadingStyle={{
          fontSize: 15,
          lineHeight: 22,
          color: colors.text,
          fontWeight: "700",
        }}
        listItemStyle={{ paddingLeft: 6 }}
      />
    </View>
  );

  return (
    <>
      {meta.cues ? (
        <Card icon="message-circle" title="Coaching cues" body={meta.cues} />
      ) : null}

      {meta.steps ? <Card icon="list" title="Steps" body={meta.steps} /> : null}

      {meta.progression ? (
        <Card icon="trending-up" title="Progression" body={meta.progression} />
      ) : null}

      {meta.regression ? (
        <Card icon="trending-down" title="Regression" body={meta.regression} />
      ) : null}
    </>
  );
}
