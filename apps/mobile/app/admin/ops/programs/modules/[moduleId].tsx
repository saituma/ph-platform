import React, { useEffect, useState } from "react";
import { Alert, Modal, Pressable, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { ChevronLeft, Dumbbell, Plus, Trash2 } from "lucide-react-native";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text, TextInput } from "@/components/ScaledText";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { AdminHeader, AdminScreen, AdminCard, AdminBadge, AdminEmptyState, AdminLoadingState, AdminIconButton } from "@/components/admin/AdminUI";
import { useAppSelector } from "@/store/hooks";
import { useAdminProgramBuilder, type SessionItem } from "@/hooks/admin/useAdminProgramBuilder";

const SESSION_TYPES = ["program", "warmup", "cooldown", "mobility", "recovery", "stretching", "screening", "offseason", "inseason", "education", "nutrition"];

export default function AdminModuleDetailScreen() {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const params = useLocalSearchParams<{
    moduleId: string;
    programId: string;
    programName?: string;
    moduleTitle?: string;
  }>();
  const moduleId = Number(params.moduleId);
  const programId = Number(params.programId);
  const programName = params.programName ?? "Program";
  const moduleTitle = params.moduleTitle ?? "Module";

  const token = useAppSelector((s) => s.user.token);
  const bootstrapReady = useAppSelector((s) => s.app.bootstrapReady);
  const canLoad = Boolean(token && bootstrapReady);

  const { sessions, loading, isBusy, loadSessions, createSession, deleteSession } = useAdminProgramBuilder(token, canLoad);

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("program");

  useEffect(() => {
    if (canLoad && moduleId > 0) loadSessions(moduleId);
  }, [canLoad, moduleId, loadSessions]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    await createSession(moduleId, { title: title.trim(), type, programId });
    setTitle("");
    setType("program");
    setModalOpen(false);
  };

  const handleDelete = (session: SessionItem) => {
    Alert.alert("Delete Session", `Delete "${session.title ?? "this session"}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteSession(session.id, moduleId) },
    ]);
  };

  return (
    <AdminScreen>
      <ThemedScrollView
        showsVerticalScrollIndicator={false}
        onRefresh={() => loadSessions(moduleId, true)}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(60).duration(360).springify()}
          style={{ marginBottom: 18 }}
        >
          <AdminHeader
            eyebrow={programName}
            title={moduleTitle}
            subtitle={`${sessions.length} session${sessions.length !== 1 ? "s" : ""}`}
            tone="accent"
            right={
              <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 4 }}>
                <ChevronLeft size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            }
          />
        </Animated.View>

        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(120).duration(360).springify()}
          style={{ paddingHorizontal: 24, marginBottom: 16 }}
        >
          <TouchableOpacity
            onPress={() => setModalOpen(true)}
            activeOpacity={0.8}
            style={{
              height: 44,
              borderRadius: 14,
              backgroundColor: colors.accent,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Plus size={16} color={colors.textInverse} strokeWidth={2.5} />
            <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, letterSpacing: 0.4, textTransform: "uppercase", color: colors.textInverse }}>
              Add Session
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {loading ? (
          <AdminLoadingState label="Loading sessions" />
        ) : sessions.length === 0 ? (
          <AdminEmptyState
            icon={Dumbbell}
            title="No sessions yet"
            description="Add a session to start building this module."
          />
        ) : (
          <Animated.View
            entering={reduceMotion ? undefined : FadeInDown.delay(180).duration(360).springify()}
            style={{ paddingHorizontal: 24, gap: 10 }}
          >
            {sessions.map((session, idx) => (
              <Pressable
                key={session.id}
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: "/admin/ops/programs/sessions/[sessionId]",
                    params: {
                      sessionId: String(session.id),
                      programId: String(programId),
                      programName,
                      moduleId: String(moduleId),
                      moduleTitle,
                      sessionTitle: session.title ?? `Session ${session.sessionNumber ?? idx + 1}`,
                    },
                  } as any)
                }
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                {({ pressed }) => (
                  <AdminCard pressed={pressed}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: colors.accent }}>
                          {idx + 1}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: "Satoshi-Bold", fontSize: 15, color: colors.textPrimary }} numberOfLines={1}>
                          {session.title ?? `Session ${session.sessionNumber ?? idx + 1}`}
                        </Text>
                        <View style={{ flexDirection: "row", gap: 6, marginTop: 5 }}>
                          {session.type ? <AdminBadge tone="info">{session.type}</AdminBadge> : null}
                          <AdminBadge>{session.exerciseCount ?? 0} exercises</AdminBadge>
                        </View>
                      </View>
                      <AdminIconButton
                        icon={Trash2}
                        tone="danger"
                        accessibilityLabel="Delete session"
                        onPress={() => handleDelete(session)}
                        disabled={isBusy}
                      />
                    </View>
                  </AdminCard>
                )}
              </Pressable>
            ))}
          </Animated.View>
        )}
      </ThemedScrollView>

      <Modal visible={modalOpen} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 24 }}
          onPress={() => setModalOpen(false)}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 380,
              borderRadius: 28,
              padding: 28,
              backgroundColor: isDark ? "hsl(220,10%,10%)" : "#FFFFFF",
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
            }}
          >
            <Text style={{ fontFamily: "Clash-Bold", fontSize: 22, color: colors.textPrimary, letterSpacing: -0.4, marginBottom: 6 }}>
              Add Session
            </Text>
            <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: colors.textSecondary, marginBottom: 20, lineHeight: 18 }}>
              Create a new session in this module.
            </Text>

            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: colors.textSecondary, marginBottom: 6 }}>
                Title
              </Text>
              <View style={{
                borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, height: 48, justifyContent: "center",
                backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)",
                borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
              }}>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Upper Body Strength"
                  placeholderTextColor={colors.placeholder}
                  style={{ fontFamily: "Outfit-Regular", fontSize: 15, color: colors.textPrimary }}
                  cursorColor={colors.accent}
                  autoFocus
                />
              </View>
            </View>

            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: colors.textSecondary, marginBottom: 6 }}>
                Type
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {SESSION_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setType(t)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 10,
                      borderWidth: 1,
                      backgroundColor: type === t ? colors.accent : isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
                      borderColor: type === t ? colors.accent : isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)",
                    }}
                  >
                    <Text style={{
                      fontFamily: "Outfit-Bold",
                      fontSize: 12,
                      color: type === t ? colors.textInverse : colors.textSecondary,
                    }}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => setModalOpen(false)}
                style={{
                  flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center",
                  backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                }}
              >
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: colors.textPrimary, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreate}
                disabled={!title.trim() || isBusy}
                style={{
                  flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center",
                  backgroundColor: colors.accent, opacity: isBusy || !title.trim() ? 0.6 : 1,
                }}
              >
                {isBusy ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: colors.textInverse, letterSpacing: 0.5, textTransform: "uppercase" }}>
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </AdminScreen>
  );
}
