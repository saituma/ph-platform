import React, { useEffect, useState } from "react";
import { Alert, Modal, Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { FolderOpen, Plus, Trash2 } from "lucide-react-native";

import { Text } from "@/components/ScaledText";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import {
  AdminScreen,
  AdminHeader,
  AdminBackButton,
  AdminCard,
  AdminBadge,
  AdminButton,
  AdminEmptyState,
  AdminLoadingState,
  AdminIconButton,
  AdminModalContainer,
  AdminModalTitle,
  AdminModalSubtitle,
  AdminFormField,
  useAdminPastel,
} from "@/components/admin/AdminUI";
import { useAppSelector } from "@/store/hooks";
import { useAdminProgramBuilder, type ModuleItem } from "@/hooks/admin/useAdminProgramBuilder";
import type { AdminCardColor } from "@/constants/theme";

const MODULE_COLORS: AdminCardColor[] = ["sage", "peach", "lavender", "mint", "pink"];

export default function AdminProgramDetailScreen() {
  const p = useAdminPastel();
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
            title={programName}
            subtitle={`${modules.length} module${modules.length !== 1 ? "s" : ""}`}
            right={<AdminBackButton onPress={() => router.back()} />}
          />
        </Animated.View>

        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(120).duration(360).springify()}
          style={{ paddingHorizontal: 24, marginBottom: 16 }}
        >
          <AdminButton
            label="Add Module"
            icon={Plus}
            variant="primary"
            onPress={() => setModalOpen(true)}
            style={{ borderRadius: 100 }}
          />
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
            {modules.map((mod, idx) => {
              const cardColor = MODULE_COLORS[idx % MODULE_COLORS.length];
              return (
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
                  {() => (
                    <AdminCard color={cardColor}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            backgroundColor: p.accentSoft,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.accent }}>
                            {idx + 1}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: "Satoshi-Bold", fontSize: 15, color: p.textPrimary }} numberOfLines={1}>
                            {mod.title}
                          </Text>
                          {mod.description ? (
                            <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textSecondary, marginTop: 2 }} numberOfLines={1}>
                              {mod.description}
                            </Text>
                          ) : null}
                          <View style={{ flexDirection: "row", gap: 6, marginTop: 5 }}>
                            <AdminBadge color="mint">{mod.sessionCount ?? 0} sessions</AdminBadge>
                          </View>
                        </View>
                        <AdminIconButton
                          icon={Trash2}
                          variant="danger"
                          accessibilityLabel="Delete module"
                          onPress={() => handleDelete(mod)}
                          disabled={isBusy}
                        />
                      </View>
                    </AdminCard>
                  )}
                </Pressable>
              );
            })}
          </Animated.View>
        )}
      </ThemedScrollView>

      <Modal visible={modalOpen} transparent animationType="fade">
        <AdminModalContainer onClose={() => setModalOpen(false)}>
          <AdminModalTitle>Add Module</AdminModalTitle>
          <AdminModalSubtitle>Create a new module in this program.</AdminModalSubtitle>

          <AdminFormField
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Foundation Phase"
            autoFocus
          />
          <AdminFormField
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Optional description"
          />

          <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
            <View style={{ flex: 1 }}>
              <AdminButton
                label="Cancel"
                variant="ghost"
                onPress={() => setModalOpen(false)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AdminButton
                label="Save"
                variant="primary"
                onPress={handleCreate}
                disabled={!title.trim() || isBusy}
                loading={isBusy}
              />
            </View>
          </View>
        </AdminModalContainer>
      </Modal>
    </AdminScreen>
  );
}
