import React, { useEffect, useState } from "react";
import { Alert, Modal, Pressable, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { ChevronLeft, FolderOpen, Plus, Trash2 } from "lucide-react-native";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text, TextInput } from "@/components/ScaledText";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { AdminHeader, AdminScreen, AdminCard, AdminBadge, AdminEmptyState, AdminLoadingState, AdminIconButton } from "@/components/admin/AdminUI";
import { useAppSelector } from "@/store/hooks";
import { useAdminProgramBuilder, type ModuleItem } from "@/hooks/admin/useAdminProgramBuilder";

export default function AdminProgramDetailScreen() {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const params = useLocalSearchParams<{ programId: string; programName?: string }>();
  const programId = Number(params.programId);
  const programName = params.programName ?? "Program";

  const token = useAppSelector((s) => s.user.token);
  const bootstrapReady = useAppSelector((s) => s.app.bootstrapReady);
  const canLoad = Boolean(token && bootstrapReady);

  const { modules, loading, isBusy, loadModules, createModule, deleteModule } = useAdminProgramBuilder(token, canLoad);

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (canLoad && programId > 0) loadModules(programId);
  }, [canLoad, programId, loadModules]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    await createModule(programId, { title: title.trim(), description: description.trim() || undefined });
    setTitle("");
    setDescription("");
    setModalOpen(false);
  };

  const handleDelete = (mod: ModuleItem) => {
    Alert.alert("Delete Module", `Delete "${mod.title}"? This removes all its sessions.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteModule(programId, mod.id) },
    ]);
  };

  return (
    <AdminScreen>
      <ThemedScrollView
        showsVerticalScrollIndicator={false}
        onRefresh={() => loadModules(programId, true)}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(60).duration(360).springify()}
          style={{ marginBottom: 18 }}
        >
          <AdminHeader
            eyebrow="Program"
            title={programName}
            subtitle={`${modules.length} module${modules.length !== 1 ? "s" : ""}`}
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
              Add Module
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {loading ? (
          <AdminLoadingState label="Loading modules" />
        ) : modules.length === 0 ? (
          <AdminEmptyState
            icon={FolderOpen}
            title="No modules yet"
            description="Add a module to start building this program."
          />
        ) : (
          <Animated.View
            entering={reduceMotion ? undefined : FadeInDown.delay(180).duration(360).springify()}
            style={{ paddingHorizontal: 24, gap: 10 }}
          >
            {modules.map((mod, idx) => (
              <Pressable
                key={mod.id}
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: "/admin/ops/programs/modules/[moduleId]",
                    params: {
                      moduleId: String(mod.id),
                      programId: String(programId),
                      programName,
                      moduleTitle: mod.title,
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
                          {mod.title}
                        </Text>
                        {mod.description ? (
                          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
                            {mod.description}
                          </Text>
                        ) : null}
                        <View style={{ flexDirection: "row", gap: 6, marginTop: 5 }}>
                          <AdminBadge>{mod.sessionCount ?? 0} sessions</AdminBadge>
                        </View>
                      </View>
                      <AdminIconButton
                        icon={Trash2}
                        tone="danger"
                        accessibilityLabel="Delete module"
                        onPress={() => handleDelete(mod)}
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

      <CreateModuleModal
        visible={modalOpen}
        title={title}
        description={description}
        onChangeTitle={setTitle}
        onChangeDescription={setDescription}
        onSave={handleCreate}
        onClose={() => setModalOpen(false)}
        saving={isBusy}
      />
    </AdminScreen>
  );
}

function CreateModuleModal({
  visible, title, description, onChangeTitle, onChangeDescription, onSave, onClose, saving,
}: {
  visible: boolean; title: string; description: string;
  onChangeTitle: (v: string) => void; onChangeDescription: (v: string) => void;
  onSave: () => void; onClose: () => void; saving: boolean;
}) {
  const { colors, isDark } = useAppTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 24 }}
        onPress={onClose}
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
            Add Module
          </Text>
          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: colors.textSecondary, marginBottom: 20, lineHeight: 18 }}>
            Create a new module in this program.
          </Text>

          <ModalInput label="Title" value={title} onChangeText={onChangeTitle} placeholder="e.g. Foundation Phase" autoFocus />
          <ModalInput label="Description" value={description} onChangeText={onChangeDescription} placeholder="Optional description" />

          <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
            <TouchableOpacity
              onPress={onClose}
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
              onPress={onSave}
              disabled={!title.trim() || saving}
              style={{
                flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center",
                backgroundColor: colors.accent, opacity: saving || !title.trim() ? 0.6 : 1,
              }}
            >
              {saving ? (
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
  );
}

function ModalInput({ label, value, onChangeText, placeholder, autoFocus }: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder: string; autoFocus?: boolean;
}) {
  const { colors, isDark } = useAppTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: colors.textSecondary, marginBottom: 6 }}>
        {label}
      </Text>
      <View style={{
        borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, height: 48, justifyContent: "center",
        backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)",
        borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
      }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          style={{ fontFamily: "Outfit-Regular", fontSize: 15, color: colors.textPrimary }}
          cursorColor={colors.accent}
          autoFocus={autoFocus}
        />
      </View>
    </View>
  );
}
