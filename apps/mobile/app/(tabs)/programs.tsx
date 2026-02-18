import { ProgramTier } from "@/components/ProgramCard";
import { ProgramDetailPanel } from "@/components/programs/ProgramDetailPanel";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { normalizeProgramTier } from "@/lib/planAccess";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiRequest } from "@/lib/api";
import {
  setLatestSubscriptionRequest,
  setProgramTier,
} from "@/store/slices/userSlice";
import { Text } from "@/components/ScaledText";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { AgeGate } from "@/components/AgeGate";
import { Ionicons } from "@expo/vector-icons"; // ← add if not already installed

export default function ProgramsScreen() {
  const dispatch = useAppDispatch();
  const { width } = useWindowDimensions();
  const {
    token,
    programTier,
  } = useAppSelector((state) => state.user);
  const { isSectionHidden } = useAgeExperience();

  const [selectedTierId, setSelectedTierId] = useState<"php" | "plus" | "premium">("php");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const tiers = useMemo<ProgramTier[]>(
    () => [
      {
        id: "php",
        name: "PHP Program",
        description: "Weekly structured training for developing athletes.",
        features: [
          "Age-appropriate training plan",
          "Weekly session guidance",
          "Warm-up & cooldown included",
          "Coach notes & video cues",
        ],
        color: "bg-[#2F8F57]",
        icon: "activity",
        popular: false,
      },
      {
        id: "plus",
        name: "PHP Plus",
        description: "Enhanced support with nutrition and off-season guidance.",
        features: [
          "Everything in PHP Program",
          "Parent education & nutrition guidance",
          "Stretching & mobility routines",
          "Off-season program access",
        ],
        color: "bg-[#2B7E4F]",
        icon: "layers",
        popular: true, // ← Most Popular
      },
      {
        id: "premium",
        name: "PHP Premium",
        description: "Fully personalized 1:1 coaching experience.",
        features: [
          "Personalized programming & adjustments",
          "Priority coach messaging",
          "Video analysis & detailed feedback",
          "1:1 role model meetings",
        ],
        color: "bg-[#256B44]",
        icon: "star",
        highlight: "Limited spots",
        popular: false,
      },
    ],
    [],
  );

  useEffect(() => {
    if (programTier) {
      const normalized = normalizeProgramTier(programTier);
      if (normalized === "PHP_Plus") setSelectedTierId("plus");
      if (normalized === "PHP_Premium") setSelectedTierId("premium");
    }
  }, [programTier]);

  if (isSectionHidden("programs")) {
    return (
      <AgeGate
        title="Programs locked"
        message="Programs are restricted for this age."
      />
    );
  }

  const refreshBillingStatus = useCallback(async () => {
    if (!token) return;
    try {
      const status = await apiRequest<{
        currentProgramTier?: string | null;
        latestRequest?: {
          status?: string | null;
          paymentStatus?: string | null;
          planTier?: string | null;
          createdAt?: string | null;
        } | null;
      }>("/billing/status", {
        token,
        suppressStatusCodes: [401, 403, 404],
      });
      const nextRequestStatus = status?.latestRequest?.status ?? null;
      const nextTier =
        status?.currentProgramTier ??
        (nextRequestStatus === "approved" ? status?.latestRequest?.planTier ?? null : null);
      dispatch(setProgramTier(nextTier ?? null));
      dispatch(setLatestSubscriptionRequest(status?.latestRequest ?? null));
    } catch {
      // no-op
    }
  }, [dispatch, token]);

  useEffect(() => {
    if (!token) return;
    refreshBillingStatus();
  }, [refreshBillingStatus, token]);

  // ... (handleApply and refreshBillingStatus stay exactly the same)

  const isWide = width >= 768;

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      {/* Mobile Sidebar Overlay */}
      {!isWide && isSidebarOpen && (
        <View className="absolute inset-0 z-50">
          <Pressable
            onPress={() => setIsSidebarOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <View className="absolute left-0 top-0 bottom-0 w-72 bg-app border-r border-gray-100 dark:border-gray-800 p-5 pt-12">
            <Text className="text-xs font-outfit uppercase tracking-[2px] text-secondary mb-3">
              Select Program
            </Text>
            <View className="gap-3">
              {tiers.map((tier) => {
                const isSelected = tier.id === selectedTierId;
                return (
                  <Pressable
                    key={tier.id}
                    onPress={() => {
                      setSelectedTierId(tier.id as "php" | "plus" | "premium");
                      setIsSidebarOpen(false);
                    }}
                    className={`rounded-2xl border px-4 py-3 ${
                      isSelected
                        ? "bg-[#2F8F57]/10 border-[#2F8F57]/30"
                        : "bg-input border-gray-100 dark:border-gray-800"
                    }`}
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className={`h-9 w-9 rounded-xl items-center justify-center ${
                          isSelected ? "bg-[#2F8F57]" : "bg-[#2F8F57]/20"
                        }`}
                      >
                        <Ionicons
                          name={tier.icon as any}
                          size={18}
                          color={isSelected ? "white" : "#2F8F57"}
                        />
                      </View>
                      <View className="flex-1">
                        <Text
                          className={`font-clash text-[15px] ${
                            isSelected ? "text-[#164A2C]" : "text-app"
                          }`}
                          numberOfLines={1}
                        >
                          {tier.name}
                        </Text>
                        <Text className="text-xs font-outfit text-secondary" numberOfLines={1}>
                          {tier.id === "premium" ? "1:1 coaching" : tier.description}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      )}

      <View className="px-6 pt-6 pb-4 flex-row items-center justify-between">
        {!isWide ? (
          <Pressable
            onPress={() => setIsSidebarOpen(true)}
            className="h-10 w-10 rounded-2xl bg-input border border-gray-100 dark:border-gray-800 items-center justify-center"
          >
            <Ionicons name="menu" size={20} color="#2F8F57" />
          </Pressable>
        ) : (
          <View className="w-10" />
        )}
        <Text className="text-2xl font-clash text-app">Programs</Text>
        <View className="w-10" />
      </View>

      <View className={isWide ? "flex-row gap-6 px-6 flex-1" : "flex-1"}>
          {/* Sidebar */}
          {isWide ? (
            <View className="w-44">
              <Text className="text-xs font-outfit uppercase tracking-[2px] text-secondary mb-3">
                Select Program
              </Text>
              <View className="gap-3">
                {tiers.map((tier) => {
                  const isSelected = tier.id === selectedTierId;
                  return (
                    <Pressable
                      key={tier.id}
                      onPress={() => setSelectedTierId(tier.id as "php" | "plus" | "premium")}
                      className={`rounded-2xl border px-4 py-3 ${
                        isSelected
                          ? "bg-[#2F8F57]/10 border-[#2F8F57]/30"
                          : "bg-input border-gray-100 dark:border-gray-800"
                      }`}
                    >
                      <View className="flex-row items-center gap-3">
                        <View
                          className={`h-9 w-9 rounded-xl items-center justify-center ${
                            isSelected ? "bg-[#2F8F57]" : "bg-[#2F8F57]/20"
                          }`}
                        >
                          <Ionicons
                            name={tier.icon as any}
                            size={18}
                            color={isSelected ? "white" : "#2F8F57"}
                          />
                        </View>
                        <View className="flex-1">
                          <Text
                            className={`font-clash text-[15px] ${
                              isSelected ? "text-[#164A2C]" : "text-app"
                            }`}
                            numberOfLines={1}
                          >
                            {tier.name}
                          </Text>
                          <Text className="text-xs font-outfit text-secondary" numberOfLines={1}>
                            {tier.id === "premium" ? "1:1 coaching" : tier.description}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Details */}
          <View className="flex-1">
            <ProgramDetailPanel programId={selectedTierId} />
          </View>
        </View>
    </SafeAreaView>
  );
}
