import React, { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { BookOpen, ChevronLeft, Plus } from "lucide-react-native";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text, TextInput } from "@/components/ScaledText";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { AdminHeader, AdminScreen, AdminCard, AdminInput, AdminEmptyState, AdminLoadingState } from "@/components/admin/AdminUI";
import { useAppSelector } from "@/store/hooks";
import { useAdminProgramBuilder, type ProgramItem } from "@/hooks/admin/useAdminProgramBuilder";

export default function AdminProgramsScreen() {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
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
    return programs.filter((p) => p.name?.toLowerCase().includes(q));
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
            eyebrow="Operations"
            title="Programs"
            subtitle="Build and manage training programs"
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
          style={{ paddingHorizontal: 24, marginBottom: 16, gap: 10 }}
        >
          <TouchableOpacity
            onPress={() => { setName(""); setDescription(""); setEditProgram(null); setModalOpen(true); }}
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
              Create Program
            </Text>
          </TouchableOpacity>

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
            style={{ paddingHorizontal: 24, gap: 10 }}
          >
            {filtered.map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
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

      {/* Create Program Modal */}
      <Modal visible={modalOpen} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 24 }}
          onPress={() => { setModalOpen(false); setEditProgram(null); }}
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
              {editProgram ? "Edit Program" : "Create Program"}
            </Text>
            <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: colors.textSecondary, marginBottom: 20, lineHeight: 18 }}>
              {editProgram ? "Update the program name and description." : "A program is a training package — give it a name and optional description."}
            </Text>

            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: colors.textSecondary, marginBottom: 6 }}>
                Name
              </Text>
              <View style={{
                borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, height: 48, justifyContent: "center",
                backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)",
                borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
              }}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. 12-Week Strength"
                  placeholderTextColor={colors.placeholder}
                  style={{ fontFamily: "Outfit-Regular", fontSize: 15, color: colors.textPrimary }}
                  cursorColor={colors.accent}
                  autoFocus
                />
              </View>
            </View>

            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: colors.textSecondary, marginBottom: 6 }}>
                Description
              </Text>
              <View style={{
                borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, height: 48, justifyContent: "center",
                backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)",
                borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
              }}>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Optional description"
                  placeholderTextColor={colors.placeholder}
                  style={{ fontFamily: "Outfit-Regular", fontSize: 15, color: colors.textPrimary }}
                  cursorColor={colors.accent}
                />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => { setModalOpen(false); setEditProgram(null); }}
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
                onPress={handleSave}
                disabled={!name.trim() || isBusy}
                style={{
                  flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center",
                  backgroundColor: colors.accent, opacity: isBusy || !name.trim() ? 0.6 : 1,
                }}
              >
                {isBusy ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: colors.textInverse, letterSpacing: 0.5, textTransform: "uppercase" }}>
                    {editProgram ? "Save" : "Create"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </AdminScreen>
  );
}

function ProgramCard({ program, onPress, onLongPress }: { program: ProgramItem; onPress: () => void; onLongPress?: () => void }) {
  const { colors, isDark } = useAppTheme();

  return (
    <Pressable accessibilityRole="button" onPress={onPress} onLongPress={onLongPress} delayLongPress={400} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      {({ pressed }) => (
        <AdminCard pressed={pressed}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.04)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BookOpen size={20} color={colors.accent} strokeWidth={2.1} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontFamily: "Satoshi-Bold", fontSize: 16, color: colors.textPrimary }}
                numberOfLines={1}
              >
                {program.name}
              </Text>
              {program.description ? (
                <Text
                  style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: colors.textSecondary, marginTop: 2 }}
                  numberOfLines={1}
                >
                  {program.description}
                </Text>
              ) : null}
            </View>
            <ChevronLeft
              size={17}
              color={colors.textSecondary}
              strokeWidth={2.1}
              style={{ transform: [{ scaleX: -1 }] }}
            />
          </View>
        </AdminCard>
      )}
    </Pressable>
  );
}
