import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Linking, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { apiRequest } from "@/lib/api";
import { hasPhpProPlanFeatures } from "@/lib/planAccess";
import { useAppSelector } from "@/store/hooks";
import { useSocket } from "@/context/SocketContext";

type PhysioMetadata = {
  referralType?: string | null;
  providerName?: string | null;
  organizationName?: string | null;
  imageUrl?: string | null;
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
  const { token, programTier } = useAppSelector((state) => state.user);
  const hasProReferrals = hasPhpProPlanFeatures(programTier);
  const { socket } = useSocket();
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
      setError(err?.message ?? "Failed to load referral.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!hasProReferrals || !token) return;
    void loadReferral();
  }, [hasProReferrals, token, loadReferral]);

  useEffect(() => {
    if (!socket || !hasProReferrals) return;

    const handleReferralChange = () => {
      void loadReferral();
    };

    socket.on("physio:referral:updated", handleReferralChange);
    socket.on("physio:referral:deleted", handleReferralChange);

    return () => {
      socket.off("physio:referral:updated", handleReferralChange);
      socket.off("physio:referral:deleted", handleReferralChange);
    };
  }, [hasProReferrals, loadReferral, socket]);

  if (!hasProReferrals) {
    return (
      <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
        <MoreStackHeader
          title="Referrals"
          subtitle="Physio and partner referrals from your coach."
          onBack={() => router.back()}
        />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-2xl font-clash font-bold text-app text-center mb-3">Referrals</Text>
          <Text className="text-base font-outfit text-secondary text-center max-w-[300px]">
            This area isn’t available for your account yet.
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/programs")}
            className="mt-8 rounded-full px-8 py-3 bg-[#2F8F57]"
          >
            <Text className="text-sm font-outfit font-semibold text-white">Open training</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const meta = referral?.metadata ?? {};
  const hasMeta = !!(
    meta.providerName ||
    meta.organizationName ||
    meta.physioName ||
    meta.clinicName ||
    meta.location ||
    meta.phone ||
    meta.email ||
    meta.specialty ||
    meta.notes
  );
  const referralLink = referral?.referalLink;
  const referralTypeLabel = meta.referralType || "Referral";
  const providerLabel = meta.providerName || meta.physioName || "Referral Partner";
  const organizationLabel = meta.organizationName || meta.clinicName || null;

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <ThemedScrollView contentContainerStyle={{ paddingBottom: 40 }} onRefresh={loadReferral}>
        <MoreStackHeader
          title="Referrals"
          subtitle="Access the latest referral your coach has assigned, along with contact details and any partner perks."
          badge={referralTypeLabel}
          onBack={() => router.back()}
        />

        <View className="px-6 pt-2">

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
                Your coach has not assigned a referral for you yet. They will notify you when one is ready.
              </Text>
            </View>
          ) : (
            <View className="gap-6">
              {/* Main Actions Card */}
              <View className="rounded-3xl bg-[#1F6F45] px-6 py-6 shadow-sm overflow-hidden">
                <View className="absolute -top-10 -right-10 opacity-10">
                  <Feather name="activity" size={120} color="#FFFFFF" />
                </View>
                
                <Text className="text-2xl font-clash text-white font-bold mb-2">Open Referral</Text>
                
                {referral.discountPercent ? (
                  <View className="mb-6 flex-row items-center gap-2">
                    <View className="rounded-full bg-white/20 px-3 py-1">
                      <Text className="text-xs font-outfit text-white font-bold tracking-wider">
                        {referral.discountPercent}% OFF
                      </Text>
                    </View>
                    <Text className="text-xs font-outfit text-white/80">
                      Included with this referral link.
                    </Text>
                  </View>
                ) : (
                  <Text className="mb-6 text-sm font-outfit text-white/90">
                    Use your referral link below.
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
                    {referralLink ? "Open Referral Link" : "Link not available"}
                  </Text>
                  {referralLink && <Feather name="external-link" size={18} color="#1F6F45" />}
                </Pressable>
              </View>

              {meta.imageUrl ? (
                <View className="overflow-hidden rounded-3xl border border-white/5 bg-card">
                  <Image
                    source={{ uri: meta.imageUrl }}
                    style={{ width: "100%", height: 220 }}
                    resizeMode="cover"
                  />
                </View>
              ) : null}

              {/* Physio Details Card */}
              {hasMeta && (
                <View className="rounded-3xl bg-card px-6 py-6 border border-white/5 space-y-5">
                  <View className="flex-row items-center gap-3 border-b border-white/5 pb-4">
                    <View className="h-10 w-10 rounded-full bg-accent/20 items-center justify-center">
                      <Feather name="user" size={20} color="#2F8F57" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[10px] font-outfit text-secondary uppercase tracking-[2px] font-bold">
                        {referralTypeLabel}
                      </Text>
                      <Text className="text-lg font-clash text-app font-bold mt-0.5" numberOfLines={1}>
                        {providerLabel}
                      </Text>
                      {organizationLabel && (
                        <Text className="text-xs font-outfit text-secondary mt-0.5" numberOfLines={1}>
                          {organizationLabel}
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
