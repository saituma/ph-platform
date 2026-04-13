import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text, TextInput } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import { Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/api";
import { useAdminUsers } from "@/hooks/admin/useAdminUsers";
import { useMediaUpload } from "@/hooks/messages/useMediaUpload";
import { useAppSelector } from "@/store/hooks";
import type { PendingAttachment } from "@/types/admin-messages";
import type { AdminUser } from "@/types/admin";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, View, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@/components/ui/theme-icons";
import { SafeAreaView } from "react-native-safe-area-context";

type NutritionLog = {
  id: number;
  userId: number;
  dateKey: string;
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
  const { colors, isDark } = useAppTheme();
  
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
  const insets = useSafeAreaInsets();
  const token = useAppSelector((state) => state.user.token);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);

  const [listTab, setListTab] = useState<"adult" | "youth">("adult");
  const [searchQuery, setSearchQuery] = useState("");
  const {
    users,
    loading: usersLoading,
    error: usersError,
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

  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [targetsLoading, setTargetsLoading] = useState(false);
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
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  useEffect(() => {
    void loadUsers(searchQuery);
  }, [loadUsers, searchQuery]);

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
              mediaTypes: ImagePicker.MediaTypeOptions.Videos,
              cameraType: ImagePicker.CameraType.Front,
              quality: 1,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Videos,
              quality: 1,
            });

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
      <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
        <ThemedScrollView showsVerticalScrollIndicator={false}>
          <View className="pt-10 mb-6 px-6">
            <View className="flex-row items-center gap-3 mb-2">
              <View className="h-8 w-1.5 rounded-full bg-accent" />
              <Text className="text-5xl font-telma-bold text-app tracking-tight">
                Nutrition
              </Text>
            </View>
            <Text className="text-base font-outfit text-secondary leading-relaxed">
              Review athlete logs and provide coach responses.
            </Text>
          </View>

          {/* Adult / Youth Header Tabs */}
          <View className="px-6 mb-8">
            <View 
              className="flex-row p-1.5 rounded-[26px] border"
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
                borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
              }}
            >
              <Pressable
                onPress={() => setListTab("adult")}
                className="flex-1 h-12 rounded-[20px] items-center justify-center"
                style={{
                  backgroundColor: listTab === "adult" 
                    ? (isDark ? `${colors.accent}20` : `${colors.accent}15`) 
                    : "transparent",
                }}
              >
                <Text 
                  className="font-outfit-bold text-[14px] uppercase tracking-wider"
                  style={{ color: listTab === "adult" ? colors.accent : colors.textSecondary }}
                >
                  Adult
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setListTab("youth")}
                className="flex-1 h-12 rounded-[20px] items-center justify-center"
                style={{
                  backgroundColor: listTab === "youth" 
                    ? (isDark ? `${colors.accent}20` : `${colors.accent}15`) 
                    : "transparent",
                }}
              >
                <Text 
                  className="font-outfit-bold text-[14px] uppercase tracking-wider"
                  style={{ color: listTab === "youth" ? colors.accent : colors.textSecondary }}
                >
                  Youth
                </Text>
              </Pressable>
            </View>
          </View>

          <View className="px-6 mb-8">
            <View 
              className="flex-row items-center rounded-2xl border px-4 h-14"
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
                borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)",
              }}
            >
              <Feather name="search" size={20} color={colors.textSecondary} />
              <TextInput
                placeholder={`Search ${listTab} athletes...`}
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 ml-3 font-outfit text-[16px] text-app"
                placeholderTextColor={colors.placeholder}
              />
            </View>
          </View>

          {usersLoading && users.length === 0 ? (
            <View className="px-6 gap-6">
              <Skeleton width="100%" height={120} borderRadius={32} />
              <Skeleton width="100%" height={120} borderRadius={32} />
            </View>
          ) : (
            <View className="px-6 pb-32">
              <View>
                <View className="flex-row items-center gap-2 mb-4">
                  <View className="h-4 w-1 rounded-full bg-accent" />
                  <Text className="text-sm font-bold font-outfit text-textSecondary uppercase tracking-wider">
                    {listTab === "adult" ? "Adult Athletes" : "Youth Athletes"}
                  </Text>
                </View>
                {displayedAthletes.length === 0 ? (
                  <View className="p-8 rounded-[32px] border border-dashed border-app/20 items-center justify-center">
                    <Text className="text-sm font-outfit text-textSecondary italic">No {listTab} athletes found.</Text>
                  </View>
                ) : (
                  <View className="gap-4">
                    {displayedAthletes.map(u => (
                      <Pressable
                        key={u.id}
                        onPress={() => u.id && setSelectedUserId(u.id)}
                        className="rounded-[32px] border p-6 flex-row items-center"
                        style={cardStyle}
                      >
                        <View className="flex-1">
                          <Text className="text-xl font-clash font-bold text-app mb-1">{u.name}</Text>
                          <Text className="text-sm font-outfit text-textSecondary">{u.email}</Text>
                        </View>
                        <View className="h-10 w-10 rounded-full items-center justify-center bg-accent/10">
                          <Feather name="chevron-right" size={20} color={colors.accent} />
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
        </ThemedScrollView>
      </SafeAreaView>
    );
  };

  const renderAthleteDetails = () => (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View 
        className="px-6 pb-6 flex-row items-center justify-between"
        style={{ paddingTop: insets.top + 24 }}
      >
        <Pressable 
          onPress={() => setSelectedUserId(null)}
          className="h-12 w-12 items-center justify-center rounded-full border"
          style={{ 
            backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)",
            borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)"
          }}
        >
          <Feather name="chevron-left" size={24} color={colors.text} />
        </Pressable>
        <View className="flex-1 items-center px-4">
          <Text className="text-2xl font-clash font-bold text-app" numberOfLines={1}>
            {selectedUser?.name}
          </Text>
        </View>
        <View className="w-12" />
      </View>

      <ThemedScrollView showsVerticalScrollIndicator={false}>
        <View className="px-6 pb-40">
          {(selectedUser as any)?.athleteType === "adult" && (
            <View className="mb-10 rounded-[36px] border p-8" style={cardStyle}>
              <View className="flex-row items-center gap-3 mb-4">
                <View className="h-6 w-1.5 rounded-full bg-accent" />
                <Text className="text-xl font-clash font-bold text-app">Nutrition Targets</Text>
              </View>
              <Text className="text-sm font-outfit text-textSecondary mb-8 leading-relaxed">
                Configure suggested daily caloric and macronutrient targets for this athlete.
              </Text>
              
              <View className="flex-row flex-wrap gap-x-4">
                <View className="w-[47%]">
                  <FormInput
                    label="Calories"
                    value={targetsDraft.calories}
                    onChangeText={v => setTargetsDraft(prev => ({ ...prev, calories: v }))}
                    keyboardType="numeric"
                    placeholder="2600"
                  />
                </View>
                <View className="w-[47%]">
                  <FormInput
                    label="Protein"
                    value={targetsDraft.protein}
                    onChangeText={v => setTargetsDraft(prev => ({ ...prev, protein: v }))}
                    keyboardType="numeric"
                    placeholder="180"
                    prefix="g"
                  />
                </View>
                <View className="w-[47%]">
                  <FormInput
                    label="Carbs"
                    value={targetsDraft.carbs}
                    onChangeText={v => setTargetsDraft(prev => ({ ...prev, carbs: v }))}
                    keyboardType="numeric"
                    placeholder="280"
                    prefix="g"
                  />
                </View>
                <View className="w-[47%]">
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

              <View className="flex-row items-center gap-5 mt-2">
                <View className="flex-1">
                  <ActionButton
                    label={savingTargets ? "Saving..." : "Save Targets"}
                    onPress={() => void saveTargets()}
                    loading={savingTargets}
                    icon="save"
                  />
                </View>
                {targetsStatus && (
                  <View className="px-4 py-2 rounded-full bg-accent/10">
                    <Text className="text-xs font-outfit-bold text-accent uppercase tracking-wider">{targetsStatus}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          <View className="flex-row items-center gap-3 mb-8">
            <Pressable 
              onPress={() => setActiveTab("logs")}
              className="flex-1 h-14 rounded-[22px] items-center justify-center border"
              style={{
                backgroundColor: activeTab === "logs" 
                  ? (isDark ? `${colors.accent}20` : `${colors.accent}15`) 
                  : "transparent",
                borderColor: activeTab === "logs" ? colors.accent : isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.1)",
              }}
            >
              <Text 
                className="font-outfit-bold text-[15px] uppercase tracking-wider"
                style={{ color: activeTab === "logs" ? colors.accent : colors.text }}
              >
                Logs
              </Text>
            </Pressable>
            <Pressable 
              onPress={() => setActiveTab("coach")}
              className="flex-1 h-14 rounded-[22px] items-center justify-center border"
              style={{
                backgroundColor: activeTab === "coach" 
                  ? (isDark ? `${colors.accent}20` : `${colors.accent}15`) 
                  : "transparent",
                borderColor: activeTab === "coach" ? colors.accent : isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.1)",
              }}
            >
              <Text 
                className="font-outfit-bold text-[15px] uppercase tracking-wider"
                style={{ color: activeTab === "coach" ? colors.accent : colors.text }}
              >
                Feedback
              </Text>
            </Pressable>
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
  const { isDark, colors } = useAppTheme();
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
  const { isDark, colors } = useAppTheme();
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
