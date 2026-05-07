import React, { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { BookOpen, Plus, ChevronRight } from "lucide-react-native";

import { Text } from "@/components/ScaledText";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import {
  AdminScreen,
  AdminHeader,
  AdminCard,
  AdminButton,
  AdminInput,
  AdminEmptyState,
  AdminLoadingState,
  AdminModalContainer,
  AdminModalTitle,
  AdminModalSubtitle,
  AdminFormField,
  useAdminPastel,
} from "@/components/admin/AdminUI";
import { useAppSelector } from "@/store/hooks";
import { useAdminProgramBuilder, type ProgramItem } from "@/hooks/admin/useAdminProgramBuilder";
import type { AdminCardColor } from "@/constants/theme";

const CARD_COLORS: AdminCardColor[] = ["sage", "peach", "lavender", "mint", "pink"];

export default function AdminProgramsScreen() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const p = useAdminPastel();
  const token = useAppSelector((s) => s.user.token);
  const bootstrapReady = useAppSelector((s) => s.app.bootstrapReady);
  const canLoad = Boolean(token && bootstrapReady);

  const { programs, loading, isBusy, loadPrograms, createProgram, updateProgram, deleteProgram } = useAdminProgramBuilder(token, canLoad);

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editProgram, setEditProgram] = useState<ProgramItem | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (canLoad) loadPrograms();
  }, [canLoad, loadPrograms]);

  const filtered = useMemo(() => {
    if (!search.trim()) return programs;
    const q = search.toLowerCase();
    return programs.filter((prog) => prog.name?.toLowerCase().includes(q));
  }, [programs, search]);

  const handleSave = async () => {
    if (!name.trim()) return;
    if (editProgram) {
      await updateProgram(editProgram.id, { name: name.trim(), description: description.trim() || null });
    } else {
      await createProgram({ name: name.trim(), description: description.trim() || undefined });
    }
    setName("");
    setDescription("");
    setEditProgram(null);
    setModalOpen(false);
  };

  const handleLongPress = (program: ProgramItem) => {
    Alert.alert(program.name, "What would you like to do?", [
      {
        text: "Edit",
        onPress: () => {
          setEditProgram(program);
          setName(program.name);
          setDescription(program.description ?? "");
          setModalOpen(true);
        },
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "Delete Program",
            `Delete "${program.name}"? This will remove all modules, sessions, exercises, and assignments.`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => deleteProgram(program.id),
              },
            ],
          );
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <AdminScreen>
      <ThemedScrollView
        showsVerticalScrollIndicator={false}
        onRefresh={() => loadPrograms(true)}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(60).duration(360).springify()}
          style={{ marginBottom: 18 }}
        >
          <AdminHeader
            title="Programs"
            subtitle="Build and manage training programs"
          />
        </Animated.View>

        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(120).duration(360).springify()}
          style={{ paddingHorizontal: 24, marginBottom: 16, gap: 12 }}
        >
          <AdminButton
            label="Create Program"
            icon={Plus}
            onPress={() => { setName(""); setDescription(""); setEditProgram(null); setModalOpen(true); }}
          />

          <AdminInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search programs..."
            onClear={() => setSearch("")}
          />
        </Animated.View>

        {loading ? (
          <AdminLoadingState label="Loading programs" />
        ) : filtered.length === 0 ? (
          <AdminEmptyState
            icon={BookOpen}
            title="No programs"
            description={search.trim() ? "No programs match your search." : "Tap Create Program to get started."}
          />
        ) : (
          <Animated.View
            entering={reduceMotion ? undefined : FadeInDown.delay(180).duration(360).springify()}
            style={{ paddingHorizontal: 24, gap: 12 }}
          >
            {filtered.map((program, index) => (
              <ProgramCard
                key={program.id}
                program={program}
                color={CARD_COLORS[index % CARD_COLORS.length]}
                onPress={() =>
                  router.push({
                    pathname: "/admin/ops/programs/[programId]",
                    params: { programId: String(program.id), programName: program.name },
                  } as any)
                }
                onLongPress={() => handleLongPress(program)}
              />
            ))}
          </Animated.View>
        )}
      </ThemedScrollView>

      {/* Create/Edit Program Modal */}
      <Modal visible={modalOpen} transparent animationType="fade">
          <AdminModalContainer onClose={() => { setModalOpen(false); setEditProgram(null); }}>
              <AdminModalTitle>
                {editProgram ? "Edit Program" : "Create Program"}
              </AdminModalTitle>
              <AdminModalSubtitle>
                {editProgram
                  ? "Update the program name and description."
                  : "A program is a training package — give it a name and optional description."}
              </AdminModalSubtitle>

              <AdminFormField
                label="Name"
                value={name}
                onChangeText={setName}
                placeholder="e.g. 12-Week Strength"
                autoFocus
              />

              <AdminFormField
                label="Description"
                value={description}
                onChangeText={setDescription}
                placeholder="Optional description"
              />

              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <AdminButton
                    label="Cancel"
                    variant="secondary"
                    onPress={() => { setModalOpen(false); setEditProgram(null); }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AdminButton
                    label={editProgram ? "Save" : "Create"}
                    variant="primary"
                    onPress={handleSave}
                    disabled={!name.trim() || isBusy}
                    loading={isBusy}
                  />
                </View>
              </View>
            </AdminModalContainer>
      </Modal>
    </AdminScreen>
  );
}

function ProgramCard({
  program,
  color,
  onPress,
  onLongPress,
}: {
  program: ProgramItem;
  color: AdminCardColor;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const p = useAdminPastel();

  return (
    <AdminCard color={color} onPress={onPress} onLongPress={onLongPress}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "rgba(255,255,255,0.5)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <BookOpen size={20} color={p.accent} strokeWidth={2.1} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{ fontFamily: "Outfit-Bold", fontSize: 16, color: p.textPrimary }}
            numberOfLines={1}
          >
            {program.name}
          </Text>
          {program.description ? (
            <Text
              style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textSecondary, marginTop: 2 }}
              numberOfLines={1}
            >
              {program.description}
            </Text>
          ) : null}
        </View>
        <ChevronRight
          size={18}
          color={p.textSecondary}
          strokeWidth={2}
        />
      </View>
    </AdminCard>
  );
}
