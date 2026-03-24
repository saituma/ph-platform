import React from "react";
import { Image, View, TouchableOpacity } from "react-native";
import { Text } from "@/components/ScaledText";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";

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
      <View className="flex-row items-center gap-2 mb-4">
        <View className="h-1.5 w-1.5 rounded-full bg-accent" />
        <Text className="text-[11px] font-outfit font-bold text-secondary uppercase tracking-[2px]">Coach's Corner</Text>
      </View>

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
            <View 
              className="absolute bottom-4 left-4 rounded-full px-3 py-1.5 backdrop-blur-md"
              style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
            >
              <Text className="text-[10px] font-outfit font-bold text-white uppercase tracking-wider">Lead Coach</Text>
            </View>
          </View>
        ) : null}

        <View className="p-6">
          <Text className="text-2xl font-clash font-bold text-app mb-3 leading-tight">
            The mission behind PHP
          </Text>
          
          {storyText ? (
            <View>
              <MarkdownText
                text={storyText}
                baseStyle={{ fontSize: 15, lineHeight: 24, color: isDark ? "#94A3B8" : "#475569" }}
                headingStyle={{ fontSize: 18, lineHeight: 26, color: colors.text, fontWeight: "700", marginTop: 12 }}
                subheadingStyle={{ fontSize: 16, lineHeight: 24, color: colors.text, fontWeight: "700", marginTop: 8 }}
                listItemStyle={{ paddingLeft: 6 }}
              />
            </View>
          ) : null}

          <TouchableOpacity 
            className="mt-6 flex-row items-center gap-2"
            activeOpacity={0.7}
          >
            <Text className="text-sm font-outfit font-bold text-accent">Read full story</Text>
            <Feather name="arrow-right" size={14} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
