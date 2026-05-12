import React from "react";
import { Alert, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";

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

  const MODULE_COLORS = [p.inputBg, p.inputBg, p.inputBg, p.inputBg] as const;

  if (activeTab === "Modules") {
    return (
      <View style={{ gap: 14 }}>
        {modules.map((module, idx) => {
          const cardBg = p.inputBg;
          return (
          <Pressable
            key={module.id}
            onPress={() => {
              if (module.locked) {
                Alert.alert("Module locked", lockedCopy(module));
                return;
              }
              onOpenModule(module.id);
            }}
            style={{
              borderRadius: 22,
              overflow: "hidden",
              backgroundColor: cardBg,
              opacity: module.locked ? 0.7 : 1,
            }}
          >
            <View style={{ height: 3, backgroundColor: p.accent, opacity: 0.6 }} />
            <View style={{ padding: 18, flexDirection: "row", alignItems: "center" }}>
              <View style={{
                width: 44, height: 44, borderRadius: 14,
                backgroundColor: p.accentSoft,
                alignItems: "center", justifyContent: "center",
                marginRight: 14,
              }}>
                <Text style={{ fontSize: 18, fontFamily: "Outfit-Bold", color: p.accent }}>
                  {module.order}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 17, fontFamily: "Outfit-Bold", color: p.textPrimary, letterSpacing: -0.2 }}
                  numberOfLines={1}
                >
                  {module.title}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <Text style={{ fontSize: 13, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
                    {module.totalDayLength} days
                  </Text>
                  <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: p.textMuted }} />
                  <Text style={{ fontSize: 13, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
                    {module.sessions.length} session{module.sessions.length === 1 ? "" : "s"}
                  </Text>
                </View>
                {module.locked ? (
                  <Text style={{ marginTop: 6, fontSize: 11, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
                    {lockedCopy(module)}
                  </Text>
                ) : null}
              </View>
              <View style={{ marginLeft: 12, alignItems: "center", gap: 6 }}>
                <View style={{
                  borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4,
                  backgroundColor: module.completed ? p.successSoft : module.locked ? p.divider : p.accentSoft,
                }}>
                  <Text style={{
                    fontSize: 10, fontFamily: "Outfit-Bold", textTransform: "uppercase", letterSpacing: 0.8,
                    color: module.completed ? p.success : module.locked ? p.textSecondary : p.accent,
                  }}>
                    {module.completed ? "Done" : module.locked ? "Locked" : "Active"}
                  </Text>
                </View>
                <View style={{
                  width: 32, height: 32, borderRadius: 10,
                  backgroundColor: p.accentSoft, alignItems: "center", justifyContent: "center",
                }}>
                  <ChevronRight size={16} color={p.textSecondary} />
                </View>
              </View>
            </View>
          </Pressable>
          );
        })}

        {!modules.length ? (
          <View style={{ borderRadius: 24, padding: 20, backgroundColor: p.cardWhite }}>
            <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
              No modules available for your age yet.
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  const group = others.find((item) => item.label === activeTab);
  return (
    <View style={{ gap: 14 }}>
      {(group?.items ?? []).map((item, idx) => {
        const cardBg = p.inputBg;
        return (
        <Pressable
          key={item.id}
          onPress={() => router.push(`/programs/training-other/${item.id}` as never)}
          style={{
            borderRadius: 22,
            overflow: "hidden",
            backgroundColor: cardBg,
          }}
        >
          <View style={{ height: 3, backgroundColor: p.accent, opacity: 0.5 }} />
          <View style={{ padding: 18 }}>
            <Text
              style={{ fontSize: 17, fontFamily: "Outfit-Bold", color: p.textPrimary, letterSpacing: -0.2 }}
            >
              {item.title}
            </Text>
            {item.scheduleNote ? (
              <Text
                style={{ marginTop: 8, fontSize: 13, fontFamily: "Outfit-SemiBold", color: p.accent }}
              >
                {item.scheduleNote}
              </Text>
            ) : null}
            <Text
              style={{ marginTop: 8, fontSize: 14, fontFamily: "Outfit-Regular", lineHeight: 22, color: p.textSecondary }}
            >
              {group?.type === "inseason" &&
              (item.metadata?.kind === "inseason_schedule_entry" ||
                item.metadata?.kind === "inseason_age_schedule") &&
              item.body === "Weekly in-season schedule."
                ? "Your coach sets this recurring weekly training schedule for your age."
                : item.body}
            </Text>
          </View>
        </Pressable>
        );
      })}
      {!group?.items.length ? (
        <View style={{ borderRadius: 24, padding: 20, backgroundColor: p.cardWhite }}>
          <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
            No content available for this section yet.
          </Text>
        </View>
      ) : null}
    </View>
  );
}
