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
import { useAdminPastel } from "@/components/admin/AdminUI";
import { SessionItem } from "@/hooks/programs/useSessionData";
import { VideoPlayer, isYoutubeUrl } from "@/components/media/VideoPlayer";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { ProgramMetricGrid } from "@/components/programs/metrics/ProgramMetricGrid";
import type { CoachResponse } from "@/types/video-upload";

type PendingSessionVideo = {
  video: { uri: string; sizeBytes?: number };
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
  coachResponsesByUploadId?: Map<string, CoachResponse[]>;
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
  sessionCompleted?: boolean;
}

function formatMb(bytes: number | undefined) {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return "—";
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SessionExerciseBlock({
  title,
  items,
  onUploadPress,
  hasUploaded,
  uploadsBySectionId,
  coachResponsesByUploadId,
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
  completeSessionLabel = "Finish Session",
  sessionCompleted = false,
}: Props) {
  const p = useAdminPastel();
  if (items.length === 0) return null;

  const MetaSectionCard = ({
    icon,
    title: sectionTitle,
    body,
  }: {
    icon: React.ComponentProps<typeof Feather>["name"];
    title: string;
    body: string;
  }) => {
    const raw = body.trim();
    const len = raw.length;
    const baseSize = len > 420 ? 13 : len > 220 ? 14 : 15;
    const lineHeight = Math.round(baseSize * 1.55);
    const headSize = len > 420 ? 15 : 16;
    return (
      <View
        style={{
          borderRadius: 22,
          borderWidth: 1,
          borderColor: p.divider,
          paddingHorizontal: 16,
          paddingVertical: 16,
          gap: 12,
          backgroundColor: p.inputBg,
          width: "100%",
          alignSelf: "stretch",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 1 }}>
          <View
            style={{
              height: 36,
              width: 36,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: p.accentSoft,
            }}
          >
            <Feather name={icon} size={16} color={p.accent} />
          </View>
          <Text
            style={{
              fontSize: 11,
              fontFamily: "Outfit-Bold",
              textTransform: "uppercase",
              letterSpacing: 1.4,
              flex: 1,
              color: p.textSecondary,
            }}
          >
            {sectionTitle}
          </Text>
        </View>
        <MarkdownText
          text={raw}
          baseStyle={{
            fontSize: baseSize,
            lineHeight,
            color: p.textPrimary,
            fontWeight: "500",
          }}
          headingStyle={{
            fontSize: headSize,
            lineHeight: headSize + 8,
            color: p.textPrimary,
            fontWeight: "700",
          }}
          subheadingStyle={{
            fontSize: baseSize + 1,
            lineHeight: lineHeight + 2,
            color: p.textPrimary,
            fontWeight: "700",
          }}
          listItemStyle={{ paddingLeft: 6 }}
          containerStyle={{ width: "100%" }}
        />
      </View>
    );
  };

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
    <View style={{ marginBottom: 40 }}>
      <View style={{ marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View
          style={{
            borderRadius: 100,
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: p.accentSoft,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontFamily: "Outfit-Bold",
              textTransform: "uppercase",
              letterSpacing: 1.3,
              color: p.accent,
            }}
          >
            {title}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 11,
            fontFamily: "Outfit-SemiBold",
            color: p.textSecondary,
          }}
        >
          {items.length} item{items.length === 1 ? "" : "s"}
        </Text>
      </View>
      <View style={{ gap: 16 }}>
        {items.map((item) => (
          <View
            key={item.id}
            style={{
              borderRadius: 24,
              borderWidth: 1,
              borderColor: p.divider,
              padding: 16,
              backgroundColor: p.inputBg,
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
                      <View style={{ borderRadius: 24, overflow: "hidden", backgroundColor: "#000", marginBottom: 16 }}>
                        <VideoPlayer
                          uri={url}
                          autoPlay={false}
                          initialMuted
                          isLooping={false}
                          useVideoResolution
                          maxHeightRatio={0.92}
                        />
                      </View>
                    );
                  }

                  return (
                    <Pressable
                      onPress={() =>
                        Linking.openURL(url).catch(() => undefined)
                      }
                      style={{
                        borderRadius: 16,
                        paddingHorizontal: 20,
                        paddingVertical: 16,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 16,
                        borderWidth: 1,
                        backgroundColor: p.inputBg,
                        borderColor: p.divider,
                      }}
                    >
                      <Feather name="external-link" size={18} color={p.textMuted} />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 14,
                            fontFamily: "Outfit-SemiBold",
                            color: p.textPrimary,
                          }}
                        >
                          {externalLabelFor(url)}
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            fontFamily: "Outfit-Regular",
                            color: p.textSecondary,
                            marginTop: 2,
                          }}
                          numberOfLines={1}
                        >
                          {url}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={16} color={p.textMuted} />
                    </Pressable>
                  );
                })()
              : null}

            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 16 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontFamily: "Outfit-Bold",
                    color: p.textPrimary,
                    width: "100%",
                  }}
                >
                  {item.title}
                </Text>
                {item.body?.trim() ? (
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Outfit-Regular",
                      color: p.textSecondary,
                      marginTop: 4,
                      width: "100%",
                    }}
                  >
                    {item.body.trim()}
                  </Text>
                ) : null}

                {(uploadsBySectionId[item.id]?.length ?? 0) > 0 ? (
                  <View style={{ marginTop: 16, gap: 12 }}>
                    <Text
                      style={{
                        fontSize: 10,
                        fontFamily: "Outfit-Bold",
                        color: p.textSecondary,
                        textTransform: "uppercase",
                        letterSpacing: 1.2,
                      }}
                    >
                      Uploaded Video
                    </Text>
                    {uploadsBySectionId[item.id]!.map((u: any) => (
                      <View key={String(u.id ?? u.videoUrl)} style={{ gap: 8 }}>
                        {u.videoUrl ? (
                          <View style={{ borderRadius: 24, overflow: "hidden", backgroundColor: "#000" }}>
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
                            style={{
                              borderRadius: 16,
                              paddingHorizontal: 16,
                              paddingVertical: 12,
                              borderWidth: 1,
                              backgroundColor: p.inputBg,
                              borderColor: p.divider,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontFamily: "Outfit-Bold",
                                color: p.textSecondary,
                                textTransform: "uppercase",
                                letterSpacing: 1.2,
                                marginBottom: 4,
                              }}
                            >
                              Your notes
                            </Text>
                            <Text
                              style={{
                                fontSize: 14,
                                fontFamily: "Outfit-Regular",
                                color: p.textSecondary,
                                width: "100%",
                              }}
                            >
                              {u.notes.trim()}
                            </Text>
                          </View>
                        ) : null}
                        {typeof u.feedback === "string" && u.feedback.trim() ? (
                          <View
                            style={{
                              borderRadius: 16,
                              paddingHorizontal: 16,
                              paddingVertical: 12,
                              borderWidth: 1,
                              backgroundColor: p.inputBg,
                              borderColor: p.divider,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontFamily: "Outfit-Bold",
                                color: p.textSecondary,
                                textTransform: "uppercase",
                                letterSpacing: 1.2,
                                marginBottom: 4,
                              }}
                            >
                              Coach response
                            </Text>
                            <Text
                              style={{
                                fontSize: 14,
                                fontFamily: "Outfit-Regular",
                                color: p.textSecondary,
                                width: "100%",
                              }}
                            >
                              {u.feedback.trim()}
                            </Text>
                          </View>
                        ) : null}

                        {(coachResponsesByUploadId?.get(String(u.id)) ?? []).map(
                          (res) => (
                            <View key={res.id} style={{ gap: 8 }}>
                              <View
                                style={{
                                  borderRadius: 16,
                                  paddingHorizontal: 16,
                                  paddingVertical: 12,
                                  borderWidth: 1,
                                  backgroundColor: p.inputBg,
                                  borderColor: p.divider,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 10,
                                    fontFamily: "Outfit-Bold",
                                    color: p.textSecondary,
                                    textTransform: "uppercase",
                                    letterSpacing: 1.2,
                                    marginBottom: 4,
                                  }}
                                >
                                  Coach response video
                                </Text>
                                {res.text ? (
                                  <Text
                                    style={{
                                      fontSize: 14,
                                      fontFamily: "Outfit-Regular",
                                      color: p.textSecondary,
                                      width: "100%",
                                    }}
                                  >
                                    {res.text}
                                  </Text>
                                ) : null}
                              </View>
                              {res.mediaUrl ? (
                                <View style={{ borderRadius: 24, overflow: "hidden", backgroundColor: "#000" }}>
                                  <VideoPlayer
                                    uri={String(res.mediaUrl)}
                                    autoPlay={false}
                                    initialMuted
                                    isLooping={false}
                                    maxHeightRatio={0.5}
                                  />
                                </View>
                              ) : null}
                            </View>
                          ),
                        )}
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
                      <View style={{ marginTop: 16, gap: 12 }}>
                        <Text
                          style={{
                            fontSize: 10,
                            fontFamily: "Outfit-Bold",
                            color: p.textSecondary,
                            textTransform: "uppercase",
                            letterSpacing: 1.2,
                          }}
                        >
                          Preview (not sent yet)
                        </Text>
                        <View style={{ borderRadius: 24, overflow: "hidden", backgroundColor: "#000" }}>
                          <VideoPlayer
                            uri={pending.video.uri}
                            autoPlay={false}
                            initialMuted
                            isLooping={false}
                            maxHeightRatio={0.55}
                          />
                        </View>
                        <Text
                          style={{
                            fontSize: 11,
                            fontFamily: "Outfit-Regular",
                            color: p.textSecondary,
                          }}
                        >
                          Selected size: {formatMb(pending.video.sizeBytes)}
                        </Text>

                        <View
                          style={{
                            borderRadius: 16,
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            borderWidth: 1,
                            backgroundColor: p.inputBg,
                            borderColor: p.divider,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontFamily: "Outfit-Bold",
                              color: p.textSecondary,
                              textTransform: "uppercase",
                              letterSpacing: 1.2,
                              marginBottom: 8,
                            }}
                          >
                            Notes to coach (optional)
                          </Text>
                          <TextInput
                            value={pending.notes}
                            onChangeText={(t) => onPendingNotesChange?.(item.id, t)}
                            editable={!isSending}
                            placeholder="What should your coach look for?"
                            placeholderTextColor={p.textMuted}
                            multiline
                            style={{
                              fontFamily: "Outfit-Regular",
                              fontSize: 14,
                              color: p.textPrimary,
                              minHeight: 60,
                              textAlignVertical: "top",
                            }}
                          />
                        </View>

                        {pending.error ? (
                          <Text
                            style={{
                              fontSize: 12,
                              fontFamily: "Outfit-Regular",
                              color: p.danger,
                            }}
                          >
                            {pending.error}
                          </Text>
                        ) : null}

                        {isSending && uploadStatus ? (
                          <Text
                            style={{
                              fontSize: 12,
                              fontFamily: "Outfit-Regular",
                              color: p.textSecondary,
                            }}
                          >
                            {progressPct != null
                              ? `${uploadStatus} (${progressPct}%)`
                              : uploadStatus}
                          </Text>
                        ) : null}

                        <View style={{ flexDirection: "row", gap: 12 }}>
                          <Pressable
                            disabled={isSending}
                            onPress={() => onPendingRemove?.(item.id)}
                            style={{
                              flex: 1,
                              borderRadius: 100,
                              paddingVertical: 12,
                              alignItems: "center",
                              borderWidth: 1,
                              backgroundColor: p.inputBg,
                              borderColor: p.divider,
                            }}
                          >
                            <Text
                              style={{
                                fontFamily: "Outfit-Bold",
                                textTransform: "uppercase",
                                fontSize: 13,
                                color: p.textPrimary,
                              }}
                            >
                              Remove
                            </Text>
                          </Pressable>
                          <Pressable
                            disabled={isSending}
                            onPress={() => void onPendingSend?.(item.id)}
                            style={{
                              flex: 1,
                              borderRadius: 100,
                              paddingVertical: 12,
                              alignItems: "center",
                              flexDirection: "row",
                              justifyContent: "center",
                              gap: 8,
                              backgroundColor: p.accent,
                            }}
                          >
                            {isSending ? (
                              <ActivityIndicator color={p.buttonPrimaryText} />
                            ) : null}
                            <Text
                              style={{
                                fontFamily: "Outfit-Bold",
                                textTransform: "uppercase",
                                fontSize: 13,
                                color: p.buttonPrimaryText,
                              }}
                            >
                              Send to coach
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })()
                ) : null}

                {item.metadata ? (
                  <View style={{ marginTop: 16, gap: 16 }}>
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
                              valueKind: "text" as const,
                            }
                          : null,
                        item.metadata.equipment?.trim()
                          ? {
                              key: `equipment-${item.id}`,
                              label: "Equipment",
                              value: item.metadata.equipment.trim(),
                              icon: "tool",
                              valueKind: "text" as const,
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
              <View style={{ marginTop: 16, alignItems: "flex-end" }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: "Outfit-Regular",
                    color: p.textSecondary,
                    opacity: 0.8,
                    marginBottom: 8,
                  }}
                >
                  Upload video
                </Text>
                <Pressable
                  onPress={() => onUploadPress(item.id, item.title)}
                  style={{
                    height: 40,
                    width: 40,
                    borderRadius: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    backgroundColor: p.accentSoft,
                    borderColor: p.divider,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Upload video"
                >
                  <Feather
                    name="video"
                    size={18}
                    color={
                      hasUploaded[item.id] ? p.success : p.accent
                    }
                  />
                </Pressable>
                <Text
                  style={{
                    fontSize: 10,
                    fontFamily: "Outfit-Regular",
                    color: p.textSecondary,
                    opacity: 0.7,
                    marginTop: 8,
                  }}
                >
                  Coach feedback will show below.
                </Text>
              </View>
            ) : canUpload && !item.allowVideoUpload ? (
              <View
                style={{
                  marginTop: 16,
                  borderRadius: 16,
                  borderWidth: 1,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderColor: p.divider,
                  backgroundColor: p.inputBg,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: "Outfit-Regular",
                    color: p.textSecondary,
                  }}
                >
                  Video upload is disabled for this item.
                </Text>
              </View>
            ) : item.allowVideoUpload ? (
              <View
                style={{
                  marginTop: 16,
                  borderRadius: 16,
                  borderWidth: 1,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderColor: p.divider,
                  backgroundColor: p.inputBg,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: "Outfit-Regular",
                    color: p.textSecondary,
                  }}
                >
                  Video upload is available on Premium Plus or Pro.
                </Text>
              </View>
            ) : null}

            {completionAnchorItemId === item.id && onCompleteSession ? (
              sessionCompleted ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    paddingVertical: 14,
                    borderRadius: 100,
                    backgroundColor: "rgba(34,197,94,0.12)",
                    borderWidth: 1,
                    borderColor: "rgba(34,197,94,0.3)",
                    marginTop: 12,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>✓</Text>
                  <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: "#22c55e", textTransform: "uppercase" }}>
                    Session Completed
                  </Text>
                </View>
              ) : (
                <Pressable
                  onPress={onCompleteSession}
                  style={{
                    backgroundColor: p.accent,
                    paddingVertical: 16,
                    borderRadius: 100,
                    alignItems: "center",
                    marginTop: 12,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Outfit-Bold",
                      textTransform: "uppercase",
                      fontSize: 14,
                      color: p.buttonPrimaryText,
                    }}
                  >
                    {completeSessionLabel}
                  </Text>
                </Pressable>
              )
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}
