import React from "react";
import { Image, View } from "react-native";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";

type AdminStorySectionProps = {
  story?: string | null;
  photoUrl?: string | null;
};

export function AdminStorySection({ story, photoUrl }: AdminStorySectionProps) {
  const { colors, isDark } = useAppTheme();
  const photo = photoUrl?.trim() || "";
  const storyText = story?.trim() || "";

  if (!storyText && !photo) {
    return null;
  }

  return (
    <View>
      <View
        className="rounded-[32px] overflow-hidden border"
        style={{
          backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
          ...(isDark ? Shadows.none : Shadows.sm),
        }}
      >
        {photo ? (
          <View className="relative">
            <Image
              source={{ uri: photo }}
              resizeMode="cover"
              style={{ width: "100%", aspectRatio: 16 / 10 }}
            />
          </View>
        ) : null}

        {storyText ? (
          <View className="p-6">
            <MarkdownText
              text={storyText}
              baseStyle={{ fontSize: 15, lineHeight: 24, color: isDark ? "#94A3B8" : "#475569" }}
              headingStyle={{ fontSize: 18, lineHeight: 26, color: colors.text, fontWeight: "700", marginTop: 12 }}
              subheadingStyle={{ fontSize: 16, lineHeight: 24, color: colors.text, fontWeight: "700", marginTop: 8 }}
              listItemStyle={{ paddingLeft: 6 }}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}
