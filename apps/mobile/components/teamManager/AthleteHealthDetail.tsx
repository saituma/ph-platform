import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSelector } from "@/store/hooks";
import { useNutritionDay } from "@/components/nutrition/useNutritionDay";
import { useSleepData } from "@/components/sleep/useSleepData";
import { useWellbeingData } from "@/hooks/useWellbeingData";

/**
 * Read-only health detail for a team manager viewing one of their athletes.
 * Reuses the existing data hooks with an explicit athleteUserId override (the manager
 * is authorized server-side only for athletes on a team they manage). No edit affordances.
 */
export function AthleteHealthDetail({ athleteUserId }: { athleteUserId: number }) {
  const { token, capabilities } = useAppSelector((s) => s.user);
  const showNutrition = Boolean(capabilities?.nutrition || capabilities?.nutritionReview);
  const showSleep = Boolean(capabilities?.sleep);
  const showWellbeing = Boolean(capabilities?.wellbeing);

  if (!showNutrition && !showSleep && !showWellbeing) return null;

  return (
    <View style={{ gap: 14 }}>
      {showNutrition ? <NutritionSection athleteUserId={athleteUserId} /> : null}
      {showSleep ? <SleepSection athleteUserId={athleteUserId} /> : null}
      {showWellbeing ? <WellbeingSection token={token} athleteUserId={athleteUserId} /> : null}
    </View>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  const p = useAdminPastel();
  return (
    <View style={{ borderRadius: 22, backgroundColor: p.cardWhite, padding: 18, gap: 12 }}>
      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 16, color: p.textPrimary }}>{title}</Text>
      {children}
    </View>
  );
}

function Empty({ label }: { label: string }) {
  const p = useAdminPastel();
  return <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textMuted }}>{label}</Text>;
}

function StatRow({ label, value }: { label: string; value: string }) {
  const p = useAdminPastel();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textSecondary, flex: 1 }} numberOfLines={1}>
        {label}
      </Text>
      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.textPrimary }}>{value}</Text>
    </View>
  );
}

function NutritionSection({ athleteUserId }: { athleteUserId: number }) {
  const p = useAdminPastel();
  const { data, loading } = useNutritionDay(undefined, athleteUserId);
  return (
    <SectionCard title="Nutrition · Today">
      {loading ? (
        <ActivityIndicator color={p.accent} />
      ) : data ? (
        <View style={{ gap: 10 }}>
          <StatRow label="Calories" value={`${data.eatenCalories} / ${data.targetCalories} kcal`} />
          {Object.values(data.meals).map((m) => (
            <StatRow
              key={m.label}
              label={m.label}
              value={m.items.length ? `${m.items.reduce((s, i) => s + i.calories, 0)} kcal` : "—"}
            />
          ))}
        </View>
      ) : (
        <Empty label="No nutrition logged." />
      )}
    </SectionCard>
  );
}

function SleepSection({ athleteUserId }: { athleteUserId: number }) {
  const p = useAdminPastel();
  const { logs, loading } = useSleepData("week", athleteUserId);
  return (
    <SectionCard title="Sleep · Last 7 days">
      {loading ? (
        <ActivityIndicator color={p.accent} />
      ) : logs.length ? (
        <View style={{ gap: 8 }}>
          {logs.slice(0, 7).map((l) => (
            <StatRow
              key={l.id}
              label={l.dateKey}
              value={`${(l.totalMinutes / 60).toFixed(1)}h${l.quality != null ? ` · Q${l.quality}` : ""}`}
            />
          ))}
        </View>
      ) : (
        <Empty label="No sleep logged." />
      )}
    </SectionCard>
  );
}

function WellbeingSection({ token, athleteUserId }: { token: string | null; athleteUserId: number }) {
  const p = useAdminPastel();
  const { logs, isLoading } = useWellbeingData(token, athleteUserId);
  return (
    <SectionCard title="Wellbeing · Recent">
      {isLoading ? (
        <ActivityIndicator color={p.accent} />
      ) : logs.length ? (
        <View style={{ gap: 8 }}>
          {logs.slice(0, 5).map((l) => (
            <StatRow
              key={l.id}
              label={l.dateKey}
              value={`Mood ${l.mood} · Energy ${l.energy} · Pain ${l.pain}`}
            />
          ))}
        </View>
      ) : (
        <Empty label="No wellbeing logged." />
      )}
    </SectionCard>
  );
}
