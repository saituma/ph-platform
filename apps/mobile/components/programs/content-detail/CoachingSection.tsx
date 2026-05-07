import React from "react";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { Shadows } from "@/constants/theme";
import { ExerciseMetadata } from "../../../hooks/programs/useContentDetail";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { MarkdownText } from "@/components/ui/MarkdownText";

interface CoachingSectionProps {
  meta: ExerciseMetadata;
}

export function CoachingSection({ meta }: CoachingSectionProps) {
  const p = useAdminPastel();

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
        backgroundColor: p.cardWhite,
        borderColor: p.divider,
        ...Shadows.sm,
      }}
    >
      <View className="flex-row items-center gap-3">
        <View
          className="h-9 w-9 rounded-full items-center justify-center"
          style={{ backgroundColor: p.inputBg }}
        >
          <Feather name={icon} size={16} color={p.accent} />
        </View>
        <Text
          className="text-[12px] font-outfit uppercase tracking-[1.6px] font-bold"
          style={{ color: p.textSecondary }}
        >
          {title}
        </Text>
      </View>

      <MarkdownText
        text={body}
        baseStyle={{
          fontSize: 15,
          lineHeight: 24,
          color: p.textPrimary,
        }}
        headingStyle={{
          fontSize: 16,
          lineHeight: 24,
          color: p.textPrimary,
          fontWeight: "700",
        }}
        subheadingStyle={{
          fontSize: 15,
          lineHeight: 22,
          color: p.textPrimary,
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
