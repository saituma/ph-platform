import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSelector } from "@/store/hooks";
import { canAccessTier } from "@/lib/planAccess";
import { VideoUploadPanel } from "@/components/programs/ProgramPanels";
import { ProgramId } from "@/constants/program-details";

import { useSessionData } from "@/hooks/programs/useSessionData";
import { useSessionUploads } from "@/hooks/programs/useSessionUploads";
import { SessionExerciseBlock } from "@/components/programs/SessionExerciseBlock";
import {
  finishTrainingContentV2Session,
  FinishTrainingSessionWorkoutLog,
} from "@/services/programs/programsService";
import { radius, spacing, fonts } from "@/constants/theme";

export default function ProgramSessionDetailScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { sessionId, programId, moduleId } = useLocalSearchParams<{
    sessionId: string;
    programId: ProgramId;
    moduleId: string;
  }>();
  const { token, programTier, athleteUserId, managedAthletes } = useAppSelector(
    (state) => state.user,
  );

  const activeAge = useMemo(() => {
    const selected =
      managedAthletes.find(
        (a) => a.id === athleteUserId || a.userId === athleteUserId,
      ) ?? managedAthletes[0];
    return selected?.age ?? null;
  }, [managedAthletes, athleteUserId]);

  const { workspace, isLoading, load, findModuleAndSession } = useSessionData(
    token,
    activeAge,
  );
  const { module, session } = findModuleAndSession(
    Number(sessionId),
    Number(moduleId),
  );
  const { uploadsBySectionId, hasUploadedBySectionId, loadUploadsForSection } =
    useSessionUploads(token, athleteUserId);

  const [workoutSheetOpen, setWorkoutSheetOpen] = useState(false);
  const [weightsUsed, setWeightsUsed] = useState("");
  const [repsCompleted, setRepsCompleted] = useState("");
  const [rpeText, setRpeText] = useState("");
  const [finishError, setFinishError] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);

  const [uploadTarget, setUploadTarget] = useState<{
    sectionContentId: number;
    sectionTitle: string;
    autoPickSource?: "camera" | "library";
  } | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!session?.items) return;
    session.items
      .filter((i) => i.allowVideoUpload)
      .forEach((i) => loadUploadsForSection(i.id));
  }, [session, loadUploadsForSection]);

  const warmupItems = useMemo(
    () => session?.items.filter((i) => i.blockType === "warmup") ?? [],
    [session],
  );
  const mainItems = useMemo(
    () => session?.items.filter((i) => i.blockType === "main") ?? [],
    [session],
  );
  const cooldownItems = useMemo(
    () => session?.items.filter((i) => i.blockType === "cooldown") ?? [],
    [session],
  );

  const completionAnchorItemId = useMemo(() => {
    const lastCooldown = cooldownItems[cooldownItems.length - 1];
    const lastMain = mainItems[mainItems.length - 1];
    const lastWarmup = warmupItems[warmupItems.length - 1];
    return (lastCooldown ?? lastMain ?? lastWarmup)?.id;
  }, [cooldownItems, mainItems, warmupItems]);

  const isAdult = (activeAge ?? 0) >= 18;
  const sessionIdNum = Number(sessionId);
  const moduleIdNum = Number(moduleId);

  const computeNextPath = useCallback(
    (ws: any) => {
      const modules = Array.isArray(ws?.modules) ? (ws.modules as any[]) : [];
      if (!modules.length) return null;

      const sortedModules = [...modules].sort(
        (a, b) => Number(a?.order ?? 0) - Number(b?.order ?? 0),
      );

      const effectiveModule =
        Number.isFinite(moduleIdNum) && moduleIdNum > 0
          ? sortedModules.find((m) => m.id === moduleIdNum)
          : sortedModules.find((m) =>
              (m.sessions ?? []).some((s: any) => s.id === sessionIdNum),
            );
      if (!effectiveModule) return null;

      const mIdx = sortedModules.findIndex((m) => m.id === effectiveModule.id);
      if (mIdx < 0) return null;

      const sortedSessions = [...(effectiveModule.sessions ?? [])].sort(
        (a: any, b: any) => Number(a?.order ?? 0) - Number(b?.order ?? 0),
      );
      const sIdx = sortedSessions.findIndex((s: any) => s.id === sessionIdNum);

      if (sIdx >= 0 && sIdx < sortedSessions.length - 1) {
        const nextSession = sortedSessions[sIdx + 1];
        if (nextSession && !nextSession.locked) {
          return `/programs/session/${nextSession.id}?programId=${programId}&moduleId=${effectiveModule.id}`;
        }
      }

      for (let i = mIdx + 1; i < sortedModules.length; i++) {
        const nextM = sortedModules[i];
        if (!nextM || nextM.locked) continue;
        return `/programs/module/${nextM.id}?programId=${programId}`;
      }

      return null;
    },
    [moduleIdNum, programId, sessionIdNum],
  );

  const handleUploadPress = useCallback((id: number, title: string) => {
    Alert.alert("Video Upload", "Choose an action", [
      {
        text: "Record",
        onPress: () =>
          setUploadTarget({
            sectionContentId: id,
            sectionTitle: title,
            autoPickSource: "camera",
          }),
      },
      {
        text: "Library",
        onPress: () =>
          setUploadTarget({
            sectionContentId: id,
            sectionTitle: title,
            autoPickSource: "library",
          }),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }, []);

  const finishAndNavigate = useCallback(
    async (workoutLog: FinishTrainingSessionWorkoutLog | null) => {
      if (!token) {
        setFinishError("Not signed in.");
        return;
      }
      if (!Number.isFinite(sessionIdNum) || sessionIdNum <= 0) {
        setFinishError("Invalid session.");
        return;
      }

      setIsFinishing(true);
      setFinishError(null);
      try {
        await finishTrainingContentV2Session(token, sessionIdNum, workoutLog);
        const updated = await load(true);
        const path = computeNextPath(updated);
        setWorkoutSheetOpen(false);
        if (path) router.push(path as any);
        else router.back();
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to complete session.";
        setFinishError(message);
        throw e;
      } finally {
        setIsFinishing(false);
      }
    },
    [computeNextPath, load, router, sessionIdNum, token],
  );

  const handleCompleteSession = useCallback(async () => {
    if (isFinishing) return;

    if (isAdult) {
      setWeightsUsed("");
      setRepsCompleted("");
      setRpeText("");
      setFinishError(null);
      setWorkoutSheetOpen(true);
      return;
    }

    try {
      await finishAndNavigate(null);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to complete session.";
      Alert.alert("Couldn't complete", message);
    }
  }, [finishAndNavigate, isAdult, isFinishing]);

  if (isLoading && !workspace)
    return (
      <View className="flex-1 items-center justify-center bg-app">
        <ActivityIndicator color={colors.accent} />
      </View>
    );

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <ThemedScrollView
        onRefresh={() => load(true)}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="px-6 pt-4">
          <View className="flex-row items-center gap-3 mb-6">
            <Pressable
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
            >
              <Feather name="chevron-left" size={24} color="white" />
            </Pressable>
            <View>
              <Text className="text-2xl font-clash font-bold text-white">
                {session?.title ?? "Training Session"}
              </Text>
              <Text className="text-xs font-outfit text-white/60 uppercase tracking-widest">
                {module?.title}
              </Text>
            </View>
          </View>

          <SessionExerciseBlock
            title="Warmup"
            items={warmupItems}
            onUploadPress={handleUploadPress}
            hasUploaded={hasUploadedBySectionId}
            uploadsBySectionId={uploadsBySectionId}
            canUpload={canAccessTier(programTier, "PHP_Premium")}
            completionAnchorItemId={completionAnchorItemId}
            onCompleteSession={handleCompleteSession}
          />
          <SessionExerciseBlock
            title="Main Session"
            items={mainItems}
            onUploadPress={handleUploadPress}
            hasUploaded={hasUploadedBySectionId}
            uploadsBySectionId={uploadsBySectionId}
            canUpload={canAccessTier(programTier, "PHP_Premium")}
            completionAnchorItemId={completionAnchorItemId}
            onCompleteSession={handleCompleteSession}
          />
          <SessionExerciseBlock
            title="Cooldown"
            items={cooldownItems}
            onUploadPress={handleUploadPress}
            hasUploaded={hasUploadedBySectionId}
            uploadsBySectionId={uploadsBySectionId}
            canUpload={canAccessTier(programTier, "PHP_Premium")}
            completionAnchorItemId={completionAnchorItemId}
            onCompleteSession={handleCompleteSession}
          />
        </View>
      </ThemedScrollView>

      {uploadTarget && (
        <Modal visible animationType="slide">
          <SafeAreaView className="flex-1 bg-app">
            <View className="flex-row justify-between p-4 items-center">
              <Text className="text-lg font-clash font-bold text-white">
                Upload Video
              </Text>
              <Pressable
                onPress={() => {
                  setUploadTarget(null);
                  load(true);
                }}
              >
                <Feather name="x" size={24} color="white" />
              </Pressable>
            </View>
            <VideoUploadPanel
              {...uploadTarget}
              onUploaded={() => {
                const sectionContentId = uploadTarget.sectionContentId;
                setUploadTarget(null);
                loadUploadsForSection(sectionContentId, true);
                load(true);
              }}
            />
          </SafeAreaView>
        </Modal>
      )}

      <Modal
        visible={workoutSheetOpen}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!isFinishing) setWorkoutSheetOpen(false);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View
              style={{
                backgroundColor: colors.surface,
                borderTopLeftRadius: radius.xxl,
                borderTopRightRadius: radius.xxl,
                borderColor: colors.borderSubtle,
                borderWidth: 1,
                maxHeight: "85%",
                paddingTop: spacing.xl,
                paddingHorizontal: spacing.xl,
                paddingBottom: spacing.xl + insets.bottom,
              }}
            >
              <View className="flex-row items-center justify-between mb-3">
                <Text
                  style={{
                    fontFamily: fonts.heading1,
                    fontSize: 20,
                    color: colors.textPrimary,
                  }}
                >
                  Log workout (optional)
                </Text>
                <Pressable
                  onPress={() => setWorkoutSheetOpen(false)}
                  disabled={isFinishing}
                  className="h-10 w-10 items-center justify-center rounded-full"
                >
                  <Feather name="x" size={22} color={colors.textPrimary} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text
                  style={{
                    fontFamily: fonts.bodyMedium,
                    fontSize: 13,
                    color: colors.textSecondary,
                  }}
                >
                  Totally optional — you can complete without logging.
                </Text>

                <View style={{ marginTop: spacing.lg, gap: 10 }}>
                  <View>
                    <Text
                      style={{
                        fontFamily: fonts.heading3,
                        fontSize: 14,
                        color: colors.textPrimary,
                      }}
                    >
                      Weights used
                    </Text>
                    <View
                      style={{
                        marginTop: 6,
                        borderRadius: radius.xl,
                        backgroundColor: colors.surfaceHigh,
                        borderColor: colors.borderSubtle,
                        borderWidth: 1,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                      }}
                    >
                      <TextInput
                        value={weightsUsed}
                        onChangeText={setWeightsUsed}
                        placeholder="Optional"
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        style={{
                          fontFamily: fonts.bodyMedium,
                          fontSize: 14,
                          color: colors.textPrimary,
                          minHeight: 60,
                          textAlignVertical: "top",
                        }}
                        editable={!isFinishing}
                      />
                    </View>
                  </View>

                  <View>
                    <Text
                      style={{
                        fontFamily: fonts.heading3,
                        fontSize: 14,
                        color: colors.textPrimary,
                      }}
                    >
                      Reps completed
                    </Text>
                    <View
                      style={{
                        marginTop: 6,
                        borderRadius: radius.xl,
                        backgroundColor: colors.surfaceHigh,
                        borderColor: colors.borderSubtle,
                        borderWidth: 1,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                      }}
                    >
                      <TextInput
                        value={repsCompleted}
                        onChangeText={setRepsCompleted}
                        placeholder="Optional"
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        style={{
                          fontFamily: fonts.bodyMedium,
                          fontSize: 14,
                          color: colors.textPrimary,
                          minHeight: 60,
                          textAlignVertical: "top",
                        }}
                        editable={!isFinishing}
                      />
                    </View>
                  </View>

                  <View>
                    <Text
                      style={{
                        fontFamily: fonts.heading3,
                        fontSize: 14,
                        color: colors.textPrimary,
                      }}
                    >
                      RPE (1–10)
                    </Text>
                    <View
                      style={{
                        marginTop: 6,
                        borderRadius: radius.xl,
                        backgroundColor: colors.surfaceHigh,
                        borderColor: colors.borderSubtle,
                        borderWidth: 1,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                      }}
                    >
                      <TextInput
                        value={rpeText}
                        onChangeText={setRpeText}
                        placeholder="Optional"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="number-pad"
                        style={{
                          fontFamily: fonts.bodyMedium,
                          fontSize: 14,
                          color: colors.textPrimary,
                        }}
                        editable={!isFinishing}
                      />
                    </View>
                  </View>
                </View>

                {finishError ? (
                  <View style={{ marginTop: spacing.lg }}>
                    <Text
                      style={{
                        fontFamily: fonts.bodyMedium,
                        fontSize: 13,
                        color: colors.coral,
                      }}
                    >
                      {finishError}
                    </Text>
                  </View>
                ) : null}

                <View style={{ marginTop: spacing.xl, gap: 10 }}>
                  <Pressable
                    disabled={isFinishing}
                    onPress={async () => {
                      const w = weightsUsed.trim();
                      const r = repsCompleted.trim();
                      const rpeTrimmed = rpeText.trim();
                      const rpeNum = rpeTrimmed
                        ? Number.parseInt(rpeTrimmed, 10)
                        : null;
                      if (
                        rpeTrimmed &&
                        (!Number.isFinite(rpeNum) || Number.isNaN(rpeNum))
                      ) {
                        setFinishError("RPE must be a number 1–10.");
                        return;
                      }

                      const payload: FinishTrainingSessionWorkoutLog = {};
                      if (w) payload.weightsUsed = w;
                      if (r) payload.repsCompleted = r;
                      if (rpeTrimmed && rpeNum != null) payload.rpe = rpeNum;

                      try {
                        await finishAndNavigate(
                          Object.keys(payload).length ? payload : null,
                        );
                      } catch {
                        // keep sheet open; error shown above
                      }
                    }}
                    style={{
                      height: 54,
                      borderRadius: radius.xl,
                      backgroundColor: colors.accent,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 10,
                    }}
                  >
                    {isFinishing ? (
                      <ActivityIndicator color={colors.textInverse} />
                    ) : null}
                    <Text
                      style={{
                        fontFamily: fonts.heading3,
                        fontSize: 16,
                        color: colors.textInverse,
                      }}
                    >
                      Save & Complete
                    </Text>
                  </Pressable>

                  <Pressable
                    disabled={isFinishing}
                    onPress={async () => {
                      try {
                        await finishAndNavigate(null);
                      } catch {
                        // keep sheet open; error shown above
                      }
                    }}
                    style={{
                      height: 54,
                      borderRadius: radius.xl,
                      backgroundColor: "transparent",
                      borderColor: colors.borderSubtle,
                      borderWidth: 1,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.heading3,
                        fontSize: 16,
                        color: colors.textSecondary,
                      }}
                    >
                      Complete without logging
                    </Text>
                  </Pressable>

                  <Pressable
                    disabled={isFinishing}
                    onPress={() => setWorkoutSheetOpen(false)}
                    style={{
                      height: 44,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.heading3,
                        fontSize: 15,
                        color: colors.textSecondary,
                      }}
                    >
                      Cancel
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
