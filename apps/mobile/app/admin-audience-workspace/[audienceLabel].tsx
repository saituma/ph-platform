import { Text } from "@/components/ScaledText";
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
import { useAppSelector } from "@/store/hooks";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { View, TouchableOpacity, Pressable, Modal, ActivityIndicator, Alert, ScrollView } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import {
  BookOpen,
  Plus,
  Layers,
  ChevronRight,
  Edit2,
  Trash2,
  FolderOpen,
  ArrowUp,
  ArrowDown,
  Lock,
  CheckCircle,
  FileText,
} from "lucide-react-native";
import {
  AdminScreen,
  AdminHeader,
  AdminBackButton,
  AdminCard,
  AdminButton,
  AdminBadge,
  AdminSegmentedTabs,
  AdminEmptyState,
  AdminLoadingState,
  AdminModalContainer,
  AdminModalTitle,
  AdminModalSubtitle,
  AdminFormField,
  AdminIconButton,
  useAdminPastel,
} from "@/components/admin/AdminUI";
import type { AdminCardColor } from "@/constants/theme";

type OtherSectionConfig = {
  type: string;
  label: string;
  summary: string;
  concept: "content" | "age-schedule";
};

const OTHER_SECTION_CONFIGS: OtherSectionConfig[] = [
  {
    type: "warmup",
    label: "Warm-Up",
    summary: "Warm-up content is editable from this section.",
    concept: "content",
  },
  {
    type: "cooldown",
    label: "Cool-Down",
    summary: "Cool-down content is editable from this section.",
    concept: "content",
  },
  {
    type: "mobility",
    label: "Mobility",
    summary: "Mobility content and plan-specific locking are managed inline from the Others tab.",
    concept: "content",
  },
  {
    type: "recovery",
    label: "Recovery",
    summary: "Recovery content and plan-specific locking are managed inline from the Others tab.",
    concept: "content",
  },
  {
    type: "inseason",
    label: "In-Season Program",
    summary: "This section branches into age groups and weekly scheduling.",
    concept: "age-schedule",
  },
  {
    type: "offseason",
    label: "Off-Season Program",
    summary: "Off-season program content is isolated in this section.",
    concept: "content",
  },
  {
    type: "education",
    label: "Education",
    summary: "Education content and plan-specific locking are managed inline from the Others tab.",
    concept: "content",
  },
];

function getOtherSectionConfig(type: string): OtherSectionConfig {
  return (
    OTHER_SECTION_CONFIGS.find((item) => item.type === type) ?? {
      type,
      label: type,
      summary: "Supporting program content.",
      concept: "content",
    }
  );
}

const MODULE_COLORS: AdminCardColor[] = ["sage", "lavender", "peach", "mint", "pink", "yellow"];
const OTHER_COLORS: AdminCardColor[] = ["mint", "peach", "lavender", "pink", "sage", "yellow", "mint"];

