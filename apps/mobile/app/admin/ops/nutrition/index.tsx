import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text, TextInput } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import { Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/api";
import { VIDEO_PICK_PRESERVE_NATIVE_RESOLUTION } from "@/lib/media/videoPickerNativeResolution";
import { useAdminUsers } from "@/hooks/admin/useAdminUsers";
import { useMediaUpload } from "@/hooks/messages/useMediaUpload";
import { ReplaceOnce } from "@/components/navigation/ReplaceOnce";
import { isAdminRole } from "@/lib/isAdminRole";
import { useAppSelector } from "@/store/hooks";
import type { PendingAttachment } from "@/types/admin-messages";
import type { AdminUser } from "@/types/admin";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BackHandler,
  Platform,
  Pressable,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Feather } from "@/components/ui/theme-icons";
import { SafeAreaView } from "react-native-safe-area-context";

type NutritionLog = {
  id: number;
  userId: number;
  dateKey: string;
  mealType?: string | null;
  loggedAt?: string | null;
  athleteType: string;
  breakfast?: string | null;
  snacks?: string | null;
  lunch?: string | null;
  dinner?: string | null;
  waterIntake?: number | null;
  steps?: number | null;
  sleepHours?: number | null;
  mood?: number | null;
  energy?: number | null;
  pain?: number | null;
  foodDiary?: string | null;
  coachFeedback?: string | null;
  coachFeedbackMediaUrl?: string | null;
  coachFeedbackMediaType?: string | null;
  updatedAt?: string;
};

type NutritionTargets = {
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fats?: number | null;
  micronutrientsGuidance?: string | null;
};

function ActionButton({
  label,
  onPress,
  tone = "accent",
  size = "md",
  disabled,
  loading,
  icon,
}: {
  label: string;
  onPress: () => void;
  tone?: "neutral" | "success" | "danger" | "accent";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  icon?: any;
}) {
  const { isDark } = useAppTheme();

  // Use solid green (#22C55E) for accent/success with white text
  const bg = tone === "accent" || tone === "success" ? "#22C55E" : 
             tone === "danger" ? "#EF4444" : 
             isDark ? "rgba(255,255,255,0.15)" : "#F1F5F9";

  const textColor = (tone === "neutral" && !isDark) ? "#0F172A" : "#FFFFFF";

  const height = size === "sm" ? 44 : size === "md" ? 58 : 66;
  const px = size === "sm" ? 16 : size === "md" ? 28 : 36;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || loading}
      onPress={onPress}
      style={{
        height,
        paddingHorizontal: px,
        borderRadius: 14, // Shadcn standard radius
        backgroundColor: bg,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        opacity: (disabled || loading) ? 0.6 : 1,
        // Depth
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.3 : 0.1,
        shadowRadius: 8,
        elevation: 4,
      }}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <>
          {icon && <Feather name={icon} size={size === "sm" ? 18 : 22} color={textColor} style={{ marginRight: 10 }} />}
          <Text
            className="font-outfit-bold uppercase tracking-[1.5px]"
            style={{ color: textColor, fontSize: size === "sm" ? 13 : 15 }}
          >
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  multiline = false,
  prefix,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "email-address";
  multiline?: boolean;
  prefix?: string;
}) {
  const { colors, isDark } = useAppTheme();
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <View className="mb-6">
      <Text className="text-[11px] font-outfit-bold text-textSecondary uppercase tracking-[2px] mb-3 ml-1">
        {label}
      </Text>
      <View 
        className="rounded-[18px] border flex-row items-center px-5"
        style={{
          // Use solid background tokens, no pure black
          backgroundColor: isDark ? colors.backgroundSecondary : "#FFFFFF",
          borderColor: isFocused 
            ? colors.accent 
            : (isDark ? colors.border : "rgba(15,23,42,0.08)"),
          minHeight: multiline ? 140 : 62,
          paddingTop: multiline ? 18 : 0,
          paddingBottom: multiline ? 18 : 0,
          borderWidth: isFocused ? 2 : 1,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isFocused ? 0.05 : 0,
          shadowRadius: 4,
        }}
      >
        {prefix && (
          <View 
            className="px-2.5 py-1.5 rounded-lg mr-3"
            style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.04)" }}
          >
            <Text className="text-[14px] font-outfit-bold text-textSecondary">{prefix}</Text>
          </View>
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          keyboardType={keyboardType}
          multiline={multiline}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          textAlignVertical={multiline ? "top" : "center"}
          className="flex-1 text-[17px] font-outfit text-app"
          cursorColor={colors.accent}
          selectionColor={`${colors.accent}40`}
        />
      </View>
    </View>
  );
}

