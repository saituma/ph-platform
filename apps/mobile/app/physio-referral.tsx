import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";

type PhysioMetadata = {
  physioName?: string | null;
  clinicName?: string | null;
  location?: string | null;
  phone?: string | null;
  email?: string | null;
  specialty?: string | null;
  notes?: string | null;
};

type ReferralData = {
  referalLink?: string | null;
  discountPercent?: number | null;
  metadata?: PhysioMetadata | null;
};

export default function PhysioReferralScreen() {
  const router = useRouter();
  const { token } = useAppSelector((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [referral, setReferral] = useState<ReferralData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadReferral = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ item?: any }>("/physio-referral", { token });
      setReferral(data.item ?? null);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load physio referral.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadReferral();
  }, [loadReferral]);

  const meta = referral?.metadata ?? {};
  const hasMeta = !!(meta.physioName || meta.clinicName || meta.location || meta.phone || meta.email || meta.specialty || meta.notes);
  const referralLink = referral?.referalLink;

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <ThemedScrollView contentContainerStyle={{ paddingBottom: 40 }} onRefresh={loadReferral}>
        <View className="px-6 pt-6">
          <View className="flex-row items-center justify-between mb-8">
            <Pressable
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center bg-secondary rounded-full"
            >
              <Feather name="arrow-left" size={20} color="#94A3B8" />
            </Pressable>
            <Text className="text-xl font-clash text-white font-bold">Physio Referral</Text>
            <View className="w-10" />
          </View>

          {loading ? (
            <View className="rounded-3xl bg-card px-6 py-10 items-center justify-center">
              <ActivityIndicator color="#2F8F57" />
              <Text className="text-sm font-outfit text-secondary mt-3">Loading referral details...</Text>
            </View>
          ) : error ? (
            <View className="rounded-3xl bg-card px-6 py-6 border border-red-500/20">
              <Text className="text-sm font-outfit text-red-400 text-center">{error}</Text>
            </View>
          ) : !referral ? (
            <View className="rounded-3xl bg-card px-6 py-10 items-center justify-center border border-white/5">
              <View className="h-16 w-16 rounded-full bg-secondary/20 items-center justify-center mb-4">
                <Feather name="activity" size={28} color="#94A3B8" />
              </View>
              <Text className="text-lg font-clash text-white font-bold mb-2 text-center">No Referral Yet</Text>
              <Text className="text-sm font-outfit text-secondary text-center leading-relaxed">
                Your coach has not assigned a physio referral for you yet. They will notify you when one is ready.
              </Text>
            </View>
          ) : (
            <View className="gap-6">
              {/* Main Actions Card */}
              <View className="rounded-3xl bg-[#1F6F45] px-6 py-6 shadow-sm overflow-hidden">
                <View className="absolute -top-10 -right-10 opacity-10">
                  <Feather name="activity" size={120} color="#FFFFFF" />
                </View>
                
                <Text className="text-2xl font-clash text-white font-bold mb-2">Book Session</Text>
                
                {referral.discountPercent ? (
                  <View className="mb-6 flex-row items-center gap-2">
                    <View className="rounded-full bg-white/20 px-3 py-1">
                      <Text className="text-xs font-outfit text-white font-bold tracking-wider">
                        {referral.discountPercent}% OFF
                      </Text>
                    </View>
                    <Text className="text-xs font-outfit text-white/80">
                      Applied via your referral link.
                    </Text>
                  </View>
                ) : (
                  <Text className="mb-6 text-sm font-outfit text-white/90">
                    Use your preferred referral link below.
                  </Text>
                )}

                <Pressable
                  onPress={() => {
                    if (referralLink) Linking.openURL(referralLink).catch(() => null);
                  }}
                  className={`w-full rounded-2xl py-4 flex-row items-center justify-center gap-3 ${referralLink ? "bg-white" : "bg-white/20 opacity-50"}`}
                  disabled={!referralLink}
                >
                  <Text className={`text-base font-outfit font-bold ${referralLink ? "text-[#1F6F45]" : "text-white"}`}>
                    {referralLink ? "Open Booking Link" : "Link not available"}
                  </Text>
                  {referralLink && <Feather name="external-link" size={18} color="#1F6F45" />}
                </Pressable>
              </View>

              {/* Physio Details Card */}
              {hasMeta && (
                <View className="rounded-3xl bg-card px-6 py-6 border border-white/5 space-y-5">
                  <View className="flex-row items-center gap-3 border-b border-white/5 pb-4">
                    <View className="h-10 w-10 rounded-full bg-accent/20 items-center justify-center">
                      <Feather name="user" size={20} color="#2F8F57" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[10px] font-outfit text-secondary uppercase tracking-[2px] font-bold">
                        Partner Physio
                      </Text>
                      <Text className="text-lg font-clash text-app font-bold mt-0.5" numberOfLines={1}>
                        {meta.physioName || "Physio Team"}
                      </Text>
                      {meta.clinicName && (
                        <Text className="text-xs font-outfit text-secondary mt-0.5" numberOfLines={1}>
                          {meta.clinicName}
                        </Text>
                      )}
                    </View>
                  </View>

                  {meta.specialty && (
                    <View>
                      <Text className="text-xs font-outfit text-secondary mb-1">Specialty</Text>
                      <Text className="text-sm font-outfit text-app">{meta.specialty}</Text>
                    </View>
                  )}

                  {(meta.phone || meta.email) && (
                    <View className="flex-row gap-4">
                      {meta.phone && (
                        <View className="flex-1 rounded-2xl bg-secondary/10 p-4">
                          <Feather name="phone" size={16} color="#94A3B8" className="mb-2" />
                          <Text className="text-xs font-outfit text-app" selectable>{meta.phone}</Text>
                        </View>
                      )}
                      {meta.email && (
                        <View className="flex-1 rounded-2xl bg-secondary/10 p-4">
                          <Feather name="mail" size={16} color="#94A3B8" className="mb-2" />
                          <Text className="text-xs font-outfit text-app" selectable numberOfLines={1}>{meta.email}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {meta.location && (
                    <View>
                      <Text className="text-xs font-outfit text-secondary mb-1">Location</Text>
                      <View className="flex-row items-center gap-2">
                        <Feather name="map-pin" size={14} color="#2F8F57" />
                        <Text className="text-sm font-outfit text-app flex-1">{meta.location}</Text>
                      </View>
                    </View>
                  )}

                  {meta.notes && (
                    <View className="rounded-2xl bg-accent/10 p-4 border border-accent/20">
                      <View className="flex-row items-center gap-2 mb-2">
                        <Feather name="info" size={14} color="#2F8F57" />
                        <Text className="text-xs font-outfit text-[#2F8F57] uppercase tracking-wider font-bold">Coach Notes</Text>
                      </View>
                      <Text className="text-sm font-outfit text-app leading-relaxed">{meta.notes}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </ThemedScrollView>
    </SafeAreaView>
  );
}
