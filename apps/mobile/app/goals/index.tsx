import React, { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Flag } from "lucide-react-native";

import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppSelector } from "@/store/hooks";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useMyGoals } from "@/hooks/goals/useMyGoals";
import { GoalCard } from "@/components/tracking/GoalCard";

export default function GoalsListScreen() {
  const router = useRouter();
  const insets = useAppSafeAreaInsets();
  const p = useAdminPastel();
  const token = useAppSelector((s) => s.user.token);

  const { goals, isLoading } = useMyGoals(token);

  const activeGoals = useMemo(() => goals.filter((g) => !g.completed), [goals]);
  const completedGoals = useMemo(() => goals.filter((g) => g.completed), [goals]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg }} edges={["top", "left", "right"]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: insets.top ? 0 : 12, paddingBottom: 8 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ height: 40, width: 40, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: p.cardWhite }}
          accessibilityLabel="Go back"
          hitSlop={8}
        >
          <ArrowLeft size={20} color={p.accent} />
        </Pressable>
        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 22, color: p.textPrimary, letterSpacing: -0.5 }}>Goals</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48, gap: 20 }} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={{ gap: 10 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height={92} style={{ borderRadius: 22 }} />
            ))}
          </View>
        ) : goals.length === 0 ? (
          <View style={{ alignItems: "center", gap: 10, paddingTop: 60 }}>
            <Flag size={28} color={p.textMuted} />
            <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textMuted, textAlign: "center" }}>
              No goals assigned yet. Your coach will set one for you here.
            </Text>
          </View>
        ) : (
          <>
            {activeGoals.length > 0 && (
              <View style={{ gap: 8 }}>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, letterSpacing: 0.8, color: p.textMuted, textTransform: "uppercase", paddingHorizontal: 4 }}>
                  Active
                </Text>
                {activeGoals.map((goal, gi) => (
                  <Pressable key={goal.id} onPress={() => router.push(`/goals/${goal.id}` as any)}>
                    <GoalCard goal={goal} index={gi} />
                  </Pressable>
                ))}
              </View>
            )}

            {completedGoals.length > 0 && (
              <View style={{ gap: 8 }}>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, letterSpacing: 0.8, color: p.textMuted, textTransform: "uppercase", paddingHorizontal: 4 }}>
                  Completed
                </Text>
                {completedGoals.map((goal, gi) => (
                  <Pressable key={goal.id} onPress={() => router.push(`/goals/${goal.id}` as any)}>
                    <GoalCard goal={goal} index={gi} />
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
