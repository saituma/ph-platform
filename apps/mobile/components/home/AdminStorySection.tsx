import React from "react";
import { Image, View, useWindowDimensions } from "react-native";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows, radius, spacing } from "@/constants/theme";
import { Text } from "@/components/ScaledText";
import { SkeletonBox } from "@/components/ui/Skeleton";

type AdminStorySectionProps = {
  story?: string | null;
  photoUrl?: string | null;
  loading?: boolean;
};

export function AdminStorySection({ story, photoUrl, loading }: AdminStorySectionProps) {
  const { colors, isDark } = useAppTheme();
  const { width } = useWindowDimensions();
  const photo = photoUrl?.trim() || "";
  const storyText = story?.trim() || "";

  if (!storyText && !photo && !loading) {
    return null;
  }

  const cardW = width - 40;

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700", paddingHorizontal: 2 }}>
        Coach story
      </Text>

      {loading ? (
        <View style={{ gap: spacing.sm }}>
          <SkeletonBox width={cardW} height={160} borderRadius={20} />
          <View style={{ gap: spacing.xs, paddingHorizontal: 4 }}>
            <SkeletonBox width="60%" height={18} borderRadius={4} />
            <SkeletonBox width="85%" height={13} borderRadius={4} />
            <SkeletonBox width="70%" height={13} borderRadius={4} />
          </View>
        </View>
      ) : (
        <View
          className="overflow-hidden border"
          style={{
            borderRadius: radius.xxl,
            backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
            ...(isDark ? Shadows.none : Shadows.md),
          }}
        >
          {photo ? (
            <View className="relative">
              <Image
                source={{ uri: photo }}
                resizeMode="cover"
                style={{ width: "100%", aspectRatio: 16 / 9 }}
              />
            </View>
          ) : null}

          {storyText ? (
            <View style={{ padding: spacing.xl }}>
              <MarkdownText
                text={storyText}
                baseStyle={{ fontSize: 15, lineHeight: 24, color: isDark ? "#CBD5E1" : "#475569" }}
                headingStyle={{ fontSize: 18, lineHeight: 26, color: colors.text, fontWeight: "700", marginTop: 12 }}
                subheadingStyle={{ fontSize: 16, lineHeight: 24, color: colors.text, fontWeight: "700", marginTop: 8 }}
                listItemStyle={{ paddingLeft: 6 }}
              />
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}
