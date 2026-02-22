import React from "react";
import { Image, View } from "react-native";
import { Text } from "@/components/ScaledText";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";

type AdminStorySectionProps = {
  story?: string | null;
  photoUrl?: string | null;
};

export function AdminStorySection({ story, photoUrl }: AdminStorySectionProps) {
  const { isDark } = useAppTheme();
  const photo = photoUrl?.trim() || "";
  const storyText = story?.trim() || "";

  if (!storyText && !photo) {
    return null;
  }

  return (
    <View className="gap-4">
      <View className="flex-row justify-between items-end px-6">
        <View>
          <Text className="text-2xl font-bold font-clash text-app tracking-tight">
            Coach Story
          </Text>
          <Text className="text-secondary font-outfit text-sm mt-1">
            The mission behind the program
          </Text>
        </View>
      </View>

      {photo ? (
        <View className="px-6">
          <View 
            className="w-full overflow-hidden rounded-[32px] bg-secondary"
            style={isDark ? Shadows.none : Shadows.lg}
          >
            <Image
              source={{ uri: photo }}
              resizeMode="cover"
              style={{ width: "100%", aspectRatio: 4 / 5 }}
            />
          </View>
        </View>
      ) : null}

      {storyText ? (
        <View 
          className="mx-6 bg-card rounded-[32px] p-6"
          style={isDark ? Shadows.none : Shadows.md}
        >
          <MarkdownText
            text={storyText}
            baseStyle={{ fontSize: 14, lineHeight: 22, color: "#64748B" }}
            headingStyle={{ fontSize: 18, lineHeight: 24, color: "#0F172A", fontWeight: "700" }}
            subheadingStyle={{ fontSize: 16, lineHeight: 22, color: "#0F172A", fontWeight: "700" }}
            listItemStyle={{ paddingLeft: 6 }}
          />
        </View>
      ) : null}
    </View>
  );
}
