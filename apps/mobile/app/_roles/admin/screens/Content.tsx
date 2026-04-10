import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { useAppSelector } from "@/store/hooks";
import React from "react";
import { Modal, Platform, View, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import {
  useAdminContentController,
  type ExerciseItem,
  type ProgramTemplate,
} from "@/hooks/admin/controllers/useAdminContentController";
import { ContentListItem } from "@/components/admin/content/ContentListItem";
import { ContentJsonEditor } from "@/components/admin/content/ContentJsonEditor";

export default function AdminContentScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const token = useAppSelector((state) => state.user.token);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);

  const {
    programs,
    exercises,
    isLoading,
    error,
    load,
    detail,
  } = useAdminContentController(token, bootstrapReady);

  const closeModal = () => {
    detail.setProgramId(null);
    detail.setExerciseId(null);
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ThemedScrollView onRefresh={() => load(true)}>
        <View className="pt-6 mb-4">
          <View className="flex-row items-center gap-3 overflow-hidden">
            <View className="h-6 w-1.5 rounded-full bg-accent" />
            <View className="flex-1">
              <Text className="text-4xl font-telma-bold text-app tracking-tight" numberOfLines={1}>
                Content
              </Text>
              <Text className="text-[12px] font-outfit text-secondary" numberOfLines={1}>
                Programs & Exercises
              </Text>
            </View>
          </View>
        </View>

        <View
          className="rounded-[28px] border p-5"
          style={{
            backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
            ...(isDark ? Shadows.none : Shadows.md),
          }}
        >
          {isLoading ? (
            <View className="gap-2">
              <Skeleton width="92%" height={14} />
              <Skeleton width="80%" height={14} />
              <Skeleton width="86%" height={14} />
            </View>
          ) : error ? (
            <Text selectable className="text-sm font-outfit text-red-400">{error}</Text>
          ) : (
            <View className="gap-5">
              <View className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-clash font-bold text-app">Programs</Text>
                  <Text className="text-[12px] font-outfit text-secondary">{programs.length}</Text>
                </View>
                {programs.length === 0 ? (
                  <Text className="text-sm font-outfit text-secondary">No programs.</Text>
                ) : (
                  <View className="gap-3">
                    {programs.map((p: ProgramTemplate) => (
                      <ContentListItem
                        key={String(p.id)}
                        item={p}
                        type="program"
                        isDark={isDark}
                        onPress={() => detail.setProgramId(p.id)}
                      />
                    ))}
                  </View>
                )}
              </View>

              <View className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-clash font-bold text-app">Exercises</Text>
                  <Text className="text-[12px] font-outfit text-secondary">{exercises.length}</Text>
                </View>
                {exercises.length === 0 ? (
                  <Text className="text-sm font-outfit text-secondary">No exercises.</Text>
                ) : (
                  <View className="gap-3">
                    {exercises.slice(0, 50).map((e: ExerciseItem) => (
                      <ContentListItem
                        key={String(e.id)}
                        item={e}
                        type="exercise"
                        isDark={isDark}
                        onPress={() => detail.setExerciseId(e.id)}
                      />
                    ))}
                  </View>
                )}
                {exercises.length > 50 && (
                  <Text className="text-[11px] font-outfit text-secondary">Showing first 50 items.</Text>
                )}
              </View>
            </View>
          )}
        </View>

        <Modal
          visible={detail.programId != null || detail.exerciseId != null}
          animationType="slide"
          presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
          onRequestClose={closeModal}
        >
          <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: isDark ? colors.background : "#FFFFFF" }}>
            <ThemedScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 + insets.bottom }}>
              <View className="pt-4 mb-4 flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-2xl font-clash font-bold text-app" numberOfLines={1}>
                    {detail.selectedProgram ? "Edit Program" : "Edit Exercise"}
                  </Text>
                  <Text className="text-[12px] font-outfit text-secondary">
                    ID: {detail.programId ?? detail.exerciseId}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={closeModal}
                  className="h-10 w-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)" }}
                >
                  <Feather name="x" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ContentJsonEditor
                patchJson={detail.patchJson}
                setPatchJson={detail.setPatchJson}
                onSave={detail.savePatch}
                onDelete={detail.selectedExercise ? detail.deleteExercise : undefined}
                isBusy={detail.isBusy}
                error={detail.error}
                colors={colors}
                isDark={isDark}
              />
            </ThemedScrollView>
          </View>
        </Modal>
      </ThemedScrollView>
    </View>
  );
}
