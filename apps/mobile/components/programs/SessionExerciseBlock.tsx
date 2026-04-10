import React from "react";
import { View, Pressable, Linking } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { SessionItem } from "@/hooks/programs/useSessionData";
import { VideoPlayer, isYoutubeUrl } from "@/components/media/VideoPlayer";

interface Props {
  title: string;
  items: SessionItem[];
  onUploadPress: (id: number, title: string) => void;
  hasUploaded: Record<number, boolean>;
  uploadsBySectionId: Record<number, any[]>;
  canUpload: boolean;
  completionAnchorItemId?: number;
  onCompleteSession?: () => void;
  completeSessionLabel?: string;
}

export function SessionExerciseBlock({
  title,
  items,
  onUploadPress,
  hasUploaded,
  uploadsBySectionId,
  canUpload,
  completionAnchorItemId,
  onCompleteSession,
  completeSessionLabel = "Complete Session",
}: Props) {
  const { colors, isDark } = useAppTheme();
  if (items.length === 0) return null;

  const isDirectVideoUrl = (url: string) =>
    /\.(mp4|mov|m4v|webm)(\?.*)?$/i.test(url) || /\.(m3u8)(\?.*)?$/i.test(url);

  const isKnownExternalHost = (url: string) => {
    const lower = url.toLowerCase();
    return (
      lower.includes("vimeo.com") ||
      lower.includes("streamable.com") ||
      lower.includes("drive.google.com")
    );
  };

  const externalLabelFor = (url: string) => {
    const lower = url.toLowerCase();
    if (lower.includes("vimeo.com")) return "Open in Vimeo";
    if (lower.includes("loom.com")) return "Open in Loom";
    if (lower.includes("streamable.com")) return "Open in Streamable";
    if (lower.includes("drive.google.com")) return "Open in Google Drive";
    return "Open Video";
  };

  return (
    <View className="mb-8">
      <Text className="text-sm font-outfit-bold text-accent uppercase tracking-widest mb-4">
        {title}
      </Text>
      <View className="gap-4">
        {items.map((item) => (
          <View
            key={item.id}
            className="rounded-3xl border p-4 bg-card"
            style={{
              borderColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.05)",
            }}
          >
            {item.videoUrl?.trim()
              ? (() => {
                  const url = item.videoUrl!.trim();
                  const lower = url.toLowerCase();
                  const canInline =
                    isYoutubeUrl(url) ||
                    lower.includes("loom.com") ||
                    isDirectVideoUrl(url);

                  if (canInline || !isKnownExternalHost(url)) {
                    return (
                      <View className="rounded-3xl overflow-hidden bg-black mb-4">
                        <VideoPlayer
                          uri={url}
                          autoPlay={false}
                          initialMuted
                          isLooping={false}
                          maxHeightRatio={0.55}
                          initialAspectRatio={16 / 9}
                        />
                      </View>
                    );
                  }

                  return (
                    <Pressable
                      onPress={() =>
                        Linking.openURL(url).catch(() => undefined)
                      }
                      className="rounded-2xl bg-white/10 px-5 py-4 flex-row items-center gap-3 mb-4"
                    >
                      <Feather name="external-link" size={18} color="#FFFFFF" />
                      <View className="flex-1">
                        <Text className="text-sm font-outfit text-white font-semibold">
                          {externalLabelFor(url)}
                        </Text>
                        <Text
                          className="text-[11px] font-outfit text-white/80 mt-0.5"
                          numberOfLines={1}
                        >
                          {url}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={16} color="#94A3B8" />
                    </Pressable>
                  );
                })()
              : null}

            <View className="flex-row items-start gap-4">
              <View className="flex-1">
                <Text className="text-lg font-clash font-bold text-app">
                  {item.title}
                </Text>
                {item.body?.trim() ? (
                  <Text
                    className="text-sm font-outfit text-secondary mt-1"
                    numberOfLines={20}
                  >
                    {item.body.trim()}
                  </Text>
                ) : null}

                {(uploadsBySectionId[item.id]?.length ?? 0) > 0 ? (
                  <View className="mt-4 gap-3">
                    <Text className="text-xs font-outfit-bold text-secondary uppercase tracking-widest">
                      Uploaded Video
                    </Text>
                    {uploadsBySectionId[item.id]!.map((u: any) => (
                      <View key={String(u.id ?? u.videoUrl)} className="gap-2">
                        {u.videoUrl ? (
                          <View className="rounded-3xl overflow-hidden bg-black">
                            <VideoPlayer
                              uri={String(u.videoUrl)}
                              autoPlay={false}
                              initialMuted
                              isLooping={false}
                              maxHeightRatio={0.55}
                              initialAspectRatio={16 / 9}
                            />
                          </View>
                        ) : null}
                        {typeof u.feedback === "string" && u.feedback.trim() ? (
                          <View className="rounded-2xl bg-white/5 px-4 py-3">
                            <Text className="text-xs font-outfit-bold text-secondary uppercase tracking-widest mb-1">
                              Feedback
                            </Text>
                            <Text className="text-sm font-outfit text-secondary">
                              {u.feedback.trim()}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : null}

                {item.metadata ? (
                  <View className="gap-2 mt-2">
                    <View className="flex-row flex-wrap gap-2">
                      {item.metadata.category?.trim() ? (
                        <Text className="text-xs font-outfit text-secondary">
                          {item.metadata.category.trim()}
                        </Text>
                      ) : null}
                      {item.metadata.equipment?.trim() ? (
                        <Text className="text-xs font-outfit text-secondary">
                          {item.metadata.equipment.trim()}
                        </Text>
                      ) : null}
                      {typeof item.metadata.sets === "number" ? (
                        <Text className="text-xs font-outfit text-secondary">
                          {item.metadata.sets} sets
                        </Text>
                      ) : null}
                      {typeof item.metadata.reps === "number" ? (
                        <Text className="text-xs font-outfit text-secondary">
                          {item.metadata.reps} reps
                        </Text>
                      ) : null}
                      {typeof item.metadata.duration === "number" ? (
                        <Text className="text-xs font-outfit text-secondary">
                          {item.metadata.duration}s
                        </Text>
                      ) : null}
                      {typeof item.metadata.restSeconds === "number" ? (
                        <Text className="text-xs font-outfit text-secondary">
                          Rest {item.metadata.restSeconds}s
                        </Text>
                      ) : null}
                    </View>

                    {item.metadata.steps?.trim() ? (
                      <View className="gap-1">
                        <Text className="text-xs font-outfit-bold text-secondary uppercase tracking-widest">
                          Steps
                        </Text>
                        <Text
                          className="text-sm font-outfit text-secondary"
                          numberOfLines={20}
                        >
                          {item.metadata.steps.trim()}
                        </Text>
                      </View>
                    ) : null}
                    {item.metadata.cues?.trim() ? (
                      <View className="gap-1">
                        <Text className="text-xs font-outfit-bold text-secondary uppercase tracking-widest">
                          Cues
                        </Text>
                        <Text
                          className="text-sm font-outfit text-secondary"
                          numberOfLines={20}
                        >
                          {item.metadata.cues.trim()}
                        </Text>
                      </View>
                    ) : null}
                    {item.metadata.progression?.trim() ? (
                      <View className="gap-1">
                        <Text className="text-xs font-outfit-bold text-secondary uppercase tracking-widest">
                          Progression
                        </Text>
                        <Text
                          className="text-sm font-outfit text-secondary"
                          numberOfLines={20}
                        >
                          {item.metadata.progression.trim()}
                        </Text>
                      </View>
                    ) : null}
                    {item.metadata.regression?.trim() ? (
                      <View className="gap-1">
                        <Text className="text-xs font-outfit-bold text-secondary uppercase tracking-widest">
                          Regression
                        </Text>
                        <Text
                          className="text-sm font-outfit text-secondary"
                          numberOfLines={20}
                        >
                          {item.metadata.regression.trim()}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </View>

            {canUpload && item.allowVideoUpload ? (
              <View className="mt-4 items-end">
                <Text className="text-[11px] font-outfit text-secondary opacity-80 mb-2">
                  Upload video
                </Text>
                <Pressable
                  onPress={() => onUploadPress(item.id, item.title)}
                  className="h-10 w-10 rounded-full bg-accent/10 items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel="Upload video"
                >
                  <Feather
                    name="video"
                    size={18}
                    color={
                      hasUploaded[item.id] ? colors.success : colors.accent
                    }
                  />
                </Pressable>
                <Text className="text-[10px] font-outfit text-secondary opacity-70 mt-2">
                  Coach feedback will show below.
                </Text>
              </View>
            ) : null}

            {completionAnchorItemId === item.id && onCompleteSession ? (
              <Pressable
                onPress={onCompleteSession}
                className="bg-accent py-4 rounded-full items-center mt-3"
              >
                <Text className="text-white font-outfit-bold uppercase">
                  {completeSessionLabel}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}
