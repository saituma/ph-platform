import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text, TextInput } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Shadows } from "@/constants/theme";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Feather } from "@/components/ui/theme-icons";

export default function AdminAudienceWorkspaceScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const { audienceLabel: rawLabel, mode } = useLocalSearchParams<{ audienceLabel: string; mode?: string }>();
  
  const token = useAppSelector((state) => state.user.token);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);
  const canLoad = Boolean(token && bootstrapReady);

  const { workspace, loading, error, load: loadWorkspace } = useAdminAudienceWorkspace(token, canLoad, rawLabel);
  const modulesHook = useAdminModules(token, canLoad);
  const otherHook = useAdminOtherContent(token, canLoad);

  const [activeTab, setActiveTab] = useState<"modules" | "others">("modules");
  
  // Module Modal
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [moduleForm, setModuleForm] = useState({ id: null as number | null, title: "" });

  // Other Item Modal
  const [otherModalOpen, setOtherModalOpen] = useState(false);
  const [otherForm, setOtherForm] = useState({ id: null as number | null, title: "", body: "", type: "" });

  // Lock Modal
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [lockModalMode, setLockModalMode] = useState<"lock" | "unlock">("lock");
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);

  useEffect(() => {
    if (canLoad && rawLabel) {
      loadWorkspace();
    }
  }, [canLoad, rawLabel, loadWorkspace]);

  const displayLabel = useMemo(() => {
    if (!rawLabel) return "";
    if (isAdultStorageAudienceLabel(rawLabel)) return fromStorageAudienceLabel(rawLabel);
    if (isTeamStorageAudienceLabel(rawLabel)) return fromTeamStorageAudienceLabel(rawLabel);
    return `Age ${rawLabel}`;
  }, [rawLabel]);

  const cardStyle = {
    backgroundColor: isDark ? colors.cardElevated : colors.card,
    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
    borderRadius: 32,
    ...(isDark ? Shadows.none : Shadows.sm),
  };

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
        }
      }
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
        }
      }
    ]);
  };

  const handleMoveModule = async (moduleId: number, direction: 'up' | 'down') => {
    const modules = [...(workspace?.modules ?? [])].sort((a, b) => a.order - b.order);
    const index = modules.findIndex(m => m.id === moduleId);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === modules.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
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
      await modulesHook.updateLocks(rawLabel, lockModalMode === 'lock' ? selectedModuleId : null, selectedTiers);
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
        }
      }
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <View className="px-6 py-6 flex-row items-center justify-between border-b border-app/5">
        <TouchableOpacity 
          onPress={() => goBackOrFallbackTabs(router, pathname)}
          className="h-10 w-10 rounded-full bg-secondary/5 items-center justify-center border border-app/5"
        >
          <Feather name="chevron-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <View className="flex-1 items-center px-4">
          <Text className="text-xl font-clash font-bold text-app" numberOfLines={1}>
            {displayLabel}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={cleanupPlaceholders}
          className="h-10 w-10 rounded-full bg-secondary/5 items-center justify-center border border-app/5"
        >
          <Feather name="trash" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ThemedScrollView showsVerticalScrollIndicator={false} onRefresh={() => loadWorkspace(true)}>
        <View className="p-6 pb-40">
          {/* Tab Switcher */}
          <View className="flex-row p-1.5 rounded-[22px] border mb-10"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
              borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
            }}
          >
            <TouchableOpacity
              onPress={() => setActiveTab("modules")}
              className="flex-1 h-12 rounded-[18px] items-center justify-center"
              style={{ backgroundColor: activeTab === "modules" ? colors.accent : "transparent" }}
            >
              <Text className="font-outfit-bold text-[13px] uppercase tracking-wider" style={{ color: activeTab === "modules" ? colors.textInverse : colors.textSecondary }}>Modules</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab("others")}
              className="flex-1 h-12 rounded-[18px] items-center justify-center"
              style={{ backgroundColor: activeTab === "others" ? colors.accent : "transparent" }}
            >
              <Text className="font-outfit-bold text-[13px] uppercase tracking-wider" style={{ color: activeTab === "others" ? colors.textInverse : colors.textSecondary }}>Others</Text>
            </TouchableOpacity>
          </View>

          {loading && !workspace ? (
            <View className="gap-4">
              <Skeleton width="100%" height={120} borderRadius={24} />
              <Skeleton width="100%" height={120} borderRadius={24} />
            </View>
          ) : error ? (
            <View className="p-8 rounded-[32px] bg-red-500/10 border border-red-500/20">
              <Text className="text-red-400 font-outfit text-center">{error}</Text>
            </View>
          ) : (
            <View>
              {activeTab === "modules" ? (
                <View>
                  <View className="flex-row items-center justify-between mb-6">
                    <View className="flex-row items-center gap-2">
                      <View className="h-4 w-1 rounded-full bg-accent" />
                      <Text className="text-lg font-clash font-bold text-app uppercase tracking-wider">Module Slots</Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => {
                        setModuleForm({ id: null, title: "" });
                        setModuleModalOpen(true);
                      }}
                      className="h-10 px-4 rounded-xl bg-accent items-center justify-center flex-row gap-2"
                    >
                      <Feather name="plus" size={16} color={colors.textInverse} />
                      <Text className="font-outfit-bold text-[12px] uppercase tracking-wider" style={{ color: colors.textInverse }}>Add</Text>
                    </TouchableOpacity>
                  </View>

                  <View className="gap-4">
                    {workspace?.modules.sort((a,b) => a.order - b.order).map((m) => (
                      <View 
                        key={m.id}
                        className="rounded-[32px] border overflow-hidden"
                        style={cardStyle}
                      >
                        <Pressable 
                          onPress={() => router.push({
                            pathname: "/admin-audience-workspace/modules/[moduleId]",
                            params: { moduleId: m.id, audienceLabel: rawLabel }
                          } as any)}
                          className="p-6"
                        >
                          <View className="flex-row items-center justify-between mb-2">
                            <View className="flex-1 mr-2">
                              <Text className="text-xs font-outfit-bold text-accent uppercase tracking-widest mb-1">Module {m.order + 1}</Text>
                              <Text className="text-xl font-clash font-bold text-app" numberOfLines={1}>{m.title}</Text>
                            </View>
                            <Feather name="chevron-right" size={20} color={colors.textSecondary} />
                          </View>
                          <Text className="text-xs font-outfit text-textSecondary uppercase tracking-widest">
                            {m.sessions?.length ?? 0} Sessions · {m.totalDayLength} Days
                          </Text>
                          
                          <View className="flex-row gap-3 mt-6 pt-6 border-t border-app/5">
                            <View className="flex-row gap-2">
                              <TouchableOpacity 
                                onPress={() => handleMoveModule(m.id, 'up')}
                                className="h-10 w-10 rounded-xl bg-secondary/5 items-center justify-center border border-app/5"
                              >
                                <Feather name="arrow-up" size={14} color={colors.textSecondary} />
                              </TouchableOpacity>
                              <TouchableOpacity 
                                onPress={() => handleMoveModule(m.id, 'down')}
                                className="h-10 w-10 rounded-xl bg-secondary/5 items-center justify-center border border-app/5"
                              >
                                <Feather name="arrow-down" size={14} color={colors.textSecondary} />
                              </TouchableOpacity>
                            </View>

                            <TouchableOpacity 
                              onPress={() => {
                                setModuleForm({ id: m.id, title: m.title });
                                setModuleModalOpen(true);
                              }}
                              className="flex-1 h-10 rounded-xl bg-secondary/5 items-center justify-center flex-row gap-2"
                            >
                              <Feather name="edit-2" size={14} color={colors.text} />
                              <Text className="text-[10px] font-outfit-bold text-app uppercase">Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              onPress={() => {
                                setSelectedModuleId(m.id);
                                setLockModalMode("lock");
                                setSelectedTiers([]);
                                setLockModalOpen(true);
                              }}
                              className="flex-1 h-10 rounded-xl bg-amber-500/10 items-center justify-center flex-row gap-2 border border-amber-500/20"
                            >
                              <Feather name="lock" size={14} color="#F59E0B" />
                              <Text className="text-[10px] font-outfit-bold text-amber-600 uppercase">Lock</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              onPress={() => handleDeleteModule(m.id, m.title)}
                              className="h-10 w-10 rounded-xl bg-red-500/10 items-center justify-center border border-red-500/20"
                            >
                              <Feather name="trash-2" size={14} color={colors.danger} />
                            </TouchableOpacity>
                          </View>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <View>
                  <View className="flex-row items-center gap-2 mb-6">
                    <View className="h-4 w-1 rounded-full bg-accent" />
                    <Text className="text-lg font-clash font-bold text-app uppercase tracking-wider">Categorized Items</Text>
                  </View>

                  {workspace?.others.map((group) => (
                    <View key={group.type} className="mb-10">
                      <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-sm font-outfit-bold text-textSecondary uppercase tracking-[1.5px]">
                          {group.label}
                        </Text>
                        <TouchableOpacity 
                          onPress={() => {
                            setOtherForm({ id: null, title: "", body: "", type: group.type });
                            setOtherModalOpen(true);
                          }}
                          className="h-8 px-3 rounded-lg bg-accent/10 items-center justify-center flex-row gap-1.5"
                        >
                          <Feather name="plus" size={12} color={colors.accent} />
                          <Text className="text-[10px] font-outfit-bold text-accent uppercase">Add</Text>
                        </TouchableOpacity>
                      </View>
                      
                      {group.items.length === 0 ? (
                        <View className="py-6 items-center justify-center border border-dashed border-app/10 rounded-[20px]">
                          <Text className="text-[12px] font-outfit text-textSecondary italic">No items.</Text>
                        </View>
                      ) : (
                        <View className="gap-3">
                          {group.items.sort((a,b) => a.order - b.order).map((item) => (
                            <TouchableOpacity 
                              key={item.id}
                              onPress={() => {
                                setOtherForm({ id: item.id, title: item.title, body: item.body || "", type: group.type });
                                setOtherModalOpen(true);
                              }}
                              className="flex-row items-center justify-between p-5 rounded-[24px] bg-secondary/5 border border-app/5"
                            >
                              <View className="flex-1 mr-4">
                                <Text className="font-outfit-bold text-app" numberOfLines={1}>{item.title}</Text>
                                {item.body ? <Text className="text-[11px] font-outfit text-textSecondary mt-1" numberOfLines={1}>{item.body}</Text> : null}
                              </View>
                              <TouchableOpacity onPress={() => handleDeleteOther(item.id, item.title)}>
                                <Feather name="trash-2" size={16} color={colors.danger} style={{ opacity: 0.6 }} />
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
          )}
        </View>
      </ThemedScrollView>

      {/* Module Modal */}
      <Modal visible={moduleModalOpen} transparent animationType="fade">
        <Pressable className="flex-1 bg-black/60 items-center justify-center p-6" onPress={() => setModuleModalOpen(false)}>
          <View className="w-full max-w-sm rounded-[32px] overflow-hidden p-8" style={{ backgroundColor: isDark ? "#161628" : "#FFFFFF" }}>
            <Text className="text-2xl font-clash font-bold text-app mb-6">{moduleForm.id ? "Edit Module" : "New Module"}</Text>
            <View className="mb-8">
              <Text className="text-[11px] font-outfit-bold text-textSecondary uppercase tracking-[2px] mb-3 ml-1">Module Title</Text>
              <View className="rounded-2xl border px-5 h-14 justify-center" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)", borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)" }}>
                <TextInput value={moduleForm.title} onChangeText={(t) => setModuleForm(prev => ({ ...prev, title: t }))} placeholder="e.g. Strength Phase 1" placeholderTextColor={colors.placeholder} className="text-[16px] font-outfit text-app" cursorColor={colors.accent} autoFocus />
              </View>
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setModuleModalOpen(false)} className="flex-1 h-12 rounded-xl bg-secondary/10 items-center justify-center"><Text className="text-sm font-outfit-bold text-app uppercase tracking-wider">Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSaveModule} disabled={!moduleForm.title.trim() || modulesHook.isBusy} className="flex-1 h-12 rounded-xl bg-accent items-center justify-center" style={{ opacity: modulesHook.isBusy ? 0.6 : 1 }}>
                {modulesHook.isBusy ? <ActivityIndicator color={colors.textInverse} size="small" /> : <Text className="text-sm font-outfit-bold text-app uppercase tracking-wider" style={{ color: colors.textInverse }}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Other Item Modal */}
      <Modal visible={otherModalOpen} transparent animationType="fade">
        <Pressable className="flex-1 bg-black/60 items-center justify-center p-6" onPress={() => setOtherModalOpen(false)}>
          <View className="w-full max-w-sm rounded-[32px] overflow-hidden p-8" style={{ backgroundColor: isDark ? "#161628" : "#FFFFFF" }}>
            <Text className="text-2xl font-clash font-bold text-app mb-6">{otherForm.id ? "Edit Item" : "New Item"}</Text>
            <View className="mb-6">
              <Text className="text-[11px] font-outfit-bold text-textSecondary uppercase tracking-[2px] mb-2 ml-1">Title</Text>
              <View className="rounded-2xl border px-5 h-14 justify-center" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)", borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)" }}>
                <TextInput value={otherForm.title} onChangeText={(t) => setOtherForm(prev => ({ ...prev, title: t }))} placeholder="Title..." placeholderTextColor={colors.placeholder} className="text-[16px] font-outfit text-app" cursorColor={colors.accent} />
              </View>
            </View>
            <View className="mb-8">
              <Text className="text-[11px] font-outfit-bold text-textSecondary uppercase tracking-[2px] mb-2 ml-1">Description</Text>
              <View className="rounded-2xl border px-5 py-4 min-h-[100px]" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)", borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)" }}>
                <TextInput value={otherForm.body} onChangeText={(t) => setOtherForm(prev => ({ ...prev, body: t }))} placeholder="Description..." placeholderTextColor={colors.placeholder} multiline className="text-[16px] font-outfit text-app" cursorColor={colors.accent} />
              </View>
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setOtherModalOpen(false)} className="flex-1 h-12 rounded-xl bg-secondary/10 items-center justify-center"><Text className="text-sm font-outfit-bold text-app uppercase tracking-wider">Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSaveOther} disabled={!otherForm.title.trim() || otherHook.isBusy} className="flex-1 h-12 rounded-xl bg-accent items-center justify-center" style={{ opacity: otherHook.isBusy ? 0.6 : 1 }}>
                {otherHook.isBusy ? <ActivityIndicator color={colors.textInverse} size="small" /> : <Text className="text-sm font-outfit-bold text-app uppercase tracking-wider" style={{ color: colors.textInverse }}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Lock Modal */}
      <Modal visible={lockModalOpen} transparent animationType="fade">
        <Pressable className="flex-1 bg-black/60 items-center justify-center p-6" onPress={() => setLockModalOpen(false)}>
          <View className="w-full max-w-sm rounded-[32px] overflow-hidden p-8" style={{ backgroundColor: isDark ? "#161628" : "#FFFFFF" }}>
            <Text className="text-2xl font-clash font-bold text-app mb-2">Lock tiers</Text>
            <Text className="text-sm font-outfit text-textSecondary mb-6">Select tiers to lock from this module onwards.</Text>
            
            <View className="mb-8 gap-3">
              {PROGRAM_TIERS.map(tier => {
                const isSelected = selectedTiers.includes(tier.value);
                return (
                  <TouchableOpacity 
                    key={tier.value}
                    onPress={() => setSelectedTiers(prev => isSelected ? prev.filter(t => t !== tier.value) : [...prev, tier.value])}
                    className={`flex-row items-center justify-between p-4 rounded-2xl border ${isSelected ? 'bg-accent/10 border-accent' : 'bg-secondary/5 border-app/5'}`}
                  >
                    <Text className={`font-outfit-bold ${isSelected ? 'text-accent' : 'text-app'}`}>{tier.label}</Text>
                    {isSelected && <Feather name="check-circle" size={18} color={colors.accent} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setLockModalOpen(false)} className="flex-1 h-12 rounded-xl bg-secondary/10 items-center justify-center"><Text className="text-sm font-outfit-bold text-app uppercase tracking-wider">Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleUpdateLocks} disabled={selectedTiers.length === 0 || modulesHook.isBusy} className="flex-1 h-12 rounded-xl bg-accent items-center justify-center" style={{ opacity: modulesHook.isBusy ? 0.6 : 1 }}>
                {modulesHook.isBusy ? <ActivityIndicator color={colors.textInverse} size="small" /> : <Text className="text-sm font-outfit-bold text-app uppercase tracking-wider" style={{ color: colors.textInverse }}>Update Locks</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