function SmallAction({
  label,
  onPress,
  tone,
  disabled,
}: {
  label: string;
  onPress: () => void;
  tone: "neutral" | "success" | "danger" | "accent";
  disabled?: boolean;
}) {
  const { colors, isDark } = useAppTheme();
  const tint =
    tone === "success"
      ? colors.accent
      : tone === "danger"
        ? colors.danger
        : tone === "accent"
          ? colors.accent
          : colors.text;
  
  const bg =
    tone === "success"
      ? isDark ? "rgba(34, 197, 94, 0.12)" : "rgba(34, 197, 94, 0.08)"
      : tone === "danger"
        ? isDark ? "rgba(239, 68, 68, 0.12)" : "rgba(239, 68, 68, 0.08)"
        : tone === "accent"
          ? isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)"
          : isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(15, 23, 42, 0.04)";

  const border =
    tone === "success"
      ? isDark ? "rgba(34, 197, 94, 0.2)" : "rgba(34, 197, 94, 0.15)"
      : tone === "danger"
        ? isDark ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.15)"
        : tone === "accent"
          ? isDark ? "rgba(59, 130, 246, 0.3)" : "rgba(59, 130, 246, 0.2)"
          : isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.08)";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 16,
          borderWidth: 1,
          backgroundColor: bg,
          borderColor: border,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <Text
        className="text-[13px] font-outfit-semibold"
        style={{ color: tint }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function AdminNutritionScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const { token, appRole, apiUserRole } = useAppSelector((state) => state.user);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);

  const canAccess = isAdminRole(apiUserRole) || appRole === "coach";
  if (!canAccess) {
    return <ReplaceOnce href="/(tabs)" />;
  }

  const [listTab, setListTab] = useState<"adult" | "youth">("adult");
  const [searchQuery, setSearchQuery] = useState("");
  const {
    users,
    loading: usersLoading,
    error: _usersError,
    load: loadUsers,
  } = useAdminUsers(token, Boolean(bootstrapReady));

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const selectedUser: AdminUser | null = useMemo(
    () => users.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId],
  );

  const [activeTab, setActiveTab] = useState<"logs" | "coach">("logs");
  const [logs, setLogs] = useState<NutritionLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  const [_targets, setTargets] = useState<NutritionTargets | null>(null);
  const [_targetsLoading, setTargetsLoading] = useState(false);
  const [targetsDraft, setTargetsDraft] = useState({
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    micronutrientsGuidance: "",
  });
  const [savingTargets, setSavingTargets] = useState(false);
  const [targetsStatus, setTargetsStatus] = useState<string | null>(null);

  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const selectedLog = useMemo(
    () => logs.find((l) => l.id === selectedLogId) ?? null,
    [logs, selectedLogId],
  );

  const { uploadAttachment } = useMediaUpload(token);
  const [feedbackDraft, setFeedbackDraft] = useState("");
  const [responseVideo, setResponseVideo] = useState<PendingAttachment | null>(null);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [_feedbackError, setFeedbackError] = useState<string | null>(null);

  useEffect(() => {
    void loadUsers(searchQuery);
  }, [loadUsers, searchQuery]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (selectedLogId != null) {
        setSelectedLogId(null);
        return true;
      }
      if (selectedUserId != null) {
        setSelectedUserId(null);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [selectedLogId, selectedUserId]);

  const loadLogsForUser = useCallback(
    async (userId: number, forceRefresh = false) => {
      if (!token || !bootstrapReady) return;
      setLogsLoading(true);
      setLogsError(null);
      try {
        const res = await apiRequest<{ logs: NutritionLog[] }>(
          `/nutrition/logs?userId=${userId}&limit=50`,
          {
            token,
            forceRefresh,
            skipCache: forceRefresh,
            suppressStatusCodes: [403],
          },
        );
        setLogs(Array.isArray(res?.logs) ? res.logs : []);
      } catch (e) {
        setLogsError(e instanceof Error ? e.message : "Failed to load logs");
      } finally {
        setLogsLoading(false);
      }
    },
    [bootstrapReady, token],
  );

  const loadTargetsForUser = useCallback(
    async (userId: number) => {
      if (!token || !bootstrapReady) return;
      setTargetsLoading(true);
      try {
        const res = await apiRequest<{ targets: NutritionTargets }>(
          `/nutrition/targets/${userId}`,
          { token }
        );
        const t = res?.targets ?? {};
        setTargets(t);
        setTargetsDraft({
          calories: t.calories != null ? String(t.calories) : "",
          protein: t.protein != null ? String(t.protein) : "",
          carbs: t.carbs != null ? String(t.carbs) : "",
          fats: t.fats != null ? String(t.fats) : "",
          micronutrientsGuidance: t.micronutrientsGuidance ?? "",
        });
      } catch (e) {
        console.error("Failed to load targets", e);
      } finally {
        setTargetsLoading(false);
      }
    },
    [bootstrapReady, token],
  );

  useEffect(() => {
    if (!selectedUserId) return;
    void loadLogsForUser(selectedUserId, true);
    if (selectedUser && (selectedUser as any).athleteType === "adult") {
      void loadTargetsForUser(selectedUserId);
    }
    setSelectedLogId(null);
    setFeedbackDraft("");
    setResponseVideo(null);
    setFeedbackError(null);
    setTargetsStatus(null);
    setActiveTab("logs");
  }, [loadLogsForUser, loadTargetsForUser, selectedUserId, selectedUser]);

  const saveTargets = async () => {
    if (!token || !selectedUserId) return;
    setSavingTargets(true);
    setTargetsStatus(null);
    try {
      await apiRequest(`/nutrition/targets/${selectedUserId}`, {
        method: "PUT",
        token,
        body: {
          calories: targetsDraft.calories ? Number(targetsDraft.calories) : null,
          protein: targetsDraft.protein ? Number(targetsDraft.protein) : null,
          carbs: targetsDraft.carbs ? Number(targetsDraft.carbs) : null,
          fats: targetsDraft.fats ? Number(targetsDraft.fats) : null,
          micronutrientsGuidance: targetsDraft.micronutrientsGuidance.trim() || null,
        },
      });
      setTargetsStatus("Targets saved.");
    } catch (e) {
      setTargetsStatus("Failed to save targets.");
    } finally {
      setSavingTargets(false);
    }
  };

  const pickResponseVideo = useCallback(
    async (source: "camera" | "library") => {
      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) return;

      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              ...VIDEO_PICK_PRESERVE_NATIVE_RESOLUTION,
              cameraType: ImagePicker.CameraType.front,
            })
          : await ImagePicker.launchImageLibraryAsync(
              VIDEO_PICK_PRESERVE_NATIVE_RESOLUTION,
            );

      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];

      setResponseVideo({
        uri: asset.uri,
        fileName: asset.fileName ?? "nutrition-response.mp4",
        mimeType: asset.mimeType ?? "video/mp4",
        sizeBytes: asset.fileSize ?? 0,
        isImage: false,
      });
    },
    [],
  );

  const submitFeedback = useCallback(async () => {
    if (!token || !bootstrapReady) return;
    if (!selectedUserId || !selectedLog) return;

    setSavingFeedback(true);
    setFeedbackError(null);
    try {
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;

      if (responseVideo) {
        const uploaded = await uploadAttachment(responseVideo);
        if (uploaded.contentType !== "video") {
          throw new Error("Selected file is not a video.");
        }
        mediaUrl = uploaded.mediaUrl;
        mediaType = "video";
      }

      const body: Record<string, any> = { feedback: feedbackDraft };
      if (mediaUrl) {
        body.mediaUrl = mediaUrl;
        body.mediaType = mediaType;
      }

      const res = await apiRequest<{ log?: NutritionLog }>(
        `/nutrition/logs/${selectedLog.id}/feedback`,
        {
          method: "POST",
          token,
          body,
          skipCache: true,
        },
      );

      const updated = res?.log;
      setLogs((prev) =>
        prev.map((l) =>
          l.id === selectedLog.id ? { ...l, ...(updated ?? {}) } : l,
        ),
      );
      setResponseVideo(null);
      setFeedbackDraft("");
      setSelectedLogId(null);
    } catch (e) {
      setFeedbackError(
        e instanceof Error ? e.message : "Failed to submit feedback",
      );
    } finally {
      setSavingFeedback(false);
    }
  }, [
    bootstrapReady,
    feedbackDraft,
    responseVideo,
    selectedLog,
    selectedUserId,
    token,
    uploadAttachment,
  ]);

  const adultAthletes = useMemo(() => users.filter(u => (u as any).athleteType === "adult"), [users]);
  const youthAthletes = useMemo(() => users.filter(u => (u as any).athleteType === "youth" || u.role === "guardian"), [users]);

  // UI System Defaults
  const cardStyle = {
    backgroundColor: isDark ? colors.cardElevated : colors.card,
    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
    borderRadius: 32, // Concentric radius stacking
    ...(isDark ? Shadows.none : Shadows.md),
  };

  const innerCardStyle = {
    backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
    borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
    borderRadius: 20,
  };

  const renderAthleteList = () => {
    const displayedAthletes = listTab === "adult" ? adultAthletes : youthAthletes;

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
        <ThemedScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={{ paddingTop: 40, paddingHorizontal: 24, marginBottom: 28 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <View
                style={{
                  width: 5,
                  height: 36,
                  borderRadius: 3,
                  backgroundColor: colors.accent,
                }}
              />
              <View>
                <Text
                  style={{
                    fontFamily: "Telma-Bold",
                    fontSize: 44,
                    color: colors.textPrimary,
                    letterSpacing: -1,
                    lineHeight: 48,
                  }}
                >
                  Nutrition
                </Text>
                <Text
                  style={{
                    fontFamily: "Outfit-Regular",
                    fontSize: 13,
                    color: colors.textSecondary,
                    marginTop: 2,
                  }}
                >
                  Review athlete logs and provide coach responses.
                </Text>
              </View>
            </View>
          </View>

          {/* Adult / Youth Tab Switcher */}
          <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
            <View
              style={{
                flexDirection: "row",
                padding: 5,
                borderRadius: 24,
                borderWidth: 1,
                backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
                borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.06)",
                gap: 4,
              }}
            >
              {(["adult", "youth"] as const).map((t) => {
                const isActive = listTab === t;
                const tabIcon = t === "adult" ? "user" : "users";
                return (
                  <Pressable
                    key={t}
                    onPress={() => setListTab(t)}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: 50,
                      borderRadius: 18,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 7,
                      backgroundColor: isActive
                        ? isDark ? `${colors.accent}20` : `${colors.accent}14`
                        : "transparent",
                      borderWidth: isActive ? 1 : 0,
                      borderColor: isActive
                        ? isDark ? `${colors.accent}32` : `${colors.accent}26`
                        : "transparent",
                      opacity: pressed ? 0.82 : 1,
                    })}
                  >
                    <Feather
                      name={tabIcon as any}
                      size={15}
                      color={isActive ? colors.accent : colors.textSecondary}
                    />
                    <Text
                      style={{
                        fontFamily: "Outfit-Bold",
                        fontSize: 13,
                        letterSpacing: 0.6,
                        textTransform: "uppercase",
                        color: isActive ? colors.accent : colors.textSecondary,
                      }}
                    >
                      {t === "adult" ? "Adult" : "Youth"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Search */}
          <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderRadius: 16,
                borderWidth: 1,
                paddingHorizontal: 16,
                height: 52,
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
                borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)",
              }}
            >
              <Feather name="search" size={18} color={colors.textSecondary} />
              <TextInput
                placeholder={`Search ${listTab} athletes...`}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{
                  flex: 1,
                  marginLeft: 10,
                  fontFamily: "Outfit-Regular",
                  fontSize: 16,
                  color: colors.textPrimary,
                }}
                placeholderTextColor={colors.placeholder}
              />
            </View>
          </View>

          {usersLoading && users.length === 0 ? (
            <View style={{ paddingHorizontal: 24, gap: 12 }}>
              <Skeleton width="100%" height={88} borderRadius={20} />
              <Skeleton width="100%" height={88} borderRadius={20} />
              <Skeleton width="100%" height={88} borderRadius={20} />
            </View>
          ) : (
            <View style={{ paddingHorizontal: 24, paddingBottom: 60 }}>
              {/* Section label */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <View
                  style={{
                    width: 3,
                    height: 14,
                    borderRadius: 2,
                    backgroundColor: colors.accent,
                  }}
                />
                <Text
                  style={{
                    fontFamily: "Outfit-Bold",
                    fontSize: 11,
                    letterSpacing: 1.6,
                    textTransform: "uppercase",
                    color: colors.textSecondary,
                  }}
                >
                  {listTab === "adult" ? "Adult Athletes" : "Youth Athletes"}
                  {" "}
                  <Text
                    style={{
                      fontFamily: "Outfit-Bold",
                      fontSize: 11,
                      color: colors.accent,
                    }}
                  >
                    ({displayedAthletes.length})
                  </Text>
                </Text>
              </View>

              {displayedAthletes.length === 0 ? (
                <View
                  style={{
                    padding: 32,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderStyle: "dashed",
                    borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.12)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather name="users" size={28} color={colors.textSecondary} style={{ marginBottom: 12 }} />
                  <Text
                    style={{
                      fontFamily: "Outfit-Regular",
                      fontSize: 14,
                      color: colors.textSecondary,
                      fontStyle: "italic",
                      textAlign: "center",
                    }}
                  >
                    No {listTab} athletes found.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {displayedAthletes.map((u, idx) => (
                    <Pressable
                      key={u.id}
                      onPress={() => u.id && setSelectedUserId(u.id)}
                      style={({ pressed }) => ({
                        borderRadius: 20,
                        borderWidth: 1,
                        backgroundColor: isDark ? colors.cardElevated : colors.card,
                        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)",
                        paddingHorizontal: 18,
                        paddingVertical: 16,
                        flexDirection: "row",
                        alignItems: "center",
                        opacity: pressed ? 0.8 : 1,
                        transform: [{ scale: pressed ? 0.99 : 1 }],
                        overflow: "hidden",
                      })}
                    >
                      {/* Left accent bar with index number */}
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          backgroundColor: isDark ? `${colors.accent}18` : `${colors.accent}12`,
                          borderWidth: 1,
                          borderColor: isDark ? `${colors.accent}28` : `${colors.accent}20`,
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 14,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Outfit-Bold",
                            fontSize: 14,
                            color: colors.accent,
                            fontVariant: ["tabular-nums"] as any,
                          }}
                        >
                          {idx + 1}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontFamily: "Outfit-Bold",
                            fontSize: 16,
                            color: colors.textPrimary,
                            marginBottom: 3,
                          }}
                          numberOfLines={1}
                        >
                          {u.name}
                        </Text>
                        <Text
                          style={{
                            fontFamily: "Outfit-Regular",
                            fontSize: 13,
                            color: colors.textSecondary,
                          }}
                          numberOfLines={1}
                        >
                          {u.email}
                        </Text>
                      </View>
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          backgroundColor: isDark ? `${colors.accent}14` : `${colors.accent}10`,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Feather name="chevron-right" size={18} color={colors.accent} />
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}
        </ThemedScrollView>
      </SafeAreaView>
    );
  };

  const renderAthleteDetails = () => (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Detail Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 16,
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.07)",
        }}
      >
        <Pressable
          onPress={() => setSelectedUserId(null)}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 13,
            backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)",
            borderWidth: 1,
            borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)",
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Feather name="chevron-left" size={22} color={colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 14 }}>
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: 20,
              color: colors.textPrimary,
              letterSpacing: -0.3,
            }}
            numberOfLines={1}
          >
            {selectedUser?.name}
          </Text>
          <Text
            style={{
              fontFamily: "Outfit-Regular",
              fontSize: 12,
              color: colors.textSecondary,
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {selectedUser?.email}
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ThemedScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingBottom: 80, paddingTop: 20 }}>
          {(selectedUser as any)?.athleteType === "adult" && (
            <View
              style={{
                marginBottom: 24,
                borderRadius: 22,
                borderWidth: 1,
                backgroundColor: isDark ? colors.cardElevated : colors.card,
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)",
                overflow: "hidden",
              }}
            >
              {/* Accent top bar */}
              <View style={{ height: 3, backgroundColor: colors.accent, opacity: 0.7 }} />
              <View style={{ padding: 20 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 11,
                      backgroundColor: isDark ? `${colors.accent}18` : `${colors.accent}12`,
                      borderWidth: 1,
                      borderColor: isDark ? `${colors.accent}28` : `${colors.accent}20`,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Feather name="target" size={18} color={colors.accent} />
                  </View>
                  <Text
                    style={{
                      fontFamily: "Outfit-Bold",
                      fontSize: 17,
                      color: colors.textPrimary,
                      letterSpacing: -0.2,
                    }}
                  >
                    Nutrition Targets
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: "Outfit-Regular",
                    fontSize: 13,
                    color: colors.textSecondary,
                    marginBottom: 20,
                    lineHeight: 19,
                  }}
                >
                  Configure daily caloric and macronutrient targets for this athlete.
                </Text>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 4 }}>
                  <View style={{ width: "47%" }}>
                    <FormInput
                      label="Calories"
                      value={targetsDraft.calories}
                      onChangeText={v => setTargetsDraft(prev => ({ ...prev, calories: v }))}
                      keyboardType="numeric"
                      placeholder="2600"
                    />
                  </View>
                  <View style={{ width: "47%" }}>
                    <FormInput
                      label="Protein"
                      value={targetsDraft.protein}
                      onChangeText={v => setTargetsDraft(prev => ({ ...prev, protein: v }))}
                      keyboardType="numeric"
                      placeholder="180"
                      prefix="g"
                    />
                  </View>
                  <View style={{ width: "47%" }}>
                    <FormInput
                      label="Carbs"
                      value={targetsDraft.carbs}
                      onChangeText={v => setTargetsDraft(prev => ({ ...prev, carbs: v }))}
                      keyboardType="numeric"
                      placeholder="280"
                      prefix="g"
                    />
                  </View>
                  <View style={{ width: "47%" }}>
                    <FormInput
                      label="Fats"
                      value={targetsDraft.fats}
                      onChangeText={v => setTargetsDraft(prev => ({ ...prev, fats: v }))}
                      keyboardType="numeric"
                      placeholder="80"
                      prefix="g"
                    />
                  </View>
                </View>

                <FormInput
                  label="Micronutrient Guidance"
                  value={targetsDraft.micronutrientsGuidance}
                  onChangeText={v => setTargetsDraft(prev => ({ ...prev, micronutrientsGuidance: v }))}
                  multiline
                  placeholder="e.g. Focus on iron-rich foods like spinach and lean red meat..."
                />

                <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 4 }}>
                  <View style={{ flex: 1 }}>
                    <ActionButton
                      label={savingTargets ? "Saving..." : "Save Targets"}
                      onPress={() => void saveTargets()}
                      loading={savingTargets}
                      icon="save"
                    />
                  </View>
                  {targetsStatus && (
                    <View
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: isDark ? `${colors.accent}16` : `${colors.accent}10`,
                        borderWidth: 1,
                        borderColor: isDark ? `${colors.accent}28` : `${colors.accent}20`,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Outfit-Bold",
                          fontSize: 11,
                          color: colors.accent,
                          textTransform: "uppercase",
                          letterSpacing: 0.8,
                        }}
                      >
                        {targetsStatus}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Logs / Feedback Tab Switcher */}
          <View style={{ marginBottom: 24 }}>
            <View
              style={{
                flexDirection: "row",
                padding: 5,
                borderRadius: 22,
                borderWidth: 1,
                backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
                borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.06)",
                gap: 4,
              }}
            >
              {(["logs", "coach"] as const).map((t) => {
                const isActive = activeTab === t;
                const tabIcon = t === "logs" ? "file-text" : "message-circle";
                const tabLabel = t === "logs" ? "Logs" : "Feedback";
                return (
                  <Pressable
                    key={t}
                    onPress={() => setActiveTab(t)}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: 50,
                      borderRadius: 16,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 7,
                      backgroundColor: isActive
                        ? isDark ? `${colors.accent}20` : `${colors.accent}14`
                        : "transparent",
                      borderWidth: isActive ? 1 : 0,
                      borderColor: isActive
                        ? isDark ? `${colors.accent}32` : `${colors.accent}26`
                        : "transparent",
                      opacity: pressed ? 0.82 : 1,
                    })}
                  >
                    <Feather
                      name={tabIcon as any}
                      size={15}
                      color={isActive ? colors.accent : colors.textSecondary}
                    />
                    <Text
                      style={{
                        fontFamily: "Outfit-Bold",
                        fontSize: 13,
                        letterSpacing: 0.6,
                        textTransform: "uppercase",
                        color: isActive ? colors.accent : colors.textSecondary,
                      }}
                    >
                      {tabLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {logsLoading ? (
            <View className="gap-6">
              <Skeleton width="100%" height={100} borderRadius={32} />
              <Skeleton width="100%" height={100} borderRadius={32} />
            </View>
          ) : logsError ? (
            <View className="p-8 rounded-[32px] bg-red-500/10 border border-red-500/20">
              <Text className="text-red-400 font-outfit text-center">{logsError}</Text>
            </View>
          ) : logs.length === 0 ? (
            <View className="py-24 items-center justify-center border border-dashed border-app/20 rounded-[32px]">
              <Feather name="coffee" size={32} color={colors.textSecondary} />
              <Text className="text-textSecondary font-outfit mt-4 text-base">No nutrition logs recorded yet.</Text>
            </View>
          ) : (
            <View className="gap-6">
              {activeTab === "logs" ? (
                logs.map(log => {
                  const isSelected = log.id === selectedLogId;
                  return (
                    <View key={log.id} className="rounded-[32px] border overflow-hidden" style={cardStyle}>
                      <View className="p-6">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1">
                            <Text className="text-2xl font-clash font-bold text-app">{log.dateKey}</Text>
                            <View className="flex-row items-center gap-2 mt-1">
                              <View className="px-2 py-0.5 rounded-md bg-accent/10">
                                <Text className="text-[10px] font-outfit-bold text-accent uppercase tracking-[0.5px]">
                                  {log.athleteType === "adult" ? "Adult" : "Youth"}
                                </Text>
                              </View>
                            </View>
                          </View>
                          <Pressable 
                            onPress={() => setSelectedLogId(isSelected ? null : log.id)}
                            className="h-10 px-5 rounded-[14px] items-center justify-center border"
                            style={{ 
                              backgroundColor: isSelected 
                                ? (isDark ? `${colors.accent}20` : `${colors.accent}15`) 
                                : "transparent",
                              borderColor: isSelected ? colors.accent : isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.1)"
                            }}
                          >
                            <Text 
                              className="text-xs font-outfit-bold uppercase tracking-wider"
                              style={{ color: isSelected ? colors.accent : colors.textSecondary }}
                            >
                              {isSelected ? "Close" : "Review"}
                            </Text>
                          </Pressable>
                        </View>

                        {isSelected && (
                          <View className="mt-8 border-t pt-8" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)" }}>
                            {log.athleteType === "adult" ? (
                              <View className="gap-6">
                                <View>
                                  <Text className="text-[11px] font-outfit-bold text-textSecondary uppercase tracking-[1.2px] mb-2 ml-1">Food Diary</Text>
                                  <View className="p-5 rounded-[22px]" style={innerCardStyle}>
                                    <Text className="text-[16px] font-outfit text-app leading-relaxed">
                                      {log.foodDiary || "No food entry for this date."}
                                    </Text>
                                  </View>
                                </View>
                                <View className="flex-row flex-wrap gap-4">
                                  <StatBox icon="droplet" label="Water" value={`${log.waterIntake ?? 0}L`} color="#3B82F6" />
                                  <StatBox icon="activity" label="Steps" value={log.steps?.toLocaleString() ?? "0"} color="#10B981" />
                                  <StatBox icon="moon" label="Sleep" value={`${log.sleepHours ?? 0}h`} color="#8B5CF6" />
                                </View>
                              </View>
                            ) : (
                              <View className="gap-4">
                                <MealRow label="Breakfast" value={log.breakfast} />
                                <MealRow label="Lunch" value={log.lunch} />
                                <MealRow label="Dinner" value={log.dinner} />
                                <MealRow label="Snacks" value={log.snacks} />
                                <MealRow label="Water" value={`${log.waterIntake ?? 0} glasses`} />
                              </View>
                            )}

                            <View className="mt-8 rounded-[28px] border p-6 bg-accent/5 border-accent/10">
                              <View className="flex-row items-center gap-3 mb-5">
                                <Feather name="message-circle" size={20} color={colors.accent} />
                                <Text className="text-[13px] font-outfit-bold text-accent uppercase tracking-[1.5px]">Coach Feedback</Text>
                              </View>
                              
                              {log.coachFeedback ? (
                                <Text className="text-[16px] font-outfit text-app mb-6 leading-relaxed">{log.coachFeedback}</Text>
                              ) : (
                                <TextInput
                                  value={feedbackDraft}
                                  onChangeText={setFeedbackDraft}
                                  placeholder="Provide guidance or feedback on this log..."
                                  multiline
                                  className="rounded-[20px] border px-4 py-4 text-[16px] font-outfit text-app mb-6"
                                  style={{ ...innerCardStyle, minHeight: 120, textAlignVertical: 'top' }}
                                  placeholderTextColor={colors.placeholder}
                                />
                              )}

                              {log.coachFeedbackMediaUrl ? (
                                <View className="mb-6 rounded-[22px] overflow-hidden">
                                  <VideoPlayer uri={log.coachFeedbackMediaUrl} height={220} />
                                </View>
                              ) : responseVideo ? (
                                <View className="mb-6">
                                  <View className="rounded-[22px] overflow-hidden shadow-sm">
                                    <VideoPlayer uri={responseVideo.uri} height={220} />
                                  </View>
                                  <Pressable onPress={() => setResponseVideo(null)} className="mt-3 self-end">
                                    <Text className="text-sm font-outfit-semibold text-danger">Remove video response</Text>
                                  </Pressable>
                                </View>
                              ) : !log.coachFeedback ? (
                                <View className="flex-row gap-3 mb-6">
                                  <Pressable 
                                    onPress={() => void pickResponseVideo("camera")}
                                    className="flex-1 h-14 rounded-[18px] flex-row items-center justify-center bg-card border border-app/10"
                                  >
                                    <Feather name="video" size={18} color={colors.text} />
                                    <Text className="ml-2 font-outfit-semibold">Record</Text>
                                  </Pressable>
                                  <Pressable 
                                    onPress={() => void pickResponseVideo("library")}
                                    className="flex-1 h-14 rounded-[18px] flex-row items-center justify-center bg-card border border-app/10"
                                  >
                                    <Feather name="image" size={18} color={colors.text} />
                                    <Text className="ml-2 font-outfit-semibold">Upload</Text>
                                  </Pressable>
                                </View>
                              ) : null}

                              {!log.coachFeedback && (
                                <SmallAction
                                  label={savingFeedback ? "Sending Response..." : "Send Feedback"}
                                  tone="success"
                                  onPress={() => void submitFeedback()}
                                  disabled={savingFeedback || (!feedbackDraft.trim() && !responseVideo)}
                                />
                              )}
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })
              ) : (
                logs.filter(l => l.coachFeedback || l.coachFeedbackMediaUrl).map(log => (
                  <View key={log.id} className="rounded-[32px] border p-6" style={cardStyle}>
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-2xl font-clash font-bold text-app">{log.dateKey}</Text>
                      <Feather name="check-circle" size={20} color={colors.accent} />
                    </View>
                    <Text className="text-xs font-outfit-bold text-textSecondary uppercase tracking-[1px] mb-6">Feedback sent</Text>
                    
                    {log.coachFeedback && (
                      <View className="p-5 rounded-[22px] mb-4" style={innerCardStyle}>
                        <Text className="text-[16px] font-outfit text-app leading-relaxed">{log.coachFeedback}</Text>
                      </View>
                    )}
                    {log.coachFeedbackMediaUrl && (
                      <View className="rounded-[22px] overflow-hidden">
                        <VideoPlayer uri={log.coachFeedbackMediaUrl} height={200} />
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ThemedScrollView>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {selectedUserId ? renderAthleteDetails() : renderAthleteList()}
    </View>
  );
}

function StatBox({ icon, label, value, color }: { icon: any, label: string, value: string, color: string }) {
  const { isDark } = useAppTheme();
  return (
    <View 
      className="flex-1 min-w-[100px] p-5 rounded-[26px] border"
      style={{
        backgroundColor: isDark ? `${color}15` : `${color}08`,
        borderColor: isDark ? `${color}25` : `${color}15`,
      }}
    >
      <Feather name={icon} size={18} color={color} className="mb-3" />
      <Text className="text-2xl font-clash font-bold text-app" style={{ color: color }}>{value}</Text>
      <Text className="text-[11px] font-outfit-bold text-textSecondary uppercase tracking-wider">{label}</Text>
    </View>
  );
}

function MealRow({ label, value }: { label: string, value: string | null | undefined }) {
  const { isDark } = useAppTheme();
  return (
    <View 
      className="flex-row items-center p-5 rounded-[22px] border"
      style={{
        backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
      }}
    >
      <View className="w-24">
        <Text className="text-[11px] font-outfit-bold text-textSecondary uppercase tracking-wider">{label}</Text>
      </View>
      <Text className="flex-1 text-[15px] font-outfit text-app" numberOfLines={2}>
        {value || "—"}
      </Text>
    </View>
  );
}
