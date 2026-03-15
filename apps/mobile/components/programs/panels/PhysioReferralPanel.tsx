import React, { useCallback, useEffect, useState } from "react";
import { Linking, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { Text } from "@/components/ScaledText";
import { useSocket } from "@/context/SocketContext";
import { ProgramPanelCard } from "./shared/ProgramPanelCard";

export function PhysioReferralPanel({ discount }: { discount?: string }) {
  const { token } = useAppSelector((state) => state.user);
  const { socket } = useSocket();
  const [loading, setLoading] = useState(false);
  const [referral, setReferral] = useState<{
    referalLink?: string | null;
    discountPercent?: number | null;
    metadata?: {
      physioName?: string | null;
      clinicName?: string | null;
      location?: string | null;
      phone?: string | null;
      specialty?: string | null;
    } | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadReferral = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ item?: any }>("/physio-referral", { token, suppressLog: true });
      setReferral(data.item ?? null);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load referral.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadReferral();
  }, [loadReferral]);

  useEffect(() => {
    if (!socket) return;

    const handleReferralChange = () => {
      void loadReferral();
    };

    socket.on("physio:referral:updated", handleReferralChange);
    socket.on("physio:referral:deleted", handleReferralChange);

    return () => {
      socket.off("physio:referral:updated", handleReferralChange);
      socket.off("physio:referral:deleted", handleReferralChange);
    };
  }, [loadReferral, socket]);

  const resolvedDiscount = referral?.discountPercent
    ? `${referral.discountPercent}%`
    : discount;
  const referralLink = referral?.referalLink ?? null;
  const statusCopy = referralLink
    ? "Your referral is ready. Tap to book your physio session."
    : "A referral link will appear here once your coach activates it.";

  const meta = referral?.metadata ?? {};
  const hasMeta = !!(meta.physioName || meta.location || meta.phone);

  return (
    <ProgramPanelCard>
      <Text className="text-lg font-clash text-app font-bold mb-2">Physio Referral</Text>
      <Text className="text-sm font-outfit text-secondary leading-relaxed">
        Access our trusted physio partners for injuries and recovery support.
      </Text>

      {hasMeta && (
        <View className="mt-4 rounded-2xl bg-secondary/10 px-4 py-4 space-y-2">
          {meta.physioName && (
            <Text className="text-sm font-clash font-bold text-app">{meta.physioName}</Text>
          )}
          {meta.clinicName && (
            <Text className="text-xs font-outfit text-secondary">{meta.clinicName}</Text>
          )}
          {meta.location && (
            <View className="flex-row items-center gap-2 mt-1">
              <Feather name="map-pin" size={12} color="#94A3B8" />
              <Text className="text-xs font-outfit text-secondary flex-1">{meta.location}</Text>
            </View>
          )}
          {meta.phone && (
            <View className="flex-row items-center gap-2 mt-1">
              <Feather name="phone" size={12} color="#94A3B8" />
              <Text className="text-xs font-outfit text-secondary">{meta.phone}</Text>
            </View>
          )}
          {meta.specialty && (
            <Text className="text-xs font-outfit text-accent mt-2 font-medium">{meta.specialty}</Text>
          )}
        </View>
      )}

      {resolvedDiscount && (
        <View className="mt-4 rounded-2xl bg-secondary/5 px-4 py-3 flex-row items-center gap-2">
          <Feather name="tag" size={14} color="#2F8F57" />
          <Text className="text-sm font-outfit text-secondary">
            Discount: <Text className="font-bold text-app">{resolvedDiscount}</Text>
          </Text>
        </View>
      )}

      <Text className="text-sm font-outfit text-secondary mt-4">{statusCopy}</Text>
      
      {loading ? (
        <Text className="text-sm font-outfit text-secondary mt-3">Loading referral...</Text>
      ) : error ? (
        <Text className="text-sm font-outfit text-red-400 mt-3">{error}</Text>
      ) : null}

      <TouchableOpacity
        onPress={() => {
          if (!referralLink) return;
          Linking.openURL(referralLink).catch(() => null);
        }}
        disabled={!referralLink}
        className={`mt-4 rounded-full px-4 py-3 flex-row justify-center items-center gap-2 ${referralLink ? "bg-accent" : "bg-secondary/20"}`}
      >
        <Text className={`text-sm font-outfit font-bold ${referralLink ? "text-white" : "text-secondary"}`}>
          {referralLink ? "Open Referral Link" : "Referral link not set"}
        </Text>
        {referralLink && <Feather name="external-link" size={16} color="#FFFFFF" />}
      </TouchableOpacity>
    </ProgramPanelCard>
  );
}
