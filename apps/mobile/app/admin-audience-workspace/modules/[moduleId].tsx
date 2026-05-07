import { ThemedScrollView } from "@/components/ThemedScrollView";
import {
  AdminScreen,
  AdminHeader,
  AdminBackButton,
  AdminCard,
  AdminButton,
  AdminBadge,
  AdminEmptyState,
  AdminLoadingState,
  AdminIconButton,
  AdminModalContainer,
  AdminModalTitle,
  AdminFormField,
  useAdminPastel,
} from "@/components/admin/AdminUI";
import type { AdminCardColor } from "@/constants/theme";
import { useAdminSessions } from "@/hooks/admin/useAdminSessions";
import { useAdminAudienceWorkspace } from "@/hooks/admin/useAdminAudienceWorkspace";
import { useAppSelector } from "@/store/hooks";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Modal, Alert } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { Calendar, Plus, Edit2, Trash2, ChevronRight } from "lucide-react-native";
import { Text } from "@/components/ScaledText";

const CARD_COLORS: AdminCardColor[] = ["sage", "pink", "lavender", "peach", "mint", "yellow"];

export default function AdminModuleDetailScreen() {
  const p = useAdminPastel();
  const router = useRouter();
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

  if (workspaceLoading && !module) {
    return (
      <AdminScreen>
        <AdminLoadingState label="Loading sessions" />
      </AdminScreen>
    );
  }

  return (
    <AdminScreen>
      <AdminHeader
        title={module?.title || "Module Detail"}
        subtitle={`Audience: ${rawLabel}`}
        right={
          <AdminButton
            label="Add"
            icon={Plus}
            variant="primary"
            compact
            onPress={() => { setSessionForm({ id: null, title: "" }); setSessionModalOpen(true); }}
          />
        }
        compact
      />
      <View style={{ paddingHorizontal: 24, paddingBottom: 8 }}>
        <AdminBackButton onPress={() => router.back()} />
      </View>

      <ThemedScrollView showsVerticalScrollIndicator={false} onRefresh={() => loadWorkspace(true)}>
        <View style={{ padding: 20, paddingBottom: 120 }}>

          {module?.sessions.length === 0 ? (
            <AdminEmptyState
              icon={Calendar}
              title="No sessions yet"
              description="Create a session to start building this module's training days."
              color="lavender"
            />
          ) : (
            <View style={{ gap: 14 }}>
              {module?.sessions.map((s, idx) => (
                <Animated.View
                  key={s.id}
                  entering={reduceMotion ? undefined : FadeInDown.delay(idx * 50 + 80).duration(280).springify()}
                >
                  <AdminCard
                    color={CARD_COLORS[idx % CARD_COLORS.length]}
                    onPress={() =>
                      router.push({
                        pathname: "/admin-audience-workspace/sessions/[sessionId]",
                        params: { sessionId: s.id, audienceLabel: rawLabel, moduleId: rawModuleId },
                      } as any)
                    }
                  >
                    <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                      <View style={{ flex: 1, marginRight: 12, gap: 8 }}>
                        <AdminBadge color="mint">Day {s.order + 1}</AdminBadge>
                        <Text
                          style={{
                            fontFamily: "Outfit-Bold",
                            fontSize: 18,
                            color: p.textPrimary,
                            letterSpacing: -0.2,
                          }}
                          numberOfLines={2}
                        >
                          {s.title}
                        </Text>
                        <AdminBadge color="peach">{s.items?.length ?? 0} exercises</AdminBadge>
                      </View>
                      <ChevronRight size={18} color={p.textMuted} strokeWidth={2} style={{ marginTop: 16 }} />
                    </View>

                    <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                      <AdminIconButton
                        icon={Edit2}
                        variant="accent"
                        accessibilityLabel="Edit session"
                        onPress={() => { setSessionForm({ id: s.id, title: s.title }); setSessionModalOpen(true); }}
                      />
                      <AdminIconButton
                        icon={Trash2}
                        variant="danger"
                        accessibilityLabel="Delete session"
                        onPress={() => handleDeleteSession(s.id, s.title)}
                      />
                    </View>
                  </AdminCard>
                </Animated.View>
              ))}
            </View>
          )}
        </View>
      </ThemedScrollView>

      {/* Session Modal */}
      <Modal visible={sessionModalOpen} transparent animationType="fade">
        <AdminModalContainer onClose={() => setSessionModalOpen(false)}>
          <AdminModalTitle>{sessionForm.id ? "Edit Session" : "New Session"}</AdminModalTitle>
          <AdminFormField
            label="Session Title"
            value={sessionForm.title}
            onChangeText={(t) => setSessionForm((prev) => ({ ...prev, title: t }))}
            placeholder="e.g. Session A: Linear Speed"
            autoFocus
          />
          <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
            <AdminButton
              label="Cancel"
              variant="ghost"
              onPress={() => setSessionModalOpen(false)}
              style={{ flex: 1 }}
            />
            <AdminButton
              label="Save"
              variant="primary"
              onPress={handleSaveSession}
              disabled={!sessionForm.title.trim()}
              loading={sessionsHook.isBusy}
              style={{ flex: 1 }}
            />
          </View>
        </AdminModalContainer>
      </Modal>
    </AdminScreen>
  );
}
