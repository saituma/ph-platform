import React, { useEffect, useState } from "react";
import { Alert, Modal, Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { Dumbbell, Plus, Trash2 } from "lucide-react-native";

import { Text } from "@/components/ScaledText";
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
  AdminModalSubtitle,
  AdminFormField,
  AdminChipSelect,
  useAdminPastel,
} from "@/components/admin/AdminUI";
import { useAppSelector } from "@/store/hooks";
import { useAdminProgramBuilder, type SessionItem } from "@/hooks/admin/useAdminProgramBuilder";
import type { AdminCardColor } from "@/constants/theme";

const SESSION_TYPES = ["program", "warmup", "cooldown", "mobility", "recovery", "stretching", "screening", "offseason", "inseason", "education", "nutrition"];

const SESSION_TYPE_OPTIONS = SESSION_TYPES.map((t) => ({ key: t, label: t }));

const ALTERNATING_COLORS: AdminCardColor[] = ["sage", "lavender", "peach", "mint", "pink", "yellow"];

export default function AdminModuleDetailScreen() {
  const p = useAdminPastel();
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
            title={moduleTitle}
            subtitle={`${programName} - ${sessions.length} session${sessions.length !== 1 ? "s" : ""}`}
            right={<AdminBackButton onPress={() => router.back()} />}
          />
        </Animated.View>

        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(120).duration(360).springify()}
          style={{ paddingHorizontal: 24, marginBottom: 16 }}
        >
          <AdminButton
            label="Add Session"
            icon={Plus}
            onPress={() => setModalOpen(true)}
          />
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
            style={{ paddingHorizontal: 24, gap: 12 }}
          >
            {sessions.map((session, idx) => {
              const cardColor = ALTERNATING_COLORS[idx % ALTERNATING_COLORS.length];

              return (
                <AdminCard
                  key={session.id}
                  color={cardColor}
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
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: p.accentSoft,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Outfit-ExtraBold",
                          fontSize: 15,
                          color: p.accent,
                        }}
                      >
                        {idx + 1}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: "Outfit-Bold",
                          fontSize: 15,
                          color: p.textPrimary,
                        }}
                        numberOfLines={1}
                      >
                        {session.title ?? `Session ${session.sessionNumber ?? idx + 1}`}
                      </Text>
                      <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
                        {session.type ? (
                          <AdminBadge color="mint">{session.type}</AdminBadge>
                        ) : null}
                        <AdminBadge color="peach">{session.exerciseCount ?? 0} exercises</AdminBadge>
                      </View>
                    </View>
                    <AdminIconButton
                      icon={Trash2}
                      variant="danger"
                      accessibilityLabel="Delete session"
                      onPress={() => handleDelete(session)}
                      disabled={isBusy}
                    />
                  </View>
                </AdminCard>
              );
            })}
          </Animated.View>
        )}
      </ThemedScrollView>

      <Modal visible={modalOpen} transparent animationType="fade">
        <AdminModalContainer onClose={() => setModalOpen(false)}>
          <AdminModalTitle>Add Session</AdminModalTitle>
          <AdminModalSubtitle>Create a new session in this module.</AdminModalSubtitle>

          <AdminFormField
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Upper Body Strength"
            autoFocus
          />

          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontFamily: "Outfit-Bold",
                fontSize: 12,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                color: p.textMuted,
                marginBottom: 8,
              }}
            >
              Type
            </Text>
            <AdminChipSelect
              options={SESSION_TYPE_OPTIONS}
              value={type}
              onChange={setType}
            />
          </View>

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
