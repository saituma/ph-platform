import React from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { ProgramSectionContent, ExerciseMetadata } from "@/types/programs";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { Image as ExpoImage } from "expo-image";
import { Transition } from "@/components/navigation/TransitionStack";

interface Props {
  content: ProgramSectionContent[];
  isLoading: boolean;
  error: string | null;
  expandedIds: Set<number>;
  onToggle: (id: number) => void;
  onVideoPress: (url: string) => void;
  onMessageCoach: (draft: string) => void;
  onUploadPress: (item: ProgramSectionContent) => void;
  onNavigate?: (path: string) => void;
  activeTab: string;
  programTitle: string;
}

export function AdminProgramContentList({
  content,
  isLoading,
  error,
  expandedIds,
  onToggle,
  onVideoPress,
  onMessageCoach,
  onUploadPress,
  onNavigate,
  activeTab,
  programTitle,
}: Props) {
  const { colors, isDark } = useAppTheme();
  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
  const mutedSurface = isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9";

  if (content.length === 0 && !isLoading) {
    return (
      <View className="py-10 items-center justify-center">
        <Text className="text-sm font-outfit text-secondary text-center">
          No training content available for this section.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-3">
      {isLoading && content.length === 0 ? (
        <View className="py-5 items-center justify-center">
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : null}
      {error ? (
        <View className="rounded-2xl bg-red-500/10 px-5 py-4">
          <Text className="text-sm font-outfit text-red-500 text-center">{error}</Text>
        </View>
      ) : null}
      {content.map((item) => {
        const meta = (item.metadata ?? {}) as ExerciseMetadata;
        const isExpanded = expandedIds.has(item.id);
        const hasExercise = !!(meta.sets || meta.reps || meta.duration || meta.restSeconds);

        return (
          <View
            key={`content-${item.id}`}
            className="rounded-[24px] overflow-hidden border"
            style={{
              backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
              borderColor: borderSoft,
              ...(isDark ? Shadows.none : Shadows.sm),
            }}
          >
            <Pressable onPress={() => onToggle(item.id)} className="px-5 py-4">
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-[17px] font-clash font-bold" style={{ color: colors.text }}>
                    {item.title}
                  </Text>
                  {meta.category && (
                    <Text className="text-[12px] font-outfit text-secondary mt-0.5">
                      {meta.category}
                    </Text>
                  )}
                </View>
                <View
                  className="h-8 w-8 rounded-full items-center justify-center"
                  style={{ backgroundColor: mutedSurface }}
                >
                  <Feather
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={colors.textSecondary}
                  />
                </View>
              </View>

              {hasExercise && (
                <View className="flex-row flex-wrap gap-1.5 mt-3 pt-3 border-t" style={{ borderColor: borderSoft }}>
                  {[
                    meta.sets != null ? `${meta.sets} sets` : null,
                    meta.reps != null ? `${meta.reps} reps` : null,
                    meta.duration != null ? `${meta.duration}s` : null,
                    meta.restSeconds != null ? `${meta.restSeconds}s rest` : null,
                  ]
                    .filter(Boolean)
                    .map((stat, i) => (
                      <View
                        key={i}
                        className="rounded-md px-2 py-1"
                        style={{
                          backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
                        }}
                      >
                        <Text className="text-[11px] font-outfit font-medium" style={{ color: colors.textSecondary }}>
                          {stat}
                        </Text>
                      </View>
                    ))}
                </View>
              )}
            </Pressable>

            {isExpanded && (
              <View
                className="px-5 pb-5 gap-5 border-t"
                style={{
                  borderColor: borderSoft,
                  backgroundColor: isDark ? "rgba(0,0,0,0.1)" : "#F8FAFC",
                }}
              >
                {item.body ? (
                  <View className="pt-4">
                    <MarkdownText
                      text={item.body}
                      baseStyle={{ fontSize: 14, lineHeight: 22, color: colors.text }}
                    />
                  </View>
                ) : (
                  <View className="pt-2" />
                )}

                {meta.cues ? (
                  <View
                    className="rounded-2xl p-4 gap-2 border"
                    style={{ backgroundColor: colors.background, borderColor: borderSoft }}
                  >
                    <View className="flex-row items-center gap-1.5">
                      <Feather name="info" size={14} color={colors.accent} />
                      <Text className="text-[11px] font-outfit uppercase tracking-[1px] font-bold" style={{ color: colors.accent }}>
                        Coaching Cues
                      </Text>
                    </View>
                    <Text className="text-[14px] font-outfit" style={{ color: colors.text }}>{meta.cues}</Text>
                  </View>
                ) : null}

                <View className="flex-row gap-2 mt-1">
                  {item.videoUrl ? (
                    <Pressable
                      onPress={() => onVideoPress(item.videoUrl!)}
                      className="flex-1 rounded-2xl py-3 flex-row items-center justify-center gap-2"
                      style={{ backgroundColor: colors.accent }}
                    >
                      <Feather name="play-circle" size={16} color="#FFFFFF" />
                      <Text className="text-sm font-outfit font-bold text-white">Watch</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={() => onMessageCoach(`Program: ${programTitle}\nSection: ${activeTab}\nDrill: ${item.title}\n\nHi coach, quick question:\n`)}
                    className="flex-1 rounded-2xl py-3 flex-row items-center justify-center gap-2 border"
                    style={{ borderColor: borderSoft, backgroundColor: colors.background }}
                  >
                    <Feather name="message-circle" size={16} color={colors.text} />
                    <Text className="text-sm font-outfit font-semibold" style={{ color: colors.text }}>Ask coach</Text>
                  </Pressable>
                  {item.allowVideoUpload ? (
                    <Pressable
                      onPress={() => onUploadPress(item)}
                      className="flex-1 rounded-2xl py-3 flex-row items-center justify-center gap-2 border"
                      style={{
                        borderColor: colors.accent,
                        backgroundColor: isDark ? "rgba(34,197,94,0.08)" : "#F0FDF4",
                      }}
                    >
                      <Feather name="video" size={16} color={colors.accent} />
                      <Text className="text-sm font-outfit font-semibold" style={{ color: colors.accent }}>Send video</Text>
                    </Pressable>
                  ) : null}
                </View>

                <Transition.Pressable
                  sharedBoundTag={`program-content-${item.id}`}
                  onPress={() => onNavigate?.(`/programs/content/${item.id}?sharedBoundTag=${encodeURIComponent(`program-content-${item.id}`)}`)}
                  className="py-2 items-center"
                >
                  <Text className="text-xs font-outfit font-semibold" style={{ color: colors.accent }}>Open full page</Text>
                </Transition.Pressable>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
