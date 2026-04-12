import React from "react";
import {
  ActivityIndicator,
  View,
  Pressable,
  Linking,
  TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { SessionItem } from "@/hooks/programs/useSessionData";
import { VideoPlayer, isYoutubeUrl } from "@/components/media/VideoPlayer";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { ProgramMetricGrid } from "@/components/programs/metrics/ProgramMetricGrid";

type PendingSessionVideo = {
  video: { uri: string };
  notes: string;
  progress: number | null;
  error: string | null;
};

interface Props {
  title: string;
  items: SessionItem[];
  onUploadPress: (id: number, title: string) => void;
  hasUploaded: Record<number, boolean>;
  uploadsBySectionId: Record<number, any[]>;
  canUpload: boolean;
  pendingBySectionId?: Record<number, PendingSessionVideo | undefined>;
  activeUploadSectionId?: number | null;
  isUploading?: boolean;
  uploadStatus?: string | null;
  onPendingRemove?: (sectionContentId: number) => void;
  onPendingNotesChange?: (sectionContentId: number, notes: string) => void;
  onPendingSend?: (sectionContentId: number) => void | Promise<void>;
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
  pendingBySectionId,
  activeUploadSectionId,
  isUploading = false,
  uploadStatus,
  onPendingRemove,
  onPendingNotesChange,
  onPendingSend,
  completionAnchorItemId,
  onCompleteSession,
  completeSessionLabel = "Complete Session",
}: Props) {
  const { colors, isDark } = useAppTheme();
  if (items.length === 0) return null;

  const borderSoft = colors.borderSubtle ?? (isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)");

  const MetaSectionCard = ({
    icon,
    title,
    body,
  }: {
    icon: React.ComponentProps<typeof Feather>["name"];
    title: string;
    body: string;
  }) => (
    <View
      className="rounded-[22px] border px-4 py-4 gap-3"
      style={{
        backgroundColor: colors.surfaceHigh,
        borderColor: borderSoft,
      }}
    >
      <View className="flex-row items-center gap-3">
        <View
          className="h-9 w-9 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.accentLight }}
        >
          <Feather name={icon} size={16} color={colors.accent} />
        </View>
        <Text
          className="text-[11px] font-outfit-bold uppercase tracking-[1.6px]"
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
          fontWeight: "500",
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
    <View className="mb-10">
      <View className="mb-3 flex-row items-center justify-between">
        <View
          className="rounded-full px-3 py-1.5"
          style={{ backgroundColor: colors.accentLight }}
        >
          <Text
            className="text-[10px] font-outfit-bold uppercase tracking-[1.3px]"
            style={{ color: colors.accent }}
          >
            {title}
          </Text>
        </View>
        <Text
          className="text-[11px] font-outfit font-semibold"
          style={{ color: colors.textSecondary }}
        >
          {items.length} item{items.length === 1 ? "" : "s"}
        </Text>
      </View>
      <View className="gap-4">
        {items.map((item) => (
          <View
            key={item.id}
            className="rounded-3xl border p-4"
            style={{
              backgroundColor: colors.surface,
              borderColor: borderSoft,
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
                        />
                      </View>
                    );
                  }

                  return (
                    <Pressable
                      onPress={() =>
                        Linking.openURL(url).catch(() => undefined)
                      }
                      className="rounded-2xl px-5 py-4 flex-row items-center gap-3 mb-4 border"
                      style={{
                        backgroundColor: colors.surfaceHigh,
                        borderColor: borderSoft,
                      }}
                    >
                      <Feather name="external-link" size={18} color={colors.icon} />
                      <View className="flex-1">
                        <Text
                          className="text-sm font-outfit font-semibold"
                          style={{ color: colors.textPrimary }}
                        >
                          {externalLabelFor(url)}
                        </Text>
                        <Text
                          className="text-[11px] font-outfit mt-0.5"
                          style={{ color: colors.textSecondary }}
                          numberOfLines={1}
                        >
                          {url}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={16} color={colors.icon} />
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
                            />
                          </View>
                        ) : null}
                        {typeof u.notes === "string" && u.notes.trim() ? (
                          <View
                            className="rounded-2xl px-4 py-3 border"
                            style={{
                              backgroundColor: colors.surfaceHigh,
                              borderColor: borderSoft,
                            }}
                          >
                            <Text className="text-xs font-outfit-bold text-secondary uppercase tracking-widest mb-1">
                              Your notes
                            </Text>
                            <Text className="text-sm font-outfit text-secondary">
                              {u.notes.trim()}
                            </Text>
                          </View>
                        ) : null}
                        {typeof u.feedback === "string" && u.feedback.trim() ? (
                          <View
                            className="rounded-2xl px-4 py-3 border"
                            style={{
                              backgroundColor: colors.surfaceHigh,
                              borderColor: borderSoft,
                            }}
                          >
                            <Text className="text-xs font-outfit-bold text-secondary uppercase tracking-widest mb-1">
                              Coach response
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

                {pendingBySectionId?.[item.id] ? (
                  (() => {
                    const pending = pendingBySectionId[item.id]!;
                    const isSending =
                      isUploading && activeUploadSectionId === item.id;
                    const progressPct =
                      isSending && typeof pending.progress === "number"
                        ? Math.round(pending.progress * 100)
                        : null;

                    return (
                      <View className="mt-4 gap-3">
                        <Text className="text-xs font-outfit-bold text-secondary uppercase tracking-widest">
                          Preview (not sent yet)
                        </Text>
                        <View className="rounded-3xl overflow-hidden bg-black">
                          <VideoPlayer
                            uri={pending.video.uri}
                            autoPlay={false}
                            initialMuted
                            isLooping={false}
                            maxHeightRatio={0.55}
                          />
                        </View>

                        <View
                          className="rounded-2xl px-4 py-3 border"
                          style={{
                            backgroundColor: colors.surfaceHigh,
                            borderColor: borderSoft,
                          }}
                        >
                          <Text className="text-xs font-outfit-bold text-secondary uppercase tracking-widest mb-2">
                            Notes to coach (optional)
                          </Text>
                          <TextInput
                            value={pending.notes}
                            onChangeText={(t) => onPendingNotesChange?.(item.id, t)}
                            editable={!isSending}
                            placeholder="What should your coach look for?"
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            style={{
                              color: colors.textPrimary,
                              minHeight: 60,
                              textAlignVertical: "top",
                            }}
                          />
                        </View>

                        {pending.error ? (
                          <Text className="text-xs font-outfit text-secondary">
                            {pending.error}
                          </Text>
                        ) : null}

                        {isSending && uploadStatus ? (
                          <Text className="text-xs font-outfit text-secondary">
                            {progressPct != null
                              ? `${uploadStatus} (${progressPct}%)`
                              : uploadStatus}
                          </Text>
                        ) : null}

                        <View className="flex-row gap-3">
                          <Pressable
                            disabled={isSending}
                            onPress={() => onPendingRemove?.(item.id)}
                            className="flex-1 rounded-full py-3 items-center border"
                            style={{
                              backgroundColor: colors.surfaceHigh,
                              borderColor: borderSoft,
                            }}
                          >
                            <Text
                              className="font-outfit-bold uppercase"
                              style={{ color: colors.textPrimary }}
                            >
                              Remove
                            </Text>
                          </Pressable>
                          <Pressable
                            disabled={isSending}
                            onPress={() => void onPendingSend?.(item.id)}
                            className="flex-1 rounded-full py-3 items-center flex-row justify-center gap-2"
                            style={{ backgroundColor: colors.accent }}
                          >
                            {isSending ? (
                              <ActivityIndicator color="#fff" />
                            ) : null}
                            <Text className="text-white font-outfit-bold uppercase">
                              Send to coach
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })()
                ) : null}

                {item.metadata ? (
                  <View className="mt-4 gap-4">
                    <ProgramMetricGrid
                      items={[
                        item.metadata.sets != null
                          ? {
                              key: `sets-${item.id}`,
                              label: "Sets",
                              value: String(item.metadata.sets),
                              icon: "hash",
                              accent: true,
                            }
                          : null,
                        item.metadata.reps != null
                          ? {
                              key: `reps-${item.id}`,
                              label: "Reps",
                              value: String(item.metadata.reps),
                              icon: "repeat",
                            }
                          : null,
                        item.metadata.duration != null
                          ? {
                              key: `duration-${item.id}`,
                              label: "Duration",
                              value: String(item.metadata.duration),
                              unit: "s",
                              icon: "clock",
                            }
                          : null,
                        item.metadata.restSeconds != null
                          ? {
                              key: `rest-${item.id}`,
                              label: "Rest",
                              value: String(item.metadata.restSeconds),
                              unit: "s",
                              icon: "pause-circle",
                            }
                          : null,
                        item.metadata.category?.trim()
                          ? {
                              key: `category-${item.id}`,
                              label: "Category",
                              value: item.metadata.category.trim(),
                              icon: "tag",
                            }
                          : null,
                        item.metadata.equipment?.trim()
                          ? {
                              key: `equipment-${item.id}`,
                              label: "Equipment",
                              value: item.metadata.equipment.trim(),
                              icon: "tool",
                            }
                          : null,
                      ].filter(Boolean) as any}
                    />

                    {item.metadata.steps?.trim() ? (
                      <MetaSectionCard
                        icon="list"
                        title="Steps"
                        body={item.metadata.steps.trim()}
                      />
                    ) : null}
                    {item.metadata.cues?.trim() ? (
                      <MetaSectionCard
                        icon="message-circle"
                        title="Cues"
                        body={item.metadata.cues.trim()}
                      />
                    ) : null}
                    {item.metadata.progression?.trim() ? (
                      <MetaSectionCard
                        icon="trending-up"
                        title="Progression"
                        body={item.metadata.progression.trim()}
                      />
                    ) : null}
                    {item.metadata.regression?.trim() ? (
                      <MetaSectionCard
                        icon="trending-down"
                        title="Regression"
                        body={item.metadata.regression.trim()}
                      />
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
                  className="h-10 w-10 rounded-full items-center justify-center border"
                  style={{
                    backgroundColor: colors.accentLight,
                    borderColor: borderSoft,
                  }}
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
