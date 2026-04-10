import React from "react";
import { View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import {
  VideoItem,
  CoachResponse,
  OptimisticUpload,
} from "@/types/video-upload";
import { ProgramPanelStatusBadge } from "./shared/ProgramPanelStatusBadge";
import { UICard, UIEmptyState } from "@/components/ui/hero";

interface Props {
  videoItems: VideoItem[];
  optimisticUploads: OptimisticUpload[];
  coachResponsesByUploadId: Map<string, CoachResponse[]>;
  onVideoPress: (uri: string, title?: string) => void;
  formatDate: (d: string) => string;
}

export function VideoHistoryList({
  videoItems,
  optimisticUploads,
  coachResponsesByUploadId,
  onVideoPress,
  formatDate,
}: Props) {
  const { colors, isDark } = useAppTheme();

  const allItems = [...videoItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  if (allItems.length === 0 && optimisticUploads.length === 0) {
    return (
      <UIEmptyState
        title="No videos yet"
        description="Record your first rep to get started."
      />
    );
  }

  return (
    <View className="gap-4 px-5">
      {optimisticUploads
        .filter((u) => u.progress < 1)
        .map((u) => (
          <UICard key={u.id} className="p-4 opacity-60">
            <View className="flex-row justify-between items-center">
              <Text className="font-outfit text-sm text-secondary">
                Uploading {u.fileName}...
              </Text>
              <Text className="font-outfit text-xs text-accent">
                {Math.round(u.progress * 100)}%
              </Text>
            </View>
          </UICard>
        ))}

      {allItems.map((item) => {
        const responses = coachResponsesByUploadId.get(String(item.id)) ?? [];
        return (
          <UICard key={item.id} className="p-0 overflow-hidden">
            <Pressable
              onPress={() =>
                onVideoPress(
                  item.videoUrl,
                  `Upload ${formatDate(item.createdAt)}`,
                )
              }
              className="p-4"
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="font-clash text-lg text-app">
                    Upload {formatDate(item.createdAt)}
                  </Text>
                  {item.notes && (
                    <Text
                      className="mt-1 font-outfit text-sm text-secondary"
                      numberOfLines={2}
                    >
                      Note: {item.notes}
                    </Text>
                  )}
                </View>
                <ProgramPanelStatusBadge
                  label={item.feedback ? "Reviewed" : "Awaiting"}
                  variant={item.feedback ? "success" : "default"}
                />
              </View>

              {item.feedback && (
                <View className="mt-4 p-3 bg-accent/5 rounded-2xl border border-accent/10">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Feather
                      name="message-square"
                      size={14}
                      color={colors.accent}
                    />
                    <Text className="font-outfit font-bold text-[11px] uppercase text-accent">
                      Coach Feedback
                    </Text>
                  </View>
                  <Text className="font-outfit text-sm text-app">
                    {item.feedback}
                  </Text>
                </View>
              )}

              {responses.map((res) => (
                <Pressable
                  key={res.id}
                  onPress={() => onVideoPress(res.mediaUrl, "Coach Response")}
                  className="mt-3 p-3 bg-secondary/5 rounded-2xl border border-secondary/10 flex-row items-center gap-3"
                >
                  <View className="h-10 w-10 rounded-full bg-accent items-center justify-center">
                    <Feather name="play" size={16} color="white" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-outfit font-bold text-xs text-app">
                      Video Response
                    </Text>
                    {res.text && (
                      <Text
                        className="font-outfit text-xs text-secondary"
                        numberOfLines={1}
                      >
                        {res.text}
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </Pressable>
          </UICard>
        );
      })}
    </View>
  );
}
