import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text, TextInput } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { useAdminSessions } from "@/hooks/admin/useAdminSessions";
import { useAdminAudienceWorkspace, Module, ModuleSession } from "@/hooks/admin/useAdminAudienceWorkspace";
import { goBackOrFallbackTabs } from "@/lib/navigation/androidBackToTabs";
import { useAppSelector } from "@/store/hooks";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, TouchableOpacity, Modal, Pressable, ActivityIndicator, Alert } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Feather } from "@/components/ui/theme-icons";

export default function AdminModuleDetailScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const { moduleId: rawModuleId, audienceLabel: rawLabel } = useLocalSearchParams<{ moduleId: string; audienceLabel: string }>();
  const moduleId = parseInt(rawModuleId);

  const token = useAppSelector((state) => state.user.token);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);
  const canLoad = Boolean(token && bootstrapReady);

  const { workspace, loading: workspaceLoading, load: loadWorkspace } = useAdminAudienceWorkspace(token, canLoad, rawLabel);
  const sessionsHook = useAdminSessions(token, canLoad);

  const module = useMemo(() => workspace?.modules.find((m) => m.id === moduleId), [workspace, moduleId]);

  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState({ id: null as number | null, title: "" });

  useEffect(() => {
    if (canLoad && rawLabel) loadWorkspace();
  }, [canLoad, rawLabel, loadWorkspace]);

  const handleSaveSession = async () => {
    if (!sessionForm.title.trim()) return;
    try {
      if (sessionForm.id) {
        await sessionsHook.updateSession(sessionForm.id, { title: sessionForm.title });
      } else {
        await sessionsHook.createSession(moduleId, sessionForm.title);
      }
      setSessionModalOpen(false);
      setSessionForm({ id: null, title: "" });
      loadWorkspace(true);
    } catch (e) {
      Alert.alert("Error", "Failed to save session");
    }
  };

  const handleDeleteSession = (sessionId: number, title: string) => {
    Alert.alert("Delete Session", `Are you sure you want to delete "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await sessionsHook.deleteSession(sessionId);
            loadWorkspace(true);
          } catch (e) {
            Alert.alert("Error", "Failed to delete session");
          }
        },
      },
    ]);
  };

  const cardBg     = isDark ? colors.cardElevated : colors.card;
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
  const chipBg     = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)";
  const divider    = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";

  if (workspaceLoading && !module) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
        <View style={{ padding: 24, gap: 12 }}>
          <Skeleton width="55%" height={28} />
          <Skeleton width="100%" height={116} borderRadius={20} />
          <Skeleton width="100%" height={116} borderRadius={20} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>

      {/* ── Nav header ──────────────────────────────────────────── */}
      <View
        style={{
          paddingHorizontal: 20, paddingVertical: 14,
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          borderBottomWidth: 1, borderBottomColor: divider,
        }}
      >
        <TouchableOpacity
          onPress={() => goBackOrFallbackTabs(router, pathname)}
          style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)",
            alignItems: "center", justifyContent: "center",
            borderWidth: 1, borderColor: divider,
          }}
        >
          <Feather name="chevron-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 12 }}>
          <Text style={{ fontFamily: "Clash-Bold", fontSize: 18, color: colors.textPrimary, letterSpacing: -0.3 }} numberOfLines={1}>
            {module?.title || "Module Detail"}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ThemedScrollView showsVerticalScrollIndicator={false} onRefresh={() => loadWorkspace(true)}>
        <View style={{ padding: 20, paddingBottom: 120 }}>

          {/* ── Section header ──────────────────────────────────── */}
          <Animated.View
            entering={reduceMotion ? undefined : FadeInDown.delay(60).duration(300).springify()}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}
          >
            <View>
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: `${colors.accent}18`, alignSelf: "flex-start", marginBottom: 6 }}>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: colors.accent, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Audience: {rawLabel}
                </Text>
              </View>
              <Text style={{ fontFamily: "Clash-Bold", fontSize: 24, color: colors.textPrimary, letterSpacing: -0.4 }}>
                Sessions
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => { setSessionForm({ id: null, title: "" }); setSessionModalOpen(true); }}
              activeOpacity={0.8}
              style={{
                height: 44, paddingHorizontal: 18, borderRadius: 14,
                backgroundColor: colors.accent,
                flexDirection: "row", alignItems: "center", gap: 7,
              }}
            >
              <Feather name="plus" size={16} color={colors.textInverse} />
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: colors.textInverse, letterSpacing: 0.4, textTransform: "uppercase" }}>
                Add
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* ── Session cards ────────────────────────────────────── */}
          {module?.sessions.length === 0 ? (
            <View style={{
              paddingVertical: 64, alignItems: "center", justifyContent: "center",
              borderWidth: 1, borderStyle: "dashed",
              borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.12)",
              borderRadius: 20, gap: 10,
            }}>
              <Feather name="calendar" size={28} color={colors.textSecondary} style={{ opacity: 0.35 }} />
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: colors.textSecondary }}>
                No sessions created yet.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {module?.sessions.map((s, idx) => (
                <Animated.View
                  key={s.id}
                  entering={reduceMotion ? undefined : FadeInDown.delay(idx * 50 + 80).duration(280).springify()}
                >
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() =>
                      router.push({
                        pathname: "/admin-audience-workspace/sessions/[sessionId]",
                        params: { sessionId: s.id, audienceLabel: rawLabel, moduleId: rawModuleId },
                      } as any)
                    }
                    style={{
                      padding: 20, borderRadius: 20, borderWidth: 1,
                      backgroundColor: cardBg, borderColor: cardBorder,
                    }}
                  >
                    {/* Session title row */}
                    <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        {/* Day badge */}
                        <View style={{
                          paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
                          backgroundColor: chipBg, alignSelf: "flex-start", marginBottom: 6,
                        }}>
                          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>
                            Day {s.order + 1}
                          </Text>
                        </View>
                        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 18, color: colors.textPrimary, letterSpacing: -0.2 }} numberOfLines={2}>
                          {s.title}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={18} color={isDark ? "rgba(255,255,255,0.22)" : "rgba(15,23,42,0.28)"} style={{ marginTop: 20 }} />
                    </View>

                    {/* Stats chip */}
                    <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: chipBg }}>
                        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: colors.textSecondary }}>
                          {s.items?.length ?? 0} exercises
                        </Text>
                      </View>
                    </View>

                    {/* Action row */}
                    <View style={{
                      flexDirection: "row", gap: 8,
                      paddingTop: 16, borderTopWidth: 1, borderTopColor: divider,
                    }}>
                      <TouchableOpacity
                        onPress={() => { setSessionForm({ id: s.id, title: s.title }); setSessionModalOpen(true); }}
                        style={{
                          flex: 1, height: 40, borderRadius: 12,
                          backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)",
                          alignItems: "center", justifyContent: "center",
                          flexDirection: "row", gap: 6,
                          borderWidth: 1, borderColor: divider,
                        }}
                      >
                        <Feather name="edit-2" size={14} color={colors.textPrimary} />
                        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 12, color: colors.textPrimary, textTransform: "uppercase", letterSpacing: 0.4 }}>
                          Edit
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteSession(s.id, s.title)}
                        style={{
                          flex: 1, height: 40, borderRadius: 12,
                          backgroundColor: "rgba(239,68,68,0.1)",
                          alignItems: "center", justifyContent: "center",
                          flexDirection: "row", gap: 6,
                          borderWidth: 1, borderColor: "rgba(239,68,68,0.2)",
                        }}
                      >
                        <Feather name="trash-2" size={14} color={colors.danger} />
                        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 12, color: colors.danger, textTransform: "uppercase", letterSpacing: 0.4 }}>
                          Delete
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          )}
        </View>
      </ThemedScrollView>

      {/* ── Session Modal ────────────────────────────────────────── */}
      <Modal visible={sessionModalOpen} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 24 }}
          onPress={() => setSessionModalOpen(false)}
        >
          <View style={{
            width: "100%", maxWidth: 380, borderRadius: 28, padding: 28,
            backgroundColor: isDark ? "hsl(220,10%,10%)" : "#FFFFFF",
            borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
          }}>
            <Text style={{ fontFamily: "Clash-Bold", fontSize: 22, color: colors.textPrimary, letterSpacing: -0.4, marginBottom: 20 }}>
              {sessionForm.id ? "Edit Session" : "New Session"}
            </Text>
            <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>
              Session Title
            </Text>
            <View style={{
              borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, height: 52, justifyContent: "center", marginBottom: 24,
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)",
              borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
            }}>
              <TextInput
                value={sessionForm.title}
                onChangeText={(t) => setSessionForm((prev) => ({ ...prev, title: t }))}
                placeholder="e.g. Session A: Linear Speed"
                placeholderTextColor={colors.placeholder}
                style={{ fontFamily: "Outfit-Regular", fontSize: 16, color: colors.textPrimary }}
                cursorColor={colors.accent}
                autoFocus
              />
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => setSessionModalOpen(false)}
                style={{
                  flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center",
                  backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                }}
              >
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: colors.textPrimary, letterSpacing: 0.5, textTransform: "uppercase" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveSession}
                disabled={!sessionForm.title.trim() || sessionsHook.isBusy}
                style={{
                  flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center",
                  backgroundColor: colors.accent, opacity: sessionsHook.isBusy ? 0.6 : 1,
                }}
              >
                {sessionsHook.isBusy
                  ? <ActivityIndicator color={colors.textInverse} size="small" />
                  : <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: colors.textInverse, letterSpacing: 0.5, textTransform: "uppercase" }}>Save</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
