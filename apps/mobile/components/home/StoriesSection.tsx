import React from "react";
import { Image, ScrollView, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/ScaledText";
import { Feather } from "@/components/ui/theme-icons";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";

type StoryItem = {
  id: string;
  name: string;
  imageUrl?: string | null;
  mediaUrl?: string | null;
  mediaType?: "image" | "video";
  isAdd?: boolean;
  isSeen?: boolean;
  badge?: string | null;
};

type StoriesSectionProps = {
  items?: StoryItem[];
  onPressStory?: (item: StoryItem) => void;
};

const fallbackStories: StoryItem[] = [
  { id: "coach", name: "Coach Tips", badge: "New", mediaType: "video" },
  { id: "week", name: "Weekly Wins", badge: "3", mediaType: "image" },
  { id: "mobility", name: "Mobility", isSeen: true, mediaType: "image" },
  { id: "speed", name: "Speed Lab", isSeen: true, mediaType: "video" },
];

export function StoriesSection({ items, onPressStory }: StoriesSectionProps) {
  const { colors, isDark } = useAppTheme();
  const stories = items ?? fallbackStories;
  if (!stories.length) return null;

  return (
    <View className="mb-10">
      <View className="flex-row items-end justify-between mb-4">
        <View>
          <Text className="text-2xl font-bold font-clash text-app tracking-tight">
            Stories
          </Text>
          <Text className="text-secondary font-outfit text-sm mt-1">
            Quick hits from your program
          </Text>
        </View>
        <View className="px-3 py-1 rounded-full border border-app/10">
          <Text className="text-[11px] font-outfit text-secondary uppercase tracking-[2px]">
            Tap to view
          </Text>
        </View>
      </View>

      <View
        className="rounded-[28px] border border-app/10 bg-card/80 px-4 py-4"
        style={isDark ? Shadows.none : Shadows.sm}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 16, paddingRight: 10 }}
        >
          {stories.map((story) => (
            <TouchableOpacity
              key={story.id}
              activeOpacity={0.8}
              onPress={() => onPressStory?.(story)}
            >
              <View className="items-center">
                <View
                  style={[
                    {
                      padding: 3,
                      borderRadius: 999,
                      borderWidth: story.isAdd ? 1 : 2,
                      borderColor: story.isSeen
                        ? isDark
                          ? "rgba(148,163,184,0.3)"
                          : "rgba(15,23,42,0.12)"
                        : colors.accent,
                      backgroundColor: story.isAdd
                        ? isDark
                          ? "rgba(255,255,255,0.03)"
                          : "rgba(15,23,42,0.04)"
                        : "transparent",
                    },
                  ]}
                >
                  <View
                    className="h-[72px] w-[72px] rounded-full items-center justify-center overflow-hidden"
                    style={{
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(34,197,94,0.08)",
                      ...(isDark ? Shadows.none : Shadows.sm),
                    }}
                  >
                    {story.imageUrl ? (
                      <Image
                        source={{ uri: story.imageUrl }}
                        resizeMode="cover"
                        className="h-full w-full"
                      />
                    ) : story.isAdd ? (
                      <Feather name="plus" size={22} color={colors.accent} />
                    ) : story.mediaType === "video" ? (
                      <View className="items-center gap-1">
                        <Feather name="play" size={18} color={colors.accent} />
                        <Text className="text-[10px] font-outfit text-secondary">
                          VIDEO
                        </Text>
                      </View>
                    ) : (
                      <Text className="text-lg font-bold font-clash text-app">
                        {story.name
                          .split(" ")
                          .map((word) => word[0])
                          .join("")
                          .slice(0, 2)}
                      </Text>
                    )}

                    {story.isAdd ? (
                      <View
                        className="absolute bottom-0 right-0 h-6 w-6 rounded-full items-center justify-center"
                        style={{
                          backgroundColor: colors.accent,
                          borderWidth: 2,
                          borderColor: isDark ? colors.background : "#fff",
                        }}
                      >
                        <Feather name="plus" size={12} color="#ffffff" />
                      </View>
                    ) : null}
                  </View>
                </View>

                <View className="mt-3 items-center">
                  <Text className="text-xs font-outfit text-app">
                    {story.isAdd ? "Add" : story.name}
                  </Text>
                  {story.badge ? (
                    <View
                      className="mt-1 px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: story.isSeen
                          ? isDark
                            ? "rgba(148,163,184,0.15)"
                            : "rgba(15,23,42,0.08)"
                          : colors.accent,
                      }}
                    >
                      <Text
                        className="text-[10px] font-outfit text-white uppercase tracking-[1px]"
                        style={{ color: story.isSeen ? colors.textSecondary : "#ffffff" }}
                      >
                        {story.badge}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
