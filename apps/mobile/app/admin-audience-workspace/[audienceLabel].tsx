import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text, TextInput } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { useAdminAudienceWorkspace, Module, OtherGroup } from "@/hooks/admin/useAdminAudienceWorkspace";
import { useAdminModules } from "@/hooks/admin/useAdminModules";
import { useAdminOtherContent } from "@/hooks/admin/useAdminOtherContent";
import {
  PROGRAM_TIERS,
  fromStorageAudienceLabel,
  isAdultStorageAudienceLabel,
  isTeamStorageAudienceLabel,
  fromTeamStorageAudienceLabel,
} from "@/lib/training-content-utils";
import { goBackOrFallbackTabs } from "@/lib/navigation/androidBackToTabs";
import { useAppSelector } from "@/store/hooks";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { View, TouchableOpacity, Pressable, Modal, ActivityIndicator, Alert, ScrollView } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Feather } from "@/components/ui/theme-icons";

export default function AdminAudienceWorkspaceScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { audienceLabel: rawLabel, mode } = useLocalSearchParams<{ audienceLabel: string; mode?: string }>();

  const token = useAppSelector((state) => state.user.token);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);
  const canLoad = Boolean(token && bootstrapReady);

  const { workspace, loading, error, load: loadWorkspace } = useAdminAudienceWorkspace(token, canLoad, rawLabel);
  const modulesHook = useAdminModules(token, canLoad);
  const otherHook = useAdminOtherContent(token, canLoad);

  const [activeTab, setActiveTab] = useState<"modules" | "others">("modules");

  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [moduleForm, setModuleForm] = useState({ id: null as number | null, title: "" });

  const [otherModalOpen, setOtherModalOpen] = useState(false);
  const [otherForm, setOtherForm] = useState({ id: null as number | null, title: "", body: "", type: "" });

  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [lockModalMode, setLockModalMode] = useState<"lock" | "unlock">("lock");
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);

  useEffect(() => {
    if (canLoad && rawLabel) loadWorkspace();
  }, [canLoad, rawLabel, loadWorkspace]);

  const displayLabel = useMemo(() => {
    if (!rawLabel) return "";
    if (isAdultStorageAudienceLabel(rawLabel)) return fromStorageAudienceLabel(rawLabel);
    if (isTeamStorageAudienceLabel(rawLabel)) return fromTeamStorageAudienceLabel(rawLabel);
    return `Age ${rawLabel}`;
  }, [rawLabel]);

  const cardBg     = isDark ? colors.cardElevated : colors.card;
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
  const chipBg     = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)";
  const divider    = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";

  const handleSaveModule = async () => {
    if (!moduleForm.title.trim()) return;
    try {
      if (moduleForm.id) {
        await modulesHook.updateModule(moduleForm.id, { title: moduleForm.title });
      } else {
        await modulesHook.createModule(rawLabel, moduleForm.title);
      }
      setModuleModalOpen(false);
      loadWorkspace(true);
    } catch (e) {
      Alert.alert("Error", "Failed to save module");
    }
  };

  const handleSaveOther = async () => {
    if (!otherForm.title.trim()) return;
    try {
      if (otherForm.id) {
        await otherHook.updateOther(otherForm.id, { title: otherForm.title, body: otherForm.body });
      } else {
        await otherHook.createOther({ audienceLabel: rawLabel, title: otherForm.title, body: otherForm.body, type: otherForm.type });
      }
      setOtherModalOpen(false);
      loadWorkspace(true);
    } catch (e) {
      Alert.alert("Error", "Failed to save other content");
    }
  };

  const handleDeleteModule = (moduleId: number, title: string) => {
    Alert.alert("Delete Module", `Are you sure you want to delete "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await modulesHook.deleteModule(moduleId);
            loadWorkspace(true);
          } catch (e) {
            Alert.alert("Error", "Failed to delete module");
          }
        },
      },
    ]);
  };

  const handleDeleteOther = (otherId: number, title: string) => {
    Alert.alert("Delete Item", `Are you sure you want to delete "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await otherHook.deleteOther(otherId);
            loadWorkspace(true);
          } catch (e) {
            Alert.alert("Error", "Failed to delete");
          }
        },
      },
    ]);
  };

  const handleMoveModule = async (moduleId: number, direction: "up" | "down") => {
    const modules = [...(workspace?.modules ?? [])].sort((a, b) => a.order - b.order);
    const index = modules.findIndex((m) => m.id === moduleId);
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === modules.length - 1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const modA = modules[index];
    const modB = modules[targetIndex];
    try {
      await Promise.all([
        modulesHook.updateModule(modA.id, { order: modB.order }),
        modulesHook.updateModule(modB.id, { order: modA.order }),
      ]);
      loadWorkspace(true);
    } catch (e) {
      Alert.alert("Error", "Failed to reorder modules");
    }
  };

  const handleUpdateLocks = async () => {
    try {
      await modulesHook.updateLocks(rawLabel, lockModalMode === "lock" ? selectedModuleId : null, selectedTiers);
      setLockModalOpen(false);
      loadWorkspace(true);
    } catch (e) {
      Alert.alert("Error", "Failed to update locks");
    }
  };

  const cleanupPlaceholders = () => {
    Alert.alert("Cleanup Placeholders", "Remove auto-created placeholder modules for this audience?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clean",
        onPress: async () => {
          try {
            const res = await modulesHook.cleanupPlaceholders(rawLabel);
            Alert.alert("Cleaned", `Removed ${res?.deletedCount ?? 0} placeholders.`);
            loadWorkspace(true);
          } catch (e) {
            Alert.alert("Error", "Failed to cleanup");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>

      {/* ── Nav header ────────────────────────────────────────────── */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottomWidth: 1,
          borderBottomColor: divider,
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
            {displayLabel}
          </Text>
        </View>

        <TouchableOpacity
          onPress={cleanupPlaceholders}
          style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)",
            alignItems: "center", justifyContent: "center",
            borderWidth: 1, borderColor: divider,
          }}
        >
          <Feather name="trash" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ThemedScrollView showsVerticalScrollIndicator={false} onRefresh={() => loadWorkspace(true)}>
        <View style={{ padding: 20, paddingBottom: 120 }}>

          {/* ── Tab switcher ──────────────────────────────────────── */}
          <View
            style={{
              flexDirection: "row",
              padding: 5,
              borderRadius: 20,
              borderWidth: 1,
              marginBottom: 28,
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
              borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
              gap: 4,
            }}
          >
            {(["modules", "others"] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.8}
                style={{
                  flex: 1, height: 44, borderRadius: 16,
                  alignItems: "center", justifyContent: "center",
                  backgroundColor: activeTab === tab ? colors.accent : "transparent",
                }}
              >
                <Text style={{
                  fontFamily: "Outfit-Bold",
                  fontSize: 12,
                  letterSpacing: 0.7,
                  textTransform: "uppercase",
                  color: activeTab === tab ? colors.textInverse : colors.textSecondary,
                }}>
                  {tab === "modules" ? "Modules" : "Other Content"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Content ───────────────────────────────────────────── */}
          {loading && !workspace ? (
            <View style={{ gap: 12 }}>
              <Skeleton width="100%" height={132} borderRadius={20} />
              <Skeleton width="100%" height={132} borderRadius={20} />
            </View>
          ) : error ? (
            <View style={{ padding: 24, borderRadius: 20, backgroundColor: isDark ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.08)", borderWidth: 1, borderColor: "rgba(239,68,68,0.2)" }}>
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: "#F87171", textAlign: "center" }}>{error}</Text>
            </View>
          ) : activeTab === "modules" ? (

            /* ── Modules tab ──────────────────────────────────────── */
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ width: 3, height: 18, borderRadius: 2, backgroundColor: colors.accent }} />
                  <Text style={{ fontFamily: "Clash-Bold", fontSize: 18, color: colors.textPrimary, letterSpacing: -0.3 }}>
                    Module Slots
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => { setModuleForm({ id: null, title: "" }); setModuleModalOpen(true); }}
                  activeOpacity={0.8}
                  style={{
                    height: 38, paddingHorizontal: 14, borderRadius: 12,
                    backgroundColor: colors.accent,
                    flexDirection: "row", alignItems: "center", gap: 6,
                  }}
                >
                  <Feather name="plus" size={15} color={colors.textInverse} />
                  <Text style={{ fontFamily: "Outfit-Bold", fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase", color: colors.textInverse }}>
                    Add
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ gap: 12 }}>
                {workspace?.modules.sort((a, b) => a.order - b.order).map((m) => (
                  <Animated.View
                    key={m.id}
                    entering={reduceMotion ? undefined : FadeInDown.delay(60).duration(280).springify()}
                    style={{
                      borderRadius: 20, borderWidth: 1,
                      backgroundColor: cardBg, borderColor: cardBorder,
                      overflow: "hidden",
                    }}
                  >
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: "/admin-audience-workspace/modules/[moduleId]",
                          params: { moduleId: m.id, audienceLabel: rawLabel },
                        } as any)
                      }
                      style={{ padding: 20 }}
                    >
                      {/* Module header */}
                      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                        <View style={{ flex: 1, marginRight: 12 }}>
                          {/* Order badge */}
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: `${colors.accent}18` }}>
                              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: colors.accent, letterSpacing: 0.5, textTransform: "uppercase" }}>
                                Module {m.order + 1}
                              </Text>
                            </View>
                          </View>
                          <Text style={{ fontFamily: "Clash-Bold", fontSize: 19, color: colors.textPrimary, letterSpacing: -0.3 }} numberOfLines={2}>
                            {m.title}
                          </Text>
                        </View>
                        <Feather name="chevron-right" size={18} color={isDark ? "rgba(255,255,255,0.22)" : "rgba(15,23,42,0.28)"} style={{ marginTop: 4 }} />
                      </View>

                      {/* Stats chips */}
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: chipBg }}>
                          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: colors.textSecondary }}>
                            {m.sessions?.length ?? 0} sessions
                          </Text>
                        </View>
                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: chipBg }}>
                          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: colors.textSecondary }}>
                            {m.totalDayLength} days
                          </Text>
                        </View>
                      </View>

                      {/* Action row */}
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: divider }}>
                        {/* Reorder buttons */}
                        <View style={{ flexDirection: "row", gap: 6 }}>
                          <TouchableOpacity
                            onPress={() => handleMoveModule(m.id, "up")}
                            style={{
                              width: 40, height: 40, borderRadius: 12,
                              backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)",
                              alignItems: "center", justifyContent: "center",
                              borderWidth: 1, borderColor: divider,
                            }}
                          >
                            <Feather name="arrow-up" size={15} color={colors.textSecondary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleMoveModule(m.id, "down")}
                            style={{
                              width: 40, height: 40, borderRadius: 12,
                              backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)",
                              alignItems: "center", justifyContent: "center",
                              borderWidth: 1, borderColor: divider,
                            }}
                          >
                            <Feather name="arrow-down" size={15} color={colors.textSecondary} />
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                          onPress={() => { setModuleForm({ id: m.id, title: m.title }); setModuleModalOpen(true); }}
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
                          onPress={() => {
                            setSelectedModuleId(m.id);
                            setLockModalMode("lock");
                            setSelectedTiers([]);
                            setLockModalOpen(true);
                          }}
                          style={{
                            flex: 1, height: 40, borderRadius: 12,
                            backgroundColor: "rgba(245,158,11,0.1)",
                            alignItems: "center", justifyContent: "center",
                            flexDirection: "row", gap: 6,
                            borderWidth: 1, borderColor: "rgba(245,158,11,0.22)",
                          }}
                        >
                          <Feather name="lock" size={14} color="#D97706" />
                          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 12, color: "#D97706", textTransform: "uppercase", letterSpacing: 0.4 }}>
                            Lock
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleDeleteModule(m.id, m.title)}
                          style={{
                            width: 40, height: 40, borderRadius: 12,
                            backgroundColor: "rgba(239,68,68,0.1)",
                            alignItems: "center", justifyContent: "center",
                            borderWidth: 1, borderColor: "rgba(239,68,68,0.2)",
                          }}
                        >
                          <Feather name="trash-2" size={14} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </Pressable>
                  </Animated.View>
                ))}

                {(workspace?.modules.length === 0) && (
                  <View style={{
                    paddingVertical: 56, alignItems: "center", justifyContent: "center",
                    borderWidth: 1, borderStyle: "dashed",
                    borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.12)",
                    borderRadius: 20, gap: 10,
                  }}>
                    <Feather name="layers" size={28} color={colors.textSecondary} style={{ opacity: 0.35 }} />
                    <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: colors.textSecondary }}>
                      No modules yet.
                    </Text>
                  </View>
                )}
              </View>
            </View>

          ) : (

            /* ── Others tab ───────────────────────────────────────── */
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <View style={{ width: 3, height: 18, borderRadius: 2, backgroundColor: colors.accent }} />
                <Text style={{ fontFamily: "Clash-Bold", fontSize: 18, color: colors.textPrimary, letterSpacing: -0.3 }}>
                  Categorized Items
                </Text>
              </View>

              {workspace?.others.map((group) => (
                <View key={group.type} style={{ marginBottom: 28 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 12, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 1.2 }}>
                      {group.label}
                    </Text>
                    <TouchableOpacity
                      onPress={() => { setOtherForm({ id: null, title: "", body: "", type: group.type }); setOtherModalOpen(true); }}
                      style={{
                        height: 32, paddingHorizontal: 12, borderRadius: 10,
                        backgroundColor: `${colors.accent}15`,
                        flexDirection: "row", alignItems: "center", gap: 5,
                      }}
                    >
                      <Feather name="plus" size={12} color={colors.accent} />
                      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: colors.accent, textTransform: "uppercase", letterSpacing: 0.4 }}>
                        Add
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {group.items.length === 0 ? (
                    <View style={{
                      paddingVertical: 28, alignItems: "center",
                      borderWidth: 1, borderStyle: "dashed",
                      borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.1)",
                      borderRadius: 16,
                    }}>
                      <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: colors.textSecondary }}>No items.</Text>
                    </View>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {group.items.sort((a, b) => a.order - b.order).map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => { setOtherForm({ id: item.id, title: item.title, body: item.body || "", type: group.type }); setOtherModalOpen(true); }}
                          activeOpacity={0.85}
                          style={{
                            flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                            padding: 16, borderRadius: 16,
                            backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
                            borderWidth: 1, borderColor: divider,
                          }}
                        >
                          <View style={{ flex: 1, marginRight: 12 }}>
                            <Text style={{ fontFamily: "Outfit-Bold", fontSize: 15, color: colors.textPrimary }} numberOfLines={1}>
                              {item.title}
                            </Text>
                            {item.body ? (
                              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
                                {item.body}
                              </Text>
                            ) : null}
                          </View>
                          <TouchableOpacity
                            onPress={() => handleDeleteOther(item.id, item.title)}
                            style={{ padding: 4 }}
                          >
                            <Feather name="trash-2" size={15} color={colors.danger} style={{ opacity: 0.55 }} />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ThemedScrollView>

      {/* ── Module Modal ─────────────────────────────────────────── */}
      <Modal visible={moduleModalOpen} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 24 }}
          onPress={() => setModuleModalOpen(false)}
        >
          <View style={{
            width: "100%", maxWidth: 380, borderRadius: 28, padding: 28,
            backgroundColor: isDark ? "hsl(220,10%,10%)" : "#FFFFFF",
            borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
          }}>
            <Text style={{ fontFamily: "Clash-Bold", fontSize: 22, color: colors.textPrimary, letterSpacing: -0.4, marginBottom: 20 }}>
              {moduleForm.id ? "Edit Module" : "New Module"}
            </Text>
            <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>
              Module Title
            </Text>
            <View style={{
              borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, height: 52, justifyContent: "center", marginBottom: 24,
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)",
              borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
            }}>
              <TextInput
                value={moduleForm.title}
                onChangeText={(t) => setModuleForm((prev) => ({ ...prev, title: t }))}
                placeholder="e.g. Strength Phase 1"
                placeholderTextColor={colors.placeholder}
                style={{ fontFamily: "Outfit-Regular", fontSize: 16, color: colors.textPrimary }}
                cursorColor={colors.accent}
                autoFocus
              />
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => setModuleModalOpen(false)}
                style={{
                  flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center",
                  backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                }}
              >
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: colors.textPrimary, letterSpacing: 0.5, textTransform: "uppercase" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveModule}
                disabled={!moduleForm.title.trim() || modulesHook.isBusy}
                style={{
                  flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center",
                  backgroundColor: colors.accent, opacity: modulesHook.isBusy ? 0.6 : 1,
                }}
              >
                {modulesHook.isBusy
                  ? <ActivityIndicator color={colors.textInverse} size="small" />
                  : <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: colors.textInverse, letterSpacing: 0.5, textTransform: "uppercase" }}>Save</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* ── Other Item Modal ─────────────────────────────────────── */}
      <Modal visible={otherModalOpen} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 24 }}
          onPress={() => setOtherModalOpen(false)}
        >
          <View style={{
            width: "100%", maxWidth: 380, borderRadius: 28, padding: 28,
            backgroundColor: isDark ? "hsl(220,10%,10%)" : "#FFFFFF",
            borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
          }}>
            <Text style={{ fontFamily: "Clash-Bold", fontSize: 22, color: colors.textPrimary, letterSpacing: -0.4, marginBottom: 20 }}>
              {otherForm.id ? "Edit Item" : "New Item"}
            </Text>
            <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>
              Title
            </Text>
            <View style={{
              borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, height: 52, justifyContent: "center", marginBottom: 16,
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)",
              borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
            }}>
              <TextInput
                value={otherForm.title}
                onChangeText={(t) => setOtherForm((prev) => ({ ...prev, title: t }))}
                placeholder="Title..."
                placeholderTextColor={colors.placeholder}
                style={{ fontFamily: "Outfit-Regular", fontSize: 16, color: colors.textPrimary }}
                cursorColor={colors.accent}
              />
            </View>
            <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>
              Description
            </Text>
            <View style={{
              borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, minHeight: 96, marginBottom: 24,
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)",
              borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
            }}>
              <TextInput
                value={otherForm.body}
                onChangeText={(t) => setOtherForm((prev) => ({ ...prev, body: t }))}
                placeholder="Description..."
                placeholderTextColor={colors.placeholder}
                multiline
                style={{ fontFamily: "Outfit-Regular", fontSize: 16, color: colors.textPrimary }}
                cursorColor={colors.accent}
              />
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => setOtherModalOpen(false)}
                style={{
                  flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center",
                  backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                }}
              >
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: colors.textPrimary, letterSpacing: 0.5, textTransform: "uppercase" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveOther}
                disabled={!otherForm.title.trim() || otherHook.isBusy}
                style={{
                  flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center",
                  backgroundColor: colors.accent, opacity: otherHook.isBusy ? 0.6 : 1,
                }}
              >
                {otherHook.isBusy
                  ? <ActivityIndicator color={colors.textInverse} size="small" />
                  : <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: colors.textInverse, letterSpacing: 0.5, textTransform: "uppercase" }}>Save</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* ── Lock Modal ───────────────────────────────────────────── */}
      <Modal visible={lockModalOpen} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 24 }}
          onPress={() => setLockModalOpen(false)}
        >
          <View style={{
            width: "100%", maxWidth: 380, borderRadius: 28, padding: 28,
            backgroundColor: isDark ? "hsl(220,10%,10%)" : "#FFFFFF",
            borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
          }}>
            <Text style={{ fontFamily: "Clash-Bold", fontSize: 22, color: colors.textPrimary, letterSpacing: -0.4, marginBottom: 6 }}>
              Lock tiers
            </Text>
            <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: colors.textSecondary, marginBottom: 20, lineHeight: 18 }}>
              Select tiers to lock from this module onwards.
            </Text>
            <View style={{ gap: 8, marginBottom: 24 }}>
              {PROGRAM_TIERS.map((tier) => {
                const isSelected = selectedTiers.includes(tier.value);
                return (
                  <TouchableOpacity
                    key={tier.value}
                    onPress={() =>
                      setSelectedTiers((prev) =>
                        isSelected ? prev.filter((t) => t !== tier.value) : [...prev, tier.value]
                      )
                    }
                    activeOpacity={0.8}
                    style={{
                      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                      padding: 14, borderRadius: 14, borderWidth: 1,
                      backgroundColor: isSelected ? `${colors.accent}12` : isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
                      borderColor: isSelected ? `${colors.accent}40` : divider,
                    }}
                  >
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 15, color: isSelected ? colors.accent : colors.textPrimary }}>
                      {tier.label}
                    </Text>
                    {isSelected && <Feather name="check-circle" size={18} color={colors.accent} />}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => setLockModalOpen(false)}
                style={{
                  flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center",
                  backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                }}
              >
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: colors.textPrimary, letterSpacing: 0.5, textTransform: "uppercase" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUpdateLocks}
                disabled={selectedTiers.length === 0 || modulesHook.isBusy}
                style={{
                  flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center",
                  backgroundColor: colors.accent,
                  opacity: modulesHook.isBusy || selectedTiers.length === 0 ? 0.5 : 1,
                }}
              >
                {modulesHook.isBusy
                  ? <ActivityIndicator color={colors.textInverse} size="small" />
                  : <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: colors.textInverse, letterSpacing: 0.5, textTransform: "uppercase" }}>Update Locks</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
