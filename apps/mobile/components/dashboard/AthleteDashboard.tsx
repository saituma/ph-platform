import { Feather } from "@/components/ui/theme-icons";
import { useRefreshContext, usePullToRefresh } from "@/context/RefreshContext";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

export function AthleteDashboard() {
  const { isLoading, setIsLoading } = useRefreshContext();
  const { token } = useAppSelector((state) => state.user);
  const [athlete, setAthlete] = useState<any | null>(null);

  const loadAthlete = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await apiRequest<{ athlete: any | null }>("/onboarding", {
        token,
        suppressStatusCodes: [401],
      });
      setAthlete(data.athlete ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("401")) {
        console.warn("Failed to load athlete data", error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, token]);

  useEffect(() => {
    loadAthlete();
  }, [loadAthlete]);

  usePullToRefresh(loadAthlete);

  const extraResponses = athlete?.extraResponses ?? {};
  const level = typeof extraResponses === "object" && extraResponses !== null ? extraResponses.level : null;
  const injuriesCount = useMemo(() => {
    if (!athlete?.injuries) return 0;
    if (Array.isArray(athlete.injuries)) return athlete.injuries.length;
    if (typeof athlete.injuries === "string") return athlete.injuries.trim() ? 1 : 0;
    return 1;
  }, [athlete]);
  const programTier = athlete?.currentProgramTier ?? "Pending";

  return (
    <View className="gap-8">
      <View>
        {athlete?.isBirthday ? (
          <View className="mb-4 rounded-3xl border border-accent/30 bg-accent/10 p-4">
            <Text className="text-accent font-outfit text-sm uppercase tracking-[1.4px] mb-1">
              Celebration
            </Text>
            <Text className="text-app font-clash text-2xl">
              Happy Birthday{athlete?.name ? `, ${athlete.name}` : ""}!
            </Text>
            <Text className="text-sm font-outfit text-secondary mt-1">
              New age, new training content unlocked today.
            </Text>
          </View>
        ) : null}
        <View className="p-8 rounded-[40px] shadow-2xl relative overflow-hidden border border-white/20 min-h-[220px] bg-input">
          <View className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <View className="absolute -left-20 -bottom-20 w-48 h-48 bg-black/10 rounded-full blur-2xl" />

          {isLoading ? (
            <View className="h-44 justify-center">
              <View className="h-4 w-24 rounded-full bg-white/30 mb-4" />
              <View className="h-10 w-40 rounded-2xl bg-white/20 mb-2" />
              <View className="h-10 w-32 rounded-2xl bg-white/20" />
            </View>
          ) : (
            <>
              <View className="flex-row items-center justify-between mb-6">
                <View className="bg-white/20 px-4 py-1.5 rounded-full border border-white/20 backdrop-blur-sm">
                  <Text className="text-white font-bold font-outfit text-[10px] uppercase tracking-widest">
                    Profile Snapshot
                  </Text>
                </View>
                <View className="flex-row gap-1">
                  {[1, 2, 3].map((i) => (
                    <View
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${i === 1 ? "bg-white" : "bg-white/40"}`}
                    />
                  ))}
                </View>
              </View>

              <View className="mb-8">
                <Text className="dark:text-white/80 text-app font-outfit text-sm mb-1 font-medium">
                  {athlete?.team ? `${athlete.team}${level ? ` • ${level}` : ""}` : "Athlete Overview"}
                </Text>
                <Text className="dark:text-white text-app font-clash text-4xl leading-[0.95] tracking-tight">
                  {athlete?.name ?? "Your"}{"\n"}Progress
                </Text>
              </View>

              <View className="flex-row gap-2 mb-8">
                <MissionTag icon="calendar" label={`${athlete?.trainingPerWeek ?? 0} days/week`} />
                <MissionTag icon="user" label={programTier} />
                <MissionTag icon="activity" label={athlete?.age ? `${athlete.age} yrs` : "Age —"} />
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                className="bg-white h-16 rounded-2xl items-center justify-center shadow-xl flex-row gap-2"
              >
                <Text className="text-accent font-bold font-outfit text-lg">
                  View Profile
                </Text>
                <Feather name="arrow-right" size={20} className="text-accent" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* 📊 High-Performance Metrics */}
      <View>
        <View className="flex-row justify-between items-center mb-5 px-1">
          <View className="flex-row items-center gap-3">
            <View className="h-6 w-1.5 rounded-full bg-accent" />
            <Text className="text-xl font-bold font-clash text-app">
              Live Feed <Text className="text-accent">Stats</Text>
            </Text>
          </View>
          <TouchableOpacity>
            <Text className="text-accent font-medium text-xs font-outfit">
              Detailed Analysis
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row flex-wrap gap-3">
          <MetricCard
            label="Program Tier"
            value={programTier}
            trend={athlete?.currentProgramTier ? "Active" : "Pending"}
            good={Boolean(athlete?.currentProgramTier)}
            icon="zap"
          />
          <StatusTile
            label="Training Days"
            value={athlete?.trainingPerWeek ?? 0}
            icon="calendar"
            color="bg-success"
            suffix=""
          />
          <StatusTile
            label="Injuries"
            value={injuriesCount}
            icon="alert-circle"
            color="bg-warning"
            suffix=""
          />
          <StatusTile
            label="Level"
            value={level ?? "—"}
            icon="target"
            color="bg-danger"
            suffix=""
          />
        </View>
      </View>
    </View>
  );
}

function MissionTag({ icon, label }: { icon: any; label: string }) {
  return (
    <View className="bg-white/10 px-4 py-2.5 rounded-2xl border border-white/10 items-center flex-row gap-2">
      <Feather name={icon} size={14} color="white" />
      <Text className="text-white font-bold font-outfit text-xs">{label}</Text>
    </View>
  );
}

function MetricCard({ label, value, trend, good, icon }: any) {
  return (
    <View className="bg-input p-5 rounded-[28px] border border-app shadow-sm w-[48%] min-h-[140px] justify-between">
      <View className="flex-row justify-between items-start">
        <View className="bg-accent/10 p-2.5 rounded-xl">
          <Feather name={icon} size={18} className="text-accent" />
        </View>
        <View
          className={`px-2 py-0.5 rounded-lg ${good ? "bg-success-soft" : "bg-danger-soft"}`}
        >
          <Text
            className={`text-[10px] font-bold ${good ? "text-success" : "text-danger"}`}
          >
            {trend}
          </Text>
        </View>
      </View>
      <View>
        <Text className="text-2xl font-bold font-clash text-app">{value}</Text>
        <Text className="text-muted text-[10px] font-outfit uppercase tracking-widest mt-1">
          {label}
        </Text>
      </View>
    </View>
  );
}

function StatusTile({ label, value, icon, color, suffix = "%" }: any) {
  return (
    <View className="bg-input p-4 rounded-[24px] border border-app shadow-sm w-[48%] h-[96px] items-center justify-between">
      <View
        className={`${color} w-10 h-10 rounded-2xl items-center justify-center shadow-lg shadow-app/5`}
      >
        <Feather name={icon} size={20} color="white" />
      </View>
      <View className="items-center">
        <Text className="text-lg font-bold font-clash text-app">
          {value}
          {suffix}
        </Text>
        <Text className="text-muted text-[8px] font-outfit uppercase tracking-tighter">
          {label}
        </Text>
      </View>
    </View>
  );
}
