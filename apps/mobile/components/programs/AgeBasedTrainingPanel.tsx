import React from "react";
import { View, Pressable } from "react-native";

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
    metadata?: {
      kind?: string | null;
      scheduleDay?: string | null;
      scheduleTime?: string | null;
    } | null;
    order: number;
  }>;
};

type Workspace = {
  tabs: string[];
  modules: Module[];
  others: OtherGroup[];
};

export function AgeBasedTrainingPanel({
  workspace,
  activeTab,
  onOpenModule,
}: {
  workspace: Workspace;
  activeTab: string;
  onOpenModule: (moduleId: number) => void;
}) {
  const { colors, isDark } = useAppTheme();
  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";

  if (activeTab === "Modules") {
    return (
      <View className="gap-4">
        {workspace.modules.map((module) => (
          <Pressable
            key={module.id}
            onPress={() => onOpenModule(module.id)}
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
                <Text className="mt-1 text-xs font-outfit" style={{ color: colors.textSecondary }}>
                  {module.sessions.length} session{module.sessions.length === 1 ? "" : "s"} in this module
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
          </Pressable>
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
          {group?.type === "inseason" &&
          (item.metadata?.kind === "inseason_schedule_entry" || item.metadata?.kind === "inseason_age_schedule") ? (
            <>
              <Text className="text-lg font-clash font-bold" style={{ color: colors.text }}>
                {item.title}
              </Text>
              {item.scheduleNote ? (
                <Text className="mt-2 text-sm font-outfit font-semibold" style={{ color: colors.accent }}>
                  {item.scheduleNote}
                </Text>
              ) : null}
              <Text className="mt-3 text-sm font-outfit leading-6" style={{ color: colors.textSecondary }}>
                {item.body === "Weekly in-season schedule." ? "Your coach sets this recurring weekly training schedule for your age." : item.body}
              </Text>
            </>
          ) : (
            <>
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
            </>
          )}
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
