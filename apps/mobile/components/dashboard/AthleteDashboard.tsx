import { Feather } from "@/components/ui/theme-icons";
import { useRefreshContext } from "@/context/RefreshContext";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";

export function AthleteDashboard() {
  const { isLoading } = useRefreshContext();

  return (
    <View className="gap-6">
      <Animated.View entering={FadeInDown.delay(200).duration(800).springify()}>
        {isLoading ? (
          <View className="bg-input p-6 rounded-[40px] h-60 justify-center border border-app shadow-sm" />
        ) : (
          <View className=" p-8 rounded-[40px] shadow-2xl relative overflow-hidden border border-white/20 min-h-[220px]">
            <View className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <View className="absolute -left-20 -bottom-20 w-48 h-48 bg-black/10 rounded-full blur-2xl" />

            <View className="flex-row items-center justify-between mb-6">
              <View className="bg-white/20 px-4 py-1.5 rounded-full border border-white/20 backdrop-blur-sm">
                <Text className="text-white font-bold font-outfit text-[10px] uppercase tracking-widest">
                  Current Mission
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
                Session #42 • Technical Skills
              </Text>
              <Text className="dark:text-white text-app font-clash text-4xl leading-[0.95] tracking-tight">
                Explosive{"\n"}Power
              </Text>
            </View>

            <View className="flex-row gap-2 mb-8">
              <MissionTag icon="clock" label="09:00" />
              <MissionTag icon="map-pin" label="Pitch 1" />
              <MissionTag icon="zap" label="PHP+" />
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              className="bg-white h-16 rounded-2xl items-center justify-center shadow-xl flex-row gap-2"
            >
              <Text className="text-accent font-bold font-outfit text-lg">
                Enter Mission
              </Text>
              <Feather name="arrow-right" size={20} className="text-accent" />
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* 📊 High-Performance Metrics */}
      <View>
        <View className="flex-row justify-between items-center mb-5 px-1">
          <Text className="text-xl font-bold font-clash text-app">
            Live Feed <Text className="text-accent">Stats</Text>
          </Text>
          <TouchableOpacity>
            <Text className="text-accent font-medium text-xs font-outfit">
              Detailed Analysis
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row gap-3">
          <MetricCard
            label="Win Rate"
            value="88%"
            trend="+5%"
            good={true}
            icon="activity"
          />
          <StatusTile
            label="Stamina"
            value="92"
            icon="heart"
            color="bg-rose-500"
          />
          <StatusTile
            label="Energy"
            value="100"
            icon="zap"
            color="bg-amber-400"
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
    <View className="bg-input p-5 rounded-[28px] border border-app shadow-sm flex-1 min-h-[140px] justify-between">
      <View className="flex-row justify-between items-start">
        <View className="bg-accent/10 p-2.5 rounded-xl">
          <Feather name={icon} size={18} className="text-accent" />
        </View>
        <View
          className={`px-2 py-0.5 rounded-lg ${good ? "bg-emerald-500/10" : "bg-rose-500/10"}`}
        >
          <Text
            className={`text-[10px] font-bold ${good ? "text-emerald-500" : "text-rose-500"}`}
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

function StatusTile({ label, value, icon, color }: any) {
  return (
    <View className="bg-input p-5 rounded-[28px] border border-app shadow-sm w-24 items-center justify-between">
      <View
        className={`${color} w-10 h-10 rounded-2xl items-center justify-center shadow-lg shadow-app/5`}
      >
        <Feather name={icon} size={20} color="white" />
      </View>
      <View className="items-center">
        <Text className="text-lg font-bold font-clash text-app">{value}%</Text>
        <Text className="text-muted text-[8px] font-outfit uppercase tracking-tighter">
          {label}
        </Text>
      </View>
    </View>
  );
}

function PremiumBadge({
  icon,
  label,
  rarity,
}: {
  icon: any;
  label: string;
  rarity: string;
}) {
  const rarityColors: any = {
    Common: "bg-slate-400",
    Rare: "bg-blue-500",
    Epic: "bg-purple-500",
    Legendary: "bg-amber-400",
  };

  return (
    <Animated.View
      entering={FadeInRight.delay(100).duration(800).springify()}
      className="items-center"
    >
      <View className="relative">
        <View
          className={`${rarityColors[rarity]} w-20 h-20 rounded-[28px] items-center justify-center shadow-xl shadow-app/10 mb-3 border-4 border-white`}
        >
          <Feather name={icon} size={32} color="white" />
        </View>
        <View className="absolute -top-1 -right-1 bg-white px-2 py-0.5 rounded-full shadow-sm border border-app/10">
          <Text className="text-[8px] font-bold text-app uppercase">
            {rarity}
          </Text>
        </View>
      </View>
      <Text className="text-app font-bold font-outfit text-xs">{label}</Text>
    </Animated.View>
  );
}
