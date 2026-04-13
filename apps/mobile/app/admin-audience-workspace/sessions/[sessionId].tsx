import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text, TextInput } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Shadows } from "@/constants/theme";
import { useAdminSessions } from "@/hooks/admin/useAdminSessions";
import { useAdminAudienceWorkspace, SessionItem } from "@/hooks/admin/useAdminAudienceWorkspace";
import { useAppSelector } from "@/store/hooks";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { View, TouchableOpacity, Modal, Pressable, ActivityIndicator, Alert, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@/components/ui/theme-icons";

export default function AdminSessionDetailScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sessionId: rawSessionId, audienceLabel: rawLabel, moduleId: rawModuleId } = useLocalSearchParams<{ sessionId: string; audienceLabel: string; moduleId: string }>();
  const sessionId = parseInt(rawSessionId);

  const token = useAppSelector((state) => state.user.token);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);
  const canLoad = Boolean(token && bootstrapReady);

  const { workspace, loading: workspaceLoading, load: loadWorkspace } = useAdminAudienceWorkspace(token, canLoad, rawLabel);
  const sessionsHook = useAdminSessions(token, canLoad);

  const session = useMemo(() => {
    if (!workspace) return null;
    for (const m of workspace.modules) {
      const s = m.sessions.find(s => s.id === sessionId);
      if (s) return s;
    }
    return null;
  }, [workspace, sessionId]);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemForm, setItemForm] = useState({
    id: null as number | null,
    title: "",
    body: "",
    blockType: "main",
    videoUrl: "",
  });

  useEffect(() => {
    if (canLoad && rawLabel) {
      loadWorkspace();
    }
  }, [canLoad, rawLabel, loadWorkspace]);

  const handleSaveItem = async () => {
    if (!itemForm.title.trim()) return;
    try {
      if (itemForm.id) {
        await sessionsHook.updateItem(itemForm.id, {
          title: itemForm.title,
          body: itemForm.body,
          blockType: itemForm.blockType,
          videoUrl: itemForm.videoUrl || null,
        });
      } else {
        await sessionsHook.createItem(sessionId, {
          title: itemForm.title,
          body: itemForm.body,
          blockType: itemForm.blockType,
          videoUrl: itemForm.videoUrl || null,
        });
      }
      setItemModalOpen(false);
      loadWorkspace(true);
    } catch (e) {
      Alert.alert("Error", "Failed to save item");
    }
  };

  const handleDeleteItem = (itemId: number, title: string) => {
    Alert.alert("Delete Item", `Are you sure you want to delete "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive", 
        onPress: async () => {
          try {
            await sessionsHook.deleteItem(itemId);
            loadWorkspace(true);
          } catch (e) {
            Alert.alert("Error", "Failed to delete item");
          }
        }
      }
    ]);
  };

  const handleMove = async (itemId: number, direction: 'up' | 'down') => {
    const items = [...(session?.items ?? [])].sort((a, b) => a.order - b.order);
    const index = items.findIndex(i => i.id === itemId);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === items.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const itemA = items[index];
    const itemB = items[targetIndex];

    try {
      await Promise.all([
        sessionsHook.updateItem(itemA.id, { order: itemB.order }),
        sessionsHook.updateItem(itemB.id, { order: itemA.order }),
      ]);
      loadWorkspace(true);
    } catch (e) {
      Alert.alert("Error", "Failed to reorder items");
    }
  };

  const cardStyle = {
    backgroundColor: isDark ? colors.cardElevated : colors.card,
    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
    borderRadius: 24,
    ...(isDark ? Shadows.none : Shadows.sm),
  };

  if (workspaceLoading && !session) {
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
            {session?.title || "Session Detail"}
          </Text>
        </View>
        <View className="w-10" />
      </View>

      <ThemedScrollView showsVerticalScrollIndicator={false} onRefresh={() => loadWorkspace(true)}>
        <View className="p-6 pb-40">
          <View className="flex-row items-center justify-between mb-8">
            <View>
              <Text className="text-[11px] font-outfit-bold text-accent uppercase tracking-wider mb-1">
                Day {session ? session.order + 1 : "?"}
              </Text>
              <Text className="text-2xl font-clash font-bold text-app">Items</Text>
            </View>
            <TouchableOpacity 
              onPress={() => {
                setItemForm({ id: null, title: "", body: "", blockType: "main", videoUrl: "" });
                setItemModalOpen(true);
              }}
              className="h-12 px-5 rounded-2xl bg-accent items-center justify-center flex-row gap-2"
            >
              <Feather name="plus" size={18} color={colors.textInverse} />
              <Text className="font-outfit-bold text-[14px] uppercase tracking-wider" style={{ color: colors.textInverse }}>Add</Text>
            </TouchableOpacity>
          </View>

          {session?.items.length === 0 ? (
            <View className="py-20 items-center justify-center border border-dashed border-app/20 rounded-[32px]">
              <Text className="text-textSecondary font-outfit italic text-base">No items created yet.</Text>
            </View>
          ) : (
            <View className="gap-4">
              {session?.items.sort((a,b) => a.order - b.order).map((item) => (
                <View 
                  key={item.id}
                  className="p-6 border"
                  style={cardStyle}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-1 mr-4">
                      <View className="flex-row items-center gap-2 mb-1">
                        <View className={`px-2 py-0.5 rounded-md ${item.blockType === 'warmup' ? 'bg-amber-500/10' : item.blockType === 'cooldown' ? 'bg-blue-500/10' : 'bg-accent/10'}`}>
                          <Text className={`text-[9px] font-outfit-bold uppercase tracking-wider ${item.blockType === 'warmup' ? 'text-amber-500' : item.blockType === 'cooldown' ? 'text-blue-500' : 'text-accent'}`}>
                            {item.blockType}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-lg font-outfit-bold text-app" numberOfLines={1}>
                        {item.title}
                      </Text>
                    </View>
                    {item.videoUrl && <Feather name="video" size={16} color={colors.accent} />}
                  </View>
                  
                  {item.body ? (
                    <Text className="text-sm font-outfit text-textSecondary mb-4 leading-relaxed" numberOfLines={2}>
                      {item.body}
                    </Text>
                  ) : null}
                  
                  <View className="flex-row gap-3 pt-4 border-t border-app/5">
                    <View className="flex-row gap-2">
                      <TouchableOpacity 
                        onPress={() => handleMove(item.id, 'up')}
                        className="h-10 w-10 rounded-xl bg-secondary/5 items-center justify-center border border-app/5"
                      >
                        <Feather name="arrow-up" size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => handleMove(item.id, 'down')}
                        className="h-10 w-10 rounded-xl bg-secondary/5 items-center justify-center border border-app/5"
                      >
                        <Feather name="arrow-down" size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity 
                      onPress={() => {
                        setItemForm({ id: item.id, title: item.title, body: item.body || "", blockType: item.blockType, videoUrl: item.videoUrl || "" });
                        setItemModalOpen(true);
                      }}
                      className="flex-1 h-10 rounded-xl bg-secondary/5 items-center justify-center flex-row gap-2"
                    >
                      <Feather name="edit-2" size={14} color={colors.text} />
                      <Text className="text-[10px] font-outfit-bold text-app uppercase">Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleDeleteItem(item.id, item.title)}
                      className="flex-1 h-10 rounded-xl bg-red-500/10 items-center justify-center flex-row gap-2"
                    >
                      <Feather name="trash-2" size={14} color={colors.danger} />
                      <Text className="text-[10px] font-outfit-bold text-red-400 uppercase">Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ThemedScrollView>

      {/* Item Modal */}
      <Modal visible={itemModalOpen} transparent animationType="fade">
        <Pressable 
          className="flex-1 bg-black/60 items-center justify-center p-6"
          onPress={() => setItemModalOpen(false)}
        >
          <View 
            className="w-full max-w-lg rounded-[32px] overflow-hidden p-8"
            style={{ backgroundColor: isDark ? "#161628" : "#FFFFFF" }}
          >
            <Text className="text-2xl font-clash font-bold text-app mb-6">
              {itemForm.id ? "Edit Item" : "New Item"}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
              <FormField label="Title" value={itemForm.title} onChangeText={(t) => setItemForm(prev => ({ ...prev, title: t }))} placeholder="Exercise name..." />
              <FormField label="Description" value={itemForm.body} onChangeText={(t) => setItemForm(prev => ({ ...prev, body: t }))} placeholder="How to instructions..." multiline />
              <FormField label="Video URL" value={itemForm.videoUrl} onChangeText={(t) => setItemForm(prev => ({ ...prev, videoUrl: t }))} placeholder="Cloudinary or YouTube link..." />
              
              <View className="mb-8">
                <Text className="text-[11px] font-outfit-bold text-textSecondary uppercase tracking-[2px] mb-3 ml-1">Block Type</Text>
                <View className="flex-row gap-2">
                  {['warmup', 'main', 'cooldown'].map(type => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setItemForm(prev => ({ ...prev, blockType: type }))}
                      className={`flex-1 h-10 rounded-xl items-center justify-center border ${itemForm.blockType === type ? 'bg-accent border-accent' : 'border-app/10'}`}
                    >
                      <Text className={`text-[10px] font-outfit-bold uppercase ${itemForm.blockType === type ? 'text-white' : 'text-textSecondary'}`}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity 
                onPress={() => setItemModalOpen(false)}
                className="flex-1 h-12 rounded-xl bg-secondary/10 items-center justify-center"
              >
                <Text className="text-sm font-outfit-bold text-app uppercase tracking-wider">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleSaveItem}
                disabled={!itemForm.title.trim() || sessionsHook.isBusy}
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

function FormField({ label, value, onChangeText, placeholder, multiline = false }: any) {
  const { colors, isDark } = useAppTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="mb-6">
      <Text className="text-[11px] font-outfit-bold text-textSecondary uppercase tracking-[2px] mb-2 ml-1">
        {label}
      </Text>
      <View 
        className="rounded-[18px] border px-5 justify-center"
        style={{
          backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)",
          borderColor: isFocused ? colors.accent : (isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)"),
          borderWidth: isFocused ? 2 : 1,
          minHeight: multiline ? 120 : 56,
          paddingVertical: multiline ? 16 : 0,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="text-[16px] font-outfit text-app"
          cursorColor={colors.accent}
        />
      </View>
    </View>
  );
}