export default function AdminAudienceWorkspaceScreen() {
  const p = useAdminPastel();
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
  const [otherForm, setOtherForm] = useState({
    id: null as number | null,
    title: "",
    body: "",
    type: "",
    scheduleNote: "",
    videoUrl: "",
    order: "",
  });

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

  const activeOtherSection = getOtherSectionConfig(otherForm.type);

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
    if (!otherForm.title.trim() || !otherForm.body.trim()) return;
    const payload = {
      title: otherForm.title.trim(),
      body: otherForm.body.trim(),
      type: otherForm.type,
      scheduleNote: otherForm.scheduleNote.trim() || null,
      videoUrl: otherForm.videoUrl.trim() || null,
      order: otherForm.order.trim() ? Number(otherForm.order) : undefined,
      metadata: null,
    };
    try {
      if (otherForm.id) {
        await otherHook.updateOther(otherForm.id, payload);
      } else {
        await otherHook.createOther({ audienceLabel: rawLabel, ...payload });
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
    <AdminScreen>
      {/* Header */}
      <AdminHeader
        title={displayLabel}
        compact
        right={
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <AdminIconButton
              icon={Trash2}
              onPress={cleanupPlaceholders}
              variant="ghost"
              accessibilityLabel="Cleanup placeholders"
            />
            <AdminBackButton onPress={() => router.back()} />
          </View>
        }
      />

      {/* Tab switcher */}
      <AdminSegmentedTabs
        tabs={[
          { key: "modules" as const, label: "Modules", icon: Layers },
          { key: "others" as const, label: "Other Content", icon: FolderOpen },
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />

      <ThemedScrollView showsVerticalScrollIndicator={false} onRefresh={() => loadWorkspace(true)}>
        <View style={{ paddingHorizontal: 24, paddingBottom: 120 }}>

          {/* Loading state */}
          {loading && !workspace ? (
            <AdminLoadingState label="Loading workspace..." />
          ) : error ? (
            <AdminCard color="pink" padding={24}>
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.danger, textAlign: "center" }}>
                {error}
              </Text>
            </AdminCard>
          ) : activeTab === "modules" ? (

            /* Modules tab */
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 4, height: 20, borderRadius: 2, backgroundColor: p.accent }} />
                  <Text style={{ fontFamily: "Outfit-ExtraBold", fontSize: 20, color: p.textPrimary, letterSpacing: -0.4 }}>
                    Module Slots
                  </Text>
                </View>
                <AdminButton
                  label="Add"
                  icon={Plus}
                  compact
                  onPress={() => { setModuleForm({ id: null, title: "" }); setModuleModalOpen(true); }}
                />
              </View>

              <View style={{ gap: 14 }}>
                {workspace?.modules.sort((a, b) => a.order - b.order).map((m, idx) => (
                  <Animated.View
                    key={m.id}
                    entering={reduceMotion ? undefined : FadeInDown.delay(idx * 60).duration(280).springify()}
                  >
                    <AdminCard
                      color={MODULE_COLORS[idx % MODULE_COLORS.length]}
                      onPress={() =>
                        router.push({
                          pathname: "/admin-audience-workspace/modules/[moduleId]",
                          params: { moduleId: m.id, audienceLabel: rawLabel },
                        } as any)
                      }
                    >
                      {/* Module header */}
                      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                        <View style={{ flex: 1, marginRight: 12 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <AdminBadge color="lavender">
                              Module {m.order + 1}
                            </AdminBadge>
                          </View>
                          <Text style={{ fontFamily: "Outfit-ExtraBold", fontSize: 19, color: p.textPrimary, letterSpacing: -0.3 }} numberOfLines={2}>
                            {m.title}
                          </Text>
                        </View>
                        <ChevronRight size={18} color={p.textMuted} strokeWidth={2} style={{ marginTop: 4 }} />
                      </View>

                      {/* Stats badges */}
                      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                        <AdminBadge color="mint">
                          {m.sessions?.length ?? 0} sessions
                        </AdminBadge>
                        <AdminBadge color="peach">
                          {m.totalDayLength} days
                        </AdminBadge>
                      </View>

                      {/* Action row */}
                      <View style={{ flexDirection: "row", gap: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: p.divider }}>
                        <View style={{ flexDirection: "row", gap: 6 }}>
                          <AdminIconButton
                            icon={ArrowUp}
                            onPress={() => handleMoveModule(m.id, "up")}
                            variant="ghost"
                            accessibilityLabel="Move up"
                          />
                          <AdminIconButton
                            icon={ArrowDown}
                            onPress={() => handleMoveModule(m.id, "down")}
                            variant="ghost"
                            accessibilityLabel="Move down"
                          />
                        </View>

                        <View style={{ flex: 1 }}>
                          <AdminButton
                            label="Edit"
                            icon={Edit2}
                            variant="secondary"
                            compact
                            onPress={() => { setModuleForm({ id: m.id, title: m.title }); setModuleModalOpen(true); }}
                            style={{ flex: 1 }}
                          />
                        </View>

                        <View style={{ flex: 1 }}>
                          <AdminButton
                            label="Lock"
                            icon={Lock}
                            variant="secondary"
                            compact
                            onPress={() => {
                              setSelectedModuleId(m.id);
                              setLockModalMode("lock");
                              setSelectedTiers([]);
                              setLockModalOpen(true);
                            }}
                            style={{ flex: 1, backgroundColor: p.warningSoft }}
                          />
                        </View>

                        <AdminIconButton
                          icon={Trash2}
                          onPress={() => handleDeleteModule(m.id, m.title)}
                          variant="danger"
                          accessibilityLabel="Delete module"
                        />
                      </View>
                    </AdminCard>
                  </Animated.View>
                ))}

                {(workspace?.modules.length === 0) && (
                  <AdminEmptyState
                    icon={Layers}
                    title="No modules yet"
                    description="Create your first module to get started."
                    action={
                      <AdminButton
                        label="Add Module"
                        icon={Plus}
                        onPress={() => { setModuleForm({ id: null, title: "" }); setModuleModalOpen(true); }}
                      />
                    }
                  />
                )}
              </View>
            </View>

          ) : (

            /* Others tab */
            <View>
              <Animated.View entering={reduceMotion ? undefined : FadeInDown.duration(280).springify()}>
                <AdminCard color="lavender" style={{ marginBottom: 18 }}>
                  <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: p.textMuted, textTransform: "uppercase", letterSpacing: 1.1 }}>
                    Other Editable Content
                  </Text>
                  <Text style={{ fontFamily: "Outfit-ExtraBold", fontSize: 20, color: p.textPrimary, letterSpacing: -0.4, marginTop: 6 }}>
                    Supporting content
                  </Text>
                  <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textSecondary, lineHeight: 19, marginTop: 4 }}>
                    Manage warm-up, cool-down, mobility, recovery, in-season, off-season, and education content for this plan.
                  </Text>
                </AdminCard>
              </Animated.View>

              <View style={{ gap: 16 }}>
                {(workspace?.others ?? []).map((group, gIdx) => {
                  const section = getOtherSectionConfig(group.type);
                  const sortedItems = [...group.items].sort((a, b) => a.order - b.order);
                  const groupColor = OTHER_COLORS[gIdx % OTHER_COLORS.length];

                  return (
                    <Animated.View
                      key={group.type}
                      entering={reduceMotion ? undefined : FadeInDown.delay(gIdx * 60).duration(280).springify()}
                    >
                      <AdminCard color={groupColor}>
                        {/* Section header */}
                        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: p.accent }} />
                              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: p.textMuted, textTransform: "uppercase", letterSpacing: 1.1 }}>
                                {section.concept === "age-schedule" ? "Schedule content" : "Content"}
                              </Text>
                            </View>
                            <Text style={{ fontFamily: "Outfit-ExtraBold", fontSize: 19, color: p.textPrimary, letterSpacing: -0.3 }}>
                              {section.label}
                            </Text>
                            <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textSecondary, lineHeight: 18, marginTop: 4 }}>
                              {section.summary}
                            </Text>
                          </View>
                          <AdminButton
                            label="Add"
                            icon={Plus}
                            compact
                            onPress={() => {
                              setOtherForm({
                                id: null,
                                title: "",
                                body: "",
                                type: group.type,
                                scheduleNote: "",
                                videoUrl: "",
                                order: "",
                              });
                              setOtherModalOpen(true);
                            }}
                          />
                        </View>

                        {/* Items */}
                        <View style={{ gap: 10 }}>
                          {sortedItems.length === 0 ? (
                            <AdminEmptyState
                              icon={FileText}
                              title="No content created yet"
                              color={groupColor}
                            />
                          ) : (
                            sortedItems.map((item) => (
                              <View
                                key={item.id}
                                style={{
                                  padding: 16,
                                  borderRadius: 20,
                                  backgroundColor: p.cardWhite,
                                  shadowColor: p.shadow,
                                  shadowOpacity: 1,
                                  shadowRadius: 6,
                                  shadowOffset: { width: 0, height: 2 },
                                  elevation: 2,
                                }}
                              >
                                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                                  <AdminBadge color="lavender" style={{ minWidth: 34 }}>
                                    {item.order}
                                  </AdminBadge>
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 15, color: p.textPrimary }} numberOfLines={2}>
                                      {item.title}
                                    </Text>
                                    {item.scheduleNote ? (
                                      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 12, color: p.accent, marginTop: 4 }} numberOfLines={2}>
                                        {item.scheduleNote}
                                      </Text>
                                    ) : null}
                                  </View>
                                </View>

                                {item.body ? (
                                  <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textSecondary, lineHeight: 19, marginTop: 10 }}>
                                    {item.body}
                                  </Text>
                                ) : null}

                                {item.videoUrl ? (
                                  <View
                                    style={{
                                      marginTop: 10,
                                      borderRadius: 16,
                                      overflow: "hidden",
                                      backgroundColor: p.inputBg,
                                    }}
                                  >
                                    <VideoPlayer
                                      uri={item.videoUrl}
                                      height={170}
                                      autoPlay={false}
                                      initialMuted
                                      isLooping={false}
                                    />
                                  </View>
                                ) : null}

                                <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
                                  <View style={{ flex: 1 }}>
                                    <AdminButton
                                      label="Edit"
                                      icon={Edit2}
                                      variant="secondary"
                                      compact
                                      onPress={() => {
                                        setOtherForm({
                                          id: item.id,
                                          title: item.title,
                                          body: item.body || "",
                                          type: group.type,
                                          scheduleNote: item.scheduleNote ?? "",
                                          videoUrl: item.videoUrl ?? "",
                                          order: String(item.order),
                                        });
                                        setOtherModalOpen(true);
                                      }}
                                    />
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <AdminButton
                                      label="Delete"
                                      icon={Trash2}
                                      variant="danger"
                                      compact
                                      onPress={() => handleDeleteOther(item.id, item.title)}
                                    />
                                  </View>
                                </View>
                              </View>
                            ))
                          )}
                        </View>
                      </AdminCard>
                    </Animated.View>
                  );
                })}

                {(workspace?.others.length === 0) && (
                  <AdminEmptyState
                    icon={FolderOpen}
                    title="No other content sections yet"
                    description="Content sections will appear once created."
                  />
                )}
              </View>
            </View>
          )}
        </View>
      </ThemedScrollView>

      {/* Module Modal */}
      <Modal visible={moduleModalOpen} transparent animationType="fade">
        <AdminModalContainer onClose={() => setModuleModalOpen(false)}>
          <AdminModalTitle>{moduleForm.id ? "Edit Module" : "New Module"}</AdminModalTitle>
          <AdminModalSubtitle>
            {moduleForm.id ? "Update the module title." : "Create a new module for this audience."}
          </AdminModalSubtitle>

          <AdminFormField
            label="Module Title"
            value={moduleForm.title}
            onChangeText={(t) => setModuleForm((prev) => ({ ...prev, title: t }))}
            placeholder="e.g. Strength Phase 1"
            autoFocus
          />

          <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
            <View style={{ flex: 1 }}>
              <AdminButton
                label="Cancel"
                variant="ghost"
                onPress={() => setModuleModalOpen(false)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AdminButton
                label="Save"
                onPress={handleSaveModule}
                disabled={!moduleForm.title.trim()}
                loading={modulesHook.isBusy}
              />
            </View>
          </View>
        </AdminModalContainer>
      </Modal>

      {/* Other Item Modal */}
      <Modal visible={otherModalOpen} transparent animationType="fade">
        <AdminModalContainer onClose={() => setOtherModalOpen(false)} position="bottom">
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <AdminModalTitle>
              {otherForm.id ? "Edit content" : `Add ${activeOtherSection.label} content`}
            </AdminModalTitle>
            <AdminModalSubtitle>{`Add or update admin content for ${activeOtherSection.label}.`}</AdminModalSubtitle>

            <AdminFormField
              label="Title"
              value={otherForm.title}
              onChangeText={(t) => setOtherForm((prev) => ({ ...prev, title: t }))}
              placeholder="Title"
            />

            <AdminFormField
              label="Body"
              value={otherForm.body}
              onChangeText={(t) => setOtherForm((prev) => ({ ...prev, body: t }))}
              placeholder="Content body"
              multiline
            />

            <AdminFormField
              label="Schedule note"
              value={otherForm.scheduleNote}
              onChangeText={(t) => setOtherForm((prev) => ({ ...prev, scheduleNote: t }))}
              placeholder="Optional schedule note"
            />

            <AdminFormField
              label="Video URL"
              value={otherForm.videoUrl}
              onChangeText={(t) => setOtherForm((prev) => ({ ...prev, videoUrl: t }))}
              placeholder="https://..."
              keyboardType="url"
            />
            {otherForm.videoUrl.trim() ? (
              <View
                style={{
                  marginTop: -8,
                  marginBottom: 16,
                  borderRadius: 16,
                  overflow: "hidden",
                  backgroundColor: p.inputBg,
                }}
              >
                <VideoPlayer
                  uri={otherForm.videoUrl.trim()}
                  height={180}
                  autoPlay={false}
                  initialMuted
                  isLooping={false}
                />
              </View>
            ) : null}

            <AdminFormField
              label="Order"
              value={otherForm.order}
              onChangeText={(t) => setOtherForm((prev) => ({ ...prev, order: t.replace(/[^0-9]/g, "") }))}
              placeholder="Optional display order"
              keyboardType="number-pad"
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <AdminButton
                  label="Cancel"
                  variant="ghost"
                  onPress={() => setOtherModalOpen(false)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AdminButton
                  label="Save"
                  onPress={handleSaveOther}
                  disabled={!otherForm.title.trim() || !otherForm.body.trim()}
                  loading={otherHook.isBusy}
                />
              </View>
            </View>
          </ScrollView>
        </AdminModalContainer>
      </Modal>

      {/* Lock Modal */}
      <Modal visible={lockModalOpen} transparent animationType="fade">
        <AdminModalContainer onClose={() => setLockModalOpen(false)}>
          <AdminModalTitle>Lock tiers</AdminModalTitle>
          <AdminModalSubtitle>Select tiers to lock from this module onwards.</AdminModalSubtitle>

          <View style={{ gap: 8, marginBottom: 24 }}>
            {PROGRAM_TIERS.map((tier) => {
              const isSelected = selectedTiers.includes(tier.value);
              return (
                <Pressable
                  key={tier.value}
                  onPress={() =>
                    setSelectedTiers((prev) =>
                      isSelected ? prev.filter((t) => t !== tier.value) : [...prev, tier.value]
                    )
                  }
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 16,
                    borderRadius: 20,
                    backgroundColor: isSelected ? p.accentSoft : p.inputBg,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text style={{ fontFamily: "Outfit-Bold", fontSize: 15, color: isSelected ? p.accent : p.textPrimary }}>
                    {tier.label}
                  </Text>
                  {isSelected && <CheckCircle size={18} color={p.accent} strokeWidth={2.2} />}
                </Pressable>
              );
            })}
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <AdminButton
                label="Cancel"
                variant="ghost"
                onPress={() => setLockModalOpen(false)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AdminButton
                label="Update Locks"
                onPress={handleUpdateLocks}
                disabled={selectedTiers.length === 0}
                loading={modulesHook.isBusy}
              />
            </View>
          </View>
        </AdminModalContainer>
      </Modal>
    </AdminScreen>
  );
}
