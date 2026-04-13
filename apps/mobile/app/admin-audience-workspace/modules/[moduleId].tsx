import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text, TextInput } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Shadows } from "@/constants/theme";
import { useAdminSessions } from "@/hooks/admin/useAdminSessions";
import { useAdminAudienceWorkspace, Module, ModuleSession } from "@/hooks/admin/useAdminAudienceWorkspace";
import { useAppSelector } from "@/store/hooks";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, TouchableOpacity, Modal, Pressable, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@/components/ui/theme-icons";

export default function AdminModuleDetailScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { moduleId: rawModuleId, audienceLabel: rawLabel } = useLocalSearchParams<{ moduleId: string; audienceLabel: string }>();
  const moduleId = parseInt(rawModuleId);

  const token = useAppSelector((state) => state.user.token);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);
  const canLoad = Boolean(token && bootstrapReady);

  const { workspace, loading: workspaceLoading, load: loadWorkspace } = useAdminAudienceWorkspace(token, canLoad, rawLabel);
  const sessionsHook = useAdminSessions(token, canLoad);

  const module = useMemo(() => workspace?.modules.find(m => m.id === moduleId), [workspace, moduleId]);

  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState({ id: null as number | null, title: "" });

  useEffect(() => {
    if (canLoad && rawLabel) {
      loadWorkspace();
    }
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
        }
      }
    ]);
  };

  const cardStyle = {
    backgroundColor: isDark ? colors.cardElevated : colors.card,
    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
    borderRadius: 24,
    ...(isDark ? Shadows.none : Shadows.sm),
  };

  if (workspaceLoading && !module) {
    return (
      <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
        <View className="p-6 gap-4">
          <Skeleton width="60%" height={32} />
          <Skeleton width="100%" height={120} borderRadius={24} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <View className="px-6 py-6 flex-row items-center justify-between border-b border-app/5">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="h-10 w-10 rounded-full bg-secondary/5 items-center justify-center border border-app/5"
        >
          <Feather name="chevron-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <View className="flex-1 items-center px-4">
          <Text className="text-xl font-clash font-bold text-app" numberOfLines={1}>
            {module?.title || "Module Detail"}
          </Text>
        </View>
        <View className="w-10" />
      </View>

      <ThemedScrollView showsVerticalScrollIndicator={false} onRefresh={() => loadWorkspace(true)}>
        <View className="p-6 pb-40">
          <View className="flex-row items-center justify-between mb-8">
            <View>
              <Text className="text-[11px] font-outfit-bold text-accent uppercase tracking-wider mb-1">
                Audience: {rawLabel}
              </Text>
              <Text className="text-2xl font-clash font-bold text-app">Sessions</Text>
            </View>
            <TouchableOpacity 
              onPress={() => {
                setSessionForm({ id: null, title: "" });
                setSessionModalOpen(true);
              }}
              className="h-12 px-5 rounded-2xl bg-accent items-center justify-center flex-row gap-2"
            >
              <Feather name="plus" size={18} color={colors.textInverse} />
              <Text className="font-outfit-bold text-[14px] uppercase tracking-wider" style={{ color: colors.textInverse }}>Add</Text>
            </TouchableOpacity>
          </View>

          {module?.sessions.length === 0 ? (
            <View className="py-20 items-center justify-center border border-dashed border-app/20 rounded-[32px]">
              <Text className="text-textSecondary font-outfit italic text-base">No sessions created yet.</Text>
            </View>
          ) : (
            <View className="gap-4">
              {module?.sessions.map((s) => (
                <TouchableOpacity 
                  key={s.id}
                  activeOpacity={0.9}
                  onPress={() => router.push({
                    pathname: "/admin-audience-workspace/sessions/[sessionId]",
                    params: { sessionId: s.id, audienceLabel: rawLabel, moduleId: rawModuleId }
                  } as any)}
                  className="p-6 border"
                  style={cardStyle}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-lg font-outfit-bold text-app flex-1 mr-2" numberOfLines={1}>
                      {s.title}
                    </Text>
                    <Feather name="chevron-right" size={18} color={colors.textSecondary} />
                  </View>
                  <Text className="text-xs font-outfit text-textSecondary uppercase tracking-widest">
                    {s.items?.length ?? 0} Items · Day {s.order + 1}
                  </Text>
                  
                  <View className="flex-row gap-3 mt-4 pt-4 border-t border-app/5">
                    <TouchableOpacity 
                      onPress={() => {
                        setSessionForm({ id: s.id, title: s.title });
                        setSessionModalOpen(true);
                      }}
                      className="flex-1 h-10 rounded-xl bg-secondary/5 items-center justify-center flex-row gap-2"
                    >
                      <Feather name="edit-2" size={14} color={colors.text} />
                      <Text className="text-[10px] font-outfit-bold text-app uppercase">Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleDeleteSession(s.id, s.title)}
                      className="flex-1 h-10 rounded-xl bg-red-500/10 items-center justify-center flex-row gap-2"
                    >
                      <Feather name="trash-2" size={14} color={colors.danger} />
                      <Text className="text-[10px] font-outfit-bold text-red-400 uppercase">Delete</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ThemedScrollView>

      {/* Session Modal */}
      <Modal visible={sessionModalOpen} transparent animationType="fade">
        <Pressable 
          className="flex-1 bg-black/60 items-center justify-center p-6"
          onPress={() => setSessionModalOpen(false)}
        >
          <View 
            className="w-full max-w-sm rounded-[32px] overflow-hidden p-8"
            style={{ backgroundColor: isDark ? "#161628" : "#FFFFFF" }}
          >
            <Text className="text-2xl font-clash font-bold text-app mb-6">
              {sessionForm.id ? "Edit Session" : "New Session"}
            </Text>

            <View className="mb-8">
              <Text className="text-[11px] font-outfit-bold text-textSecondary uppercase tracking-[2px] mb-3 ml-1">
                Session Title
              </Text>
              <View 
                className="rounded-2xl border px-5 h-14 justify-center"
                style={{
                  backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)",
                  borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
                }}
              >
                <TextInput
                  value={sessionForm.title}
                  onChangeText={(t) => setSessionForm(prev => ({ ...prev, title: t }))}
                  placeholder="e.g. Session A: Linear Speed"
                  placeholderTextColor={colors.placeholder}
                  className="text-[16px] font-outfit text-app"
                  cursorColor={colors.accent}
                  autoFocus
                />
              </View>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity 
                onPress={() => setSessionModalOpen(false)}
                className="flex-1 h-12 rounded-xl bg-secondary/10 items-center justify-center"
              >
                <Text className="text-sm font-outfit-bold text-app uppercase tracking-wider">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleSaveSession}
                disabled={!sessionForm.title.trim() || sessionsHook.isBusy}
                className="flex-1 h-12 rounded-xl bg-accent items-center justify-center"
                style={{ opacity: sessionsHook.isBusy ? 0.6 : 1 }}
              >
                {sessionsHook.isBusy ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <Text className="text-sm font-outfit-bold text-app uppercase tracking-wider" style={{ color: colors.textInverse }}>
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
