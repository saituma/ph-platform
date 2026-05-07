import {
  AdminScreen,
  AdminHeader,
  AdminBackButton,
  AdminCard,
  AdminButton,
  AdminBadge,
  AdminInput,
  AdminFormField,
  AdminSegmentedTabs,
  AdminEmptyState,
  AdminLoadingState,
  AdminModalContainer,
  AdminModalTitle,
  AdminModalSubtitle,
  AdminIconButton,
  useAdminPastel,
} from "@/components/admin/AdminUI";
import type { AdminCardColor } from "@/constants/theme";
import { Text } from "@/components/ScaledText";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { VideoPlayer } from "@/components/media/VideoPlayer";
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
import { BackHandler, Modal, Platform, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import {
  ChevronRight,
  Coffee,
  Droplets,
  Footprints,
  Moon,
  MessageCircle,
  FileText,
  Users,
  User,
  Video,
  Upload,
  Target,
  Save,
  CheckCircle,
  X,
} from "lucide-react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

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

const CARD_COLORS: AdminCardColor[] = ["sage", "pink", "lavender", "peach", "mint", "yellow"];

export default function AdminNutritionScreen() {
  const p = useAdminPastel();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
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
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);

  useEffect(() => {
    void loadUsers(searchQuery);
  }, [loadUsers, searchQuery]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (feedbackModalVisible) {
        setFeedbackModalVisible(false);
        return true;
      }
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
  }, [feedbackModalVisible, selectedLogId, selectedUserId]);

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
          { token },
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
      setFeedbackModalVisible(false);
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

  const adultAthletes = useMemo(
    () => users.filter((u) => (u as any).athleteType === "adult"),
    [users],
  );
  const youthAthletes = useMemo(
    () => users.filter((u) => (u as any).athleteType === "youth" || u.role === "guardian"),
    [users],
  );

  // --- Feedback Modal ---
  const renderFeedbackModal = () => {
    if (!selectedLog) return null;

    return (
      <Modal
        visible={feedbackModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFeedbackModalVisible(false)}
      >
        <AdminModalContainer onClose={() => setFeedbackModalVisible(false)} position="bottom">
          <AdminModalTitle>Coach Feedback</AdminModalTitle>
          <AdminModalSubtitle>
            {`Provide guidance for the log on ${selectedLog.dateKey}`}
          </AdminModalSubtitle>

          {selectedLog.coachFeedback ? (
            <AdminCard color="sage" style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontFamily: "Outfit-Regular",
                  fontSize: 15,
                  lineHeight: 22,
                  color: p.textPrimary,
                }}
              >
                {selectedLog.coachFeedback}
              </Text>
            </AdminCard>
          ) : (
            <AdminFormField
              label="Feedback"
              value={feedbackDraft}
              onChangeText={setFeedbackDraft}
              placeholder="Provide guidance or feedback on this log..."
              multiline
            />
          )}

          {selectedLog.coachFeedbackMediaUrl ? (
            <View style={{ borderRadius: 20, overflow: "hidden", marginBottom: 16 }}>
              <VideoPlayer uri={selectedLog.coachFeedbackMediaUrl} height={200} />
            </View>
          ) : responseVideo ? (
            <View style={{ marginBottom: 16 }}>
              <View style={{ borderRadius: 20, overflow: "hidden" }}>
                <VideoPlayer uri={responseVideo.uri} height={200} />
              </View>
              <Pressable
                onPress={() => setResponseVideo(null)}
                style={{ alignSelf: "flex-end", marginTop: 8 }}
              >
                <Text
                  style={{
                    fontFamily: "Outfit-SemiBold",
                    fontSize: 13,
                    color: p.danger,
                  }}
                >
                  Remove video
                </Text>
              </Pressable>
            </View>
          ) : !selectedLog.coachFeedback ? (
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
              <AdminButton
                label="Record"
                variant="secondary"
                icon={Video}
                onPress={() => void pickResponseVideo("camera")}
                compact
                style={{ flex: 1 }}
              />
              <AdminButton
                label="Upload"
                variant="secondary"
                icon={Upload}
                onPress={() => void pickResponseVideo("library")}
                compact
                style={{ flex: 1 }}
              />
            </View>
          ) : null}

          {!selectedLog.coachFeedback && (
            <AdminButton
              label={savingFeedback ? "Sending..." : "Send Feedback"}
              variant="primary"
              icon={MessageCircle}
              onPress={() => void submitFeedback()}
              loading={savingFeedback}
              disabled={savingFeedback || (!feedbackDraft.trim() && !responseVideo)}
            />
          )}
        </AdminModalContainer>
      </Modal>
    );
  };

  // --- Athlete List ---
  const renderAthleteList = () => {
    const displayedAthletes = listTab === "adult" ? adultAthletes : youthAthletes;

    return (
      <AdminScreen>
        <AdminHeader
          title="Nutrition"
          subtitle="Review athlete logs and provide coach responses."
          right={<AdminBackButton onPress={() => router.back()} />}
        />

        <AdminSegmentedTabs
          tabs={[
            { key: "adult" as const, label: "Adult", icon: User },
            { key: "youth" as const, label: "Youth", icon: Users },
          ]}
          value={listTab}
          onChange={setListTab}
        />

        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(100).duration(350).springify()}
          style={{ paddingHorizontal: 24, marginBottom: 16 }}
        >
          <AdminInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={`Search ${listTab} athletes...`}
            onClear={searchQuery ? () => setSearchQuery("") : undefined}
          />
        </Animated.View>

        <ThemedScrollView showsVerticalScrollIndicator={false}>
          {usersLoading && users.length === 0 ? (
            <AdminLoadingState label="Loading athletes..." />
          ) : displayedAthletes.length === 0 ? (
            <AdminEmptyState
              icon={Users}
              title={`No ${listTab} athletes found`}
              description="Try adjusting your search or check back later."
              color="lavender"
            />
          ) : (
            <View style={{ paddingHorizontal: 24, paddingBottom: 60, gap: 12 }}>
              {displayedAthletes.map((u, idx) => (
                <Animated.View
                  key={u.id}
                  entering={
                    reduceMotion
                      ? undefined
                      : FadeInDown.delay(80 + idx * 40)
                          .duration(350)
                          .springify()
                  }
                >
                  <AdminCard
                    color={CARD_COLORS[idx % CARD_COLORS.length]}
                    onPress={() => u.id && setSelectedUserId(u.id)}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 14,
                          backgroundColor: p.accentSoft,
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 14,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Outfit-Bold",
                            fontSize: 14,
                            color: p.accent,
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
                            color: p.textPrimary,
                            marginBottom: 2,
                          }}
                          numberOfLines={1}
                        >
                          {u.name}
                        </Text>
                        <Text
                          style={{
                            fontFamily: "Outfit-Regular",
                            fontSize: 13,
                            color: p.textSecondary,
                          }}
                          numberOfLines={1}
                        >
                          {u.email}
                        </Text>
                      </View>
                      <ChevronRight size={18} color={p.accent} strokeWidth={2.2} />
                    </View>
                  </AdminCard>
                </Animated.View>
              ))}
            </View>
          )}
        </ThemedScrollView>
      </AdminScreen>
    );
  };

  // --- Athlete Details ---
  const renderAthleteDetails = () => (
    <AdminScreen>
      <AdminHeader
        title={selectedUser?.name ?? "Athlete"}
        subtitle={selectedUser?.email ?? ""}
        compact
        right={<AdminBackButton onPress={() => setSelectedUserId(null)} />}
      />

      <AdminSegmentedTabs
        tabs={[
          { key: "logs" as const, label: "Logs", icon: FileText },
          { key: "coach" as const, label: "Feedback", icon: MessageCircle },
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />

      <ThemedScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 24, paddingBottom: 80, paddingTop: 8 }}>
          {/* Nutrition Targets for adult athletes */}
          {(selectedUser as any)?.athleteType === "adult" && (
            <Animated.View
              entering={reduceMotion ? undefined : FadeInDown.delay(60).duration(350).springify()}
            >
              <AdminCard color="peach" style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 13,
                      backgroundColor: p.accentSoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Target size={18} color={p.accent} strokeWidth={2.2} />
                  </View>
                  <Text
                    style={{
                      fontFamily: "Outfit-Bold",
                      fontSize: 17,
                      color: p.textPrimary,
                      letterSpacing: -0.2,
                    }}
                  >
                    Nutrition Targets
                  </Text>
                </View>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                  <View style={{ width: "47%" }}>
                    <AdminFormField
                      label="Calories"
                      value={targetsDraft.calories}
                      onChangeText={(v) => setTargetsDraft((prev) => ({ ...prev, calories: v }))}
                      keyboardType="number-pad"
                      placeholder="2600"
                    />
                  </View>
                  <View style={{ width: "47%" }}>
                    <AdminFormField
                      label="Protein (g)"
                      value={targetsDraft.protein}
                      onChangeText={(v) => setTargetsDraft((prev) => ({ ...prev, protein: v }))}
                      keyboardType="number-pad"
                      placeholder="180"
                    />
                  </View>
                  <View style={{ width: "47%" }}>
                    <AdminFormField
                      label="Carbs (g)"
                      value={targetsDraft.carbs}
                      onChangeText={(v) => setTargetsDraft((prev) => ({ ...prev, carbs: v }))}
                      keyboardType="number-pad"
                      placeholder="280"
                    />
                  </View>
                  <View style={{ width: "47%" }}>
                    <AdminFormField
                      label="Fats (g)"
                      value={targetsDraft.fats}
                      onChangeText={(v) => setTargetsDraft((prev) => ({ ...prev, fats: v }))}
                      keyboardType="number-pad"
                      placeholder="80"
                    />
                  </View>
                </View>

                <AdminFormField
                  label="Micronutrient Guidance"
                  value={targetsDraft.micronutrientsGuidance}
                  onChangeText={(v) =>
                    setTargetsDraft((prev) => ({ ...prev, micronutrientsGuidance: v }))
                  }
                  multiline
                  placeholder="e.g. Focus on iron-rich foods like spinach and lean red meat..."
                />

                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 }}>
                  <AdminButton
                    label={savingTargets ? "Saving..." : "Save Targets"}
                    variant="primary"
                    icon={Save}
                    onPress={() => void saveTargets()}
                    loading={savingTargets}
                    style={{ flex: 1 }}
                  />
                  {targetsStatus && (
                    <AdminBadge color="sage">
                      {targetsStatus}
                    </AdminBadge>
                  )}
                </View>
              </AdminCard>
            </Animated.View>
          )}

          {/* Logs Content */}
          {logsLoading ? (
            <AdminLoadingState label="Loading logs..." />
          ) : logsError ? (
            <AdminCard color="pink">
              <Text
                style={{
                  fontFamily: "Outfit-Regular",
                  fontSize: 14,
                  color: p.danger,
                  textAlign: "center",
                }}
              >
                {logsError}
              </Text>
            </AdminCard>
          ) : logs.length === 0 ? (
            <AdminEmptyState
              icon={Coffee}
              title="No nutrition logs yet"
              description="This athlete hasn't recorded any nutrition logs."
              color="peach"
            />
          ) : (
            <View style={{ gap: 14 }}>
              {activeTab === "logs"
                ? logs.map((log, idx) => {
                    const isSelected = log.id === selectedLogId;
                    const cardColor = CARD_COLORS[idx % CARD_COLORS.length];

                    return (
                      <Animated.View
                        key={log.id}
                        entering={
                          reduceMotion
                            ? undefined
                            : FadeInDown.delay(80 + idx * 30)
                                .duration(320)
                                .springify()
                        }
                      >
                        <AdminCard color={cardColor}>
                          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={{
                                  fontFamily: "Outfit-Bold",
                                  fontSize: 18,
                                  color: p.textPrimary,
                                  letterSpacing: -0.3,
                                }}
                              >
                                {log.dateKey}
                              </Text>
                              <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
                                <AdminBadge color={log.athleteType === "adult" ? "lavender" : "mint"}>
                                  {log.athleteType === "adult" ? "Adult" : "Youth"}
                                </AdminBadge>
                                {log.coachFeedback && (
                                  <AdminBadge color="sage">Reviewed</AdminBadge>
                                )}
                              </View>
                            </View>
                            <AdminButton
                              label={isSelected ? "Close" : "Review"}
                              variant={isSelected ? "ghost" : "secondary"}
                              onPress={() => setSelectedLogId(isSelected ? null : log.id)}
                              compact
                            />
                          </View>

                          {isSelected && (
                            <View style={{ marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: p.divider }}>
                              {log.athleteType === "adult" ? (
                                <View style={{ gap: 14 }}>
                                  {/* Food Diary */}
                                  <View>
                                    <Text
                                      style={{
                                        fontFamily: "Outfit-Bold",
                                        fontSize: 11,
                                        letterSpacing: 1,
                                        textTransform: "uppercase",
                                        color: p.textMuted,
                                        marginBottom: 8,
                                      }}
                                    >
                                      Food Diary
                                    </Text>
                                    <AdminCard color="white" padding={16}>
                                      <Text
                                        style={{
                                          fontFamily: "Outfit-Regular",
                                          fontSize: 15,
                                          lineHeight: 22,
                                          color: p.textPrimary,
                                        }}
                                      >
                                        {log.foodDiary || "No food entry for this date."}
                                      </Text>
                                    </AdminCard>
                                  </View>

                                  {/* Stat badges */}
                                  <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                                    <StatBadge icon={Droplets} label="Water" value={`${log.waterIntake ?? 0}L`} color="mint" />
                                    <StatBadge icon={Footprints} label="Steps" value={log.steps?.toLocaleString() ?? "0"} color="sage" />
                                    <StatBadge icon={Moon} label="Sleep" value={`${log.sleepHours ?? 0}h`} color="lavender" />
                                  </View>
                                </View>
                              ) : (
                                <View style={{ gap: 8 }}>
                                  <MealRow label="Breakfast" value={log.breakfast} color="yellow" />
                                  <MealRow label="Lunch" value={log.lunch} color="peach" />
                                  <MealRow label="Dinner" value={log.dinner} color="sage" />
                                  <MealRow label="Snacks" value={log.snacks} color="pink" />
                                  <MealRow label="Water" value={`${log.waterIntake ?? 0} glasses`} color="mint" />
                                </View>
                              )}

                              {/* Coach feedback action */}
                              <View style={{ marginTop: 16 }}>
                                <AdminButton
                                  label={log.coachFeedback ? "View Feedback" : "Give Feedback"}
                                  variant="primary"
                                  icon={MessageCircle}
                                  onPress={() => {
                                    setSelectedLogId(log.id);
                                    setFeedbackModalVisible(true);
                                  }}
                                />
                              </View>
                            </View>
                          )}
                        </AdminCard>
                      </Animated.View>
                    );
                  })
                : logs
                    .filter((l) => l.coachFeedback || l.coachFeedbackMediaUrl)
                    .map((log, idx) => (
                      <Animated.View
                        key={log.id}
                        entering={
                          reduceMotion
                            ? undefined
                            : FadeInDown.delay(80 + idx * 30)
                                .duration(320)
                                .springify()
                        }
                      >
                        <AdminCard color="sage">
                          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                            <Text
                              style={{
                                fontFamily: "Outfit-Bold",
                                fontSize: 18,
                                color: p.textPrimary,
                                letterSpacing: -0.3,
                              }}
                            >
                              {log.dateKey}
                            </Text>
                            <CheckCircle size={20} color={p.success} strokeWidth={2.2} />
                          </View>

                          <AdminBadge color="sage" style={{ alignSelf: "flex-start", marginBottom: 12 }}>
                            Feedback sent
                          </AdminBadge>

                          {log.coachFeedback && (
                            <View
                              style={{
                                padding: 14,
                                borderRadius: 16,
                                backgroundColor: p.inputBg,
                                marginBottom: log.coachFeedbackMediaUrl ? 12 : 0,
                              }}
                            >
                              <Text
                                style={{
                                  fontFamily: "Outfit-Regular",
                                  fontSize: 15,
                                  lineHeight: 22,
                                  color: p.textPrimary,
                                }}
                              >
                                {log.coachFeedback}
                              </Text>
                            </View>
                          )}
                          {log.coachFeedbackMediaUrl && (
                            <View style={{ borderRadius: 16, overflow: "hidden" }}>
                              <VideoPlayer uri={log.coachFeedbackMediaUrl} height={200} />
                            </View>
                          )}
                        </AdminCard>
                      </Animated.View>
                    ))}
            </View>
          )}
        </View>
      </ThemedScrollView>

      {renderFeedbackModal()}
    </AdminScreen>
  );

  return selectedUserId ? renderAthleteDetails() : renderAthleteList();
}

// --- Helper Components ---

function StatBadge({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  color: AdminCardColor;
}) {
  const p = useAdminPastel();

  return (
    <AdminCard color={color} padding={14} style={{ flex: 1, minWidth: 90 }}>
      <Icon size={16} color={p.accent} strokeWidth={2} style={{ marginBottom: 6 }} />
      <Text
        style={{
          fontFamily: "Outfit-Bold",
          fontSize: 18,
          color: p.textPrimary,
          marginBottom: 2,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: "Outfit-Bold",
          fontSize: 10,
          letterSpacing: 1,
          textTransform: "uppercase",
          color: p.textMuted,
        }}
      >
        {label}
      </Text>
    </AdminCard>
  );
}

function MealRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string | null | undefined;
  color: AdminCardColor;
}) {
  const p = useAdminPastel();

  return (
    <AdminCard color={color} padding={14}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: 80 }}>
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: 11,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              color: p.textMuted,
            }}
          >
            {label}
          </Text>
        </View>
        <Text
          style={{
            flex: 1,
            fontFamily: "Outfit-Regular",
            fontSize: 15,
            color: p.textPrimary,
          }}
          numberOfLines={2}
        >
          {value || "—"}
        </Text>
      </View>
    </AdminCard>
  );
}
