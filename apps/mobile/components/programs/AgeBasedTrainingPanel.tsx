import React from "react";
import { Alert, Pressable, View } from "react-native";
import { useRouter } from "expo-router";

import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";

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
  lockedReason?: "tier" | "sequence" | null;
  unlockTiers?: Array<{ tier: string; label: string }>;
  items: SessionItem[];
};

type Module = {
  id: number;
  title: string;
  order: number;
  totalDayLength: number;
  completed: boolean;
  locked: boolean;
  lockedReason?: "tier" | "sequence" | null;
  unlockTiers?: Array<{ tier: string; label: string }>;
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
    videoUrl?: string | null;
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
  workspace: Workspace | null;
  activeTab: string;
  onOpenModule: (moduleId: number) => void;
}) {
  const router = useRouter();
  const p = useAdminPastel();
  const modules = workspace?.modules ?? [];
  const others = workspace?.others ?? [];

  const formatUnlockTiers = (
    tiers?: Array<{ tier: string; label: string }>,
  ) => {
    const labels = (tiers ?? [])
      .map((t) => String(t?.label ?? "").trim())
      .filter(Boolean);
    return labels.length ? labels.join(", ") : null;
  };

  const lockedCopy = (module: Module) => {
    if (module.lockedReason === "tier") {
      const available = formatUnlockTiers(module.unlockTiers);
      return available
        ? `Not available with your current access. Unlocks with: ${available}.`
        : "Not available with your current access.";
    }
    return "Locked. Complete the previous sessions/modules to unlock this module.";
  };

  if (activeTab === "Modules") {
    return (
      <View className="gap-4">
        {modules.map((module) => (
          <Pressable
            key={module.id}
            onPress={() => {
              if (module.locked) {
                Alert.alert("Module locked", lockedCopy(module));
                return;
              }
              onOpenModule(module.id);
            }}
            className="rounded-[28px] border px-5 py-5"
            style={{
              backgroundColor: p.cardWhite,
              borderColor: p.divider,
              opacity: module.locked ? 0.7 : 1,
            }}
          >
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text
                  className="text-lg font-clash font-bold"
                  style={{ color: p.textPrimary }}
                >
                  Module {module.order}: {module.title}
                </Text>
                <Text
                  className="mt-1 text-sm font-outfit"
                  style={{ color: p.textSecondary }}
                >
                  {module.totalDayLength} planned days
                </Text>
                <Text
                  className="mt-1 text-xs font-outfit"
                  style={{ color: p.textSecondary }}
                >
                  {module.sessions.length} session
                  {module.sessions.length === 1 ? "" : "s"} in this module
                </Text>

                {module.locked ? (
                  <Text
                    className="mt-2 text-xs font-outfit"
                    style={{ color: p.textSecondary }}
                  >
                    {lockedCopy(module)}
                  </Text>
                ) : null}
              </View>
              <View
                className="rounded-full px-3 py-1.5"
                style={{
                  backgroundColor: module.completed
                    ? p.successSoft
                    : module.locked
                      ? p.divider
                      : p.successSoft,
                }}
              >
                <Text
                  className="text-[10px] font-outfit font-bold uppercase tracking-[1px]"
                  style={{
                    color: module.completed
                      ? p.success
                      : module.locked
                        ? p.textSecondary
                        : p.accent,
                  }}
                >
                  {module.completed
                    ? "Completed"
                    : module.locked
                      ? "Locked"
                      : "Active"}
                </Text>
              </View>
            </View>
          </Pressable>
        ))}

        {!modules.length ? (
          <View
            className="rounded-[24px] px-5 py-5"
            style={{ backgroundColor: p.cardWhite }}
          >
            <Text
              className="text-sm font-outfit"
              style={{ color: p.textSecondary }}
            >
              No modules available for your age yet.
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  const group = others.find((item) => item.label === activeTab);
  return (
    <View className="gap-4">
      {(group?.items ?? []).map((item) => (
        <Pressable
          key={item.id}
          onPress={() => router.push(`/programs/training-other/${item.id}` as never)}
          className="rounded-[28px] border px-5 py-5"
          style={{
            backgroundColor: p.cardWhite,
            borderColor: p.divider,
          }}
        >
          {group?.type === "inseason" &&
          (item.metadata?.kind === "inseason_schedule_entry" ||
            item.metadata?.kind === "inseason_age_schedule") ? (
            <>
              <Text
                className="text-lg font-clash font-bold"
                style={{ color: p.textPrimary }}
              >
                {item.title}
              </Text>
              {item.scheduleNote ? (
                <Text
                  className="mt-2 text-sm font-outfit font-semibold"
                  style={{ color: p.accent }}
                >
                  {item.scheduleNote}
                </Text>
              ) : null}
              <Text
                className="mt-3 text-sm font-outfit leading-6"
                style={{ color: p.textSecondary }}
              >
                {item.body === "Weekly in-season schedule."
                  ? "Your coach sets this recurring weekly training schedule for your age."
                  : item.body}
              </Text>
            </>
          ) : (
            <>
              <Text
                className="text-lg font-clash font-bold"
                style={{ color: p.textPrimary }}
              >
                {item.title}
              </Text>
              {item.scheduleNote ? (
                <Text
                  className="mt-2 text-xs font-outfit font-semibold"
                  style={{ color: p.accent }}
                >
                  {item.scheduleNote}
                </Text>
              ) : null}
              <Text
                className="mt-3 text-sm font-outfit leading-6"
                style={{ color: p.textSecondary }}
              >
                {item.body}
              </Text>
            </>
          )}
        </Pressable>
      ))}
      {!group?.items.length ? (
        <View
          className="rounded-[24px] px-5 py-5"
          style={{ backgroundColor: p.cardWhite }}
        >
          <Text
            className="text-sm font-outfit"
            style={{ color: p.textSecondary }}
          >
            No content available for this section yet.
          </Text>
        </View>
      ) : null}
    </View>
  );
}
