import React from "react";
import { Feather } from "@expo/vector-icons";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";

type SessionItem = {
  id: number;
  blockType: string;
  title: string;
  body: string;
  order: number;
  metadata?: {
    sets?: number | null;
    reps?: number | null;
    duration?: number | null;
    restSeconds?: number | null;
  } | null;
};

type ModuleSession = {
  id: number;
  title: string;
  dayLength: number;
  order: number;
  completed: boolean;
  locked: boolean;
  items: SessionItem[];
};

type Module = {
  id: number;
  title: string;
  order: number;
  totalDayLength: number;
  completed: boolean;
  locked: boolean;
  sessions: ModuleSession[];
};

type OtherGroup = {
  type: string;
  label: string;
  items: Array<{
    id: number;
    title: string;
    body: string;
    scheduleNote?: string | null;
    order: number;
  }>;
};

type Workspace = {
  tabs: string[];
  modules: Module[];
  others: OtherGroup[];
};

const BLOCK_LABELS: Record<string, string> = {
  warmup: "Warmup",
  main: "Main session",
  cooldown: "Cool down",
};

export function AgeBasedTrainingPanel({
  workspace,
  activeTab,
  onFinishSession,
}: {
  workspace: Workspace;
  activeTab: string;
  onFinishSession: (sessionId: number) => void;
}) {
  const { colors, isDark } = useAppTheme();
  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";

  if (activeTab === "Modules") {
    return (
      <View className="gap-4">
        {workspace.modules.map((module) => (
          <View
            key={module.id}
            className="rounded-[28px] border px-5 py-5"
            style={{ backgroundColor: colors.card, borderColor: borderSoft, ...(isDark ? Shadows.none : Shadows.sm) }}
          >
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-lg font-clash font-bold" style={{ color: colors.text }}>
                  Module {module.order}: {module.title}
                </Text>
                <Text className="mt-1 text-sm font-outfit" style={{ color: colors.textSecondary }}>
                  {module.totalDayLength} planned days
                </Text>
              </View>
              <View
                className="rounded-full px-3 py-1.5"
                style={{ backgroundColor: module.completed ? "rgba(34,197,94,0.14)" : module.locked ? "rgba(148,163,184,0.14)" : "rgba(34,197,94,0.10)" }}
              >
                <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1px]" style={{ color: module.completed ? "#16A34A" : module.locked ? colors.textSecondary : colors.accent }}>
                  {module.completed ? "Completed" : module.locked ? "Locked" : "Active"}
                </Text>
              </View>
            </View>

            <View className="mt-4 gap-3">
              {module.sessions.map((session) => (
                <View
                  key={session.id}
                  className="rounded-[22px] border px-4 py-4"
                  style={{
                    backgroundColor: session.locked ? (isDark ? "rgba(255,255,255,0.03)" : "#F8FAFC") : colors.background,
                    borderColor: session.completed ? "rgba(34,197,94,0.25)" : borderSoft,
                    opacity: session.locked ? 0.7 : 1,
                  }}
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-base font-clash font-bold" style={{ color: colors.text }}>
                        {session.order}. {session.title}
                      </Text>
                      <Text className="mt-1 text-xs font-outfit" style={{ color: colors.textSecondary }}>
                        {session.dayLength} day target
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                      {session.completed ? <Feather name="check-circle" size={18} color="#16A34A" /> : null}
                      {session.locked ? <Feather name="lock" size={16} color={colors.textSecondary} /> : null}
                    </View>
                  </View>

                  <View className="mt-4 gap-3">
                    {(["warmup", "main", "cooldown"] as const).map((blockType) => {
                      const blockItems = session.items.filter((item) => item.blockType === blockType);
                      return (
                        <View key={`${session.id}-${blockType}`}>
                          <Text className="text-[11px] font-outfit font-bold uppercase tracking-[1px]" style={{ color: colors.accent }}>
                            {BLOCK_LABELS[blockType]}
                          </Text>
                          <View className="mt-2 gap-2">
                            {blockItems.map((item) => (
                              <View
                                key={item.id}
                                className="rounded-2xl px-3 py-3"
                                style={{ backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F8FAFC" }}
                              >
                                <Text className="text-sm font-outfit font-semibold" style={{ color: colors.text }}>
                                  {item.order}. {item.title}
                                </Text>
                                <Text className="mt-1 text-xs font-outfit" style={{ color: colors.textSecondary }}>
                                  {item.body}
                                </Text>
                                {(item.metadata?.sets != null || item.metadata?.reps != null || item.metadata?.duration != null) ? (
                                  <View className="mt-2 flex-row flex-wrap gap-2">
                                    {item.metadata?.sets != null ? (
                                      <Text className="text-[11px] font-outfit" style={{ color: colors.textSecondary }}>
                                        {item.metadata.sets} sets
                                      </Text>
                                    ) : null}
                                    {item.metadata?.reps != null ? (
                                      <Text className="text-[11px] font-outfit" style={{ color: colors.textSecondary }}>
                                        {item.metadata.reps} reps
                                      </Text>
                                    ) : null}
                                    {item.metadata?.duration != null ? (
                                      <Text className="text-[11px] font-outfit" style={{ color: colors.textSecondary }}>
                                        {item.metadata.duration}s
                                      </Text>
                                    ) : null}
                                  </View>
                                ) : null}
                              </View>
                            ))}
                            {!blockItems.length ? (
                              <Text className="text-xs font-outfit" style={{ color: colors.textSecondary }}>
                                No items added yet.
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  {!session.locked && !session.completed ? (
                    <Pressable
                      onPress={() => onFinishSession(session.id)}
                      className="mt-4 rounded-full py-3 items-center justify-center"
                      style={{ backgroundColor: colors.accent }}
                    >
                      <Text className="text-[12px] font-outfit font-bold uppercase tracking-[1.2px] text-white">
                        Finished
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ))}

        {!workspace.modules.length ? (
          <View className="rounded-[24px] px-5 py-5" style={{ backgroundColor: colors.card }}>
            <Text className="text-sm font-outfit" style={{ color: colors.textSecondary }}>
              No modules available for your age yet.
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  const group = workspace.others.find((item) => item.label === activeTab);
  return (
    <View className="gap-4">
      {(group?.items ?? []).map((item) => (
        <View
          key={item.id}
          className="rounded-[28px] border px-5 py-5"
          style={{ backgroundColor: colors.card, borderColor: borderSoft, ...(isDark ? Shadows.none : Shadows.sm) }}
        >
          <Text className="text-lg font-clash font-bold" style={{ color: colors.text }}>
            {item.title}
          </Text>
          {item.scheduleNote ? (
            <Text className="mt-2 text-xs font-outfit font-semibold" style={{ color: colors.accent }}>
              {item.scheduleNote}
            </Text>
          ) : null}
          <Text className="mt-3 text-sm font-outfit leading-6" style={{ color: colors.textSecondary }}>
            {item.body}
          </Text>
        </View>
      ))}
      {!group?.items.length ? (
        <View className="rounded-[24px] px-5 py-5" style={{ backgroundColor: colors.card }}>
          <Text className="text-sm font-outfit" style={{ color: colors.textSecondary }}>
            No content available for this section yet.
          </Text>
        </View>
      ) : null}
    </View>
  );
}
