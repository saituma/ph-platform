import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Activity, ExternalLink, Info, Mail, MapPin, Phone, User } from "lucide-react-native";

import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { apiRequest } from "@/lib/api";
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
  const { token, capabilities } = useAppSelector((state) => state.user);
  const hasProReferrals = Boolean(capabilities?.physioReferrals);
  const { socket } = useSocket();
  const p = useAdminPastel();
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
      <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg }} edges={["top"]}>
        <MoreStackHeader
          title="Referrals"
          subtitle="Physio and partner referrals from your coach."
          onBack={() => router.back()}
        />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 24, fontFamily: "Outfit-Bold", color: p.textPrimary, textAlign: "center", marginBottom: 12 }}>
            Referrals
          </Text>
          <Text style={{ fontSize: 16, fontFamily: "Outfit-Regular", color: p.textSecondary, textAlign: "center", maxWidth: 300 }}>
            This area isn't available for your account yet.
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/programs")}
            style={({ pressed }) => ({
              marginTop: 32,
              borderRadius: 100,
              paddingHorizontal: 32,
              paddingVertical: 12,
              backgroundColor: p.accent,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ fontSize: 14, fontFamily: "Outfit-Bold", color: p.buttonPrimaryText }}>
              Open training
            </Text>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <MoreStackHeader
          title="Referrals"
          subtitle="Access the latest referral your coach has assigned, along with contact details and any partner perks."
          badge={referralTypeLabel}
          onBack={() => router.back()}
        />

        <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>

          {loading ? (
            <View style={{ borderRadius: 22, backgroundColor: p.cardWhite, paddingHorizontal: 24, paddingVertical: 40, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color={p.accent} />
              <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary, marginTop: 12 }}>Loading referral details...</Text>
            </View>
          ) : error ? (
            <View style={{ borderRadius: 22, backgroundColor: p.dangerSoft, paddingHorizontal: 24, paddingVertical: 24 }}>
              <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.danger, textAlign: "center" }}>{error}</Text>
            </View>
          ) : !referral ? (
            <View style={{ borderRadius: 22, backgroundColor: p.cardWhite, paddingHorizontal: 24, paddingVertical: 40, alignItems: "center", justifyContent: "center" }}>
              <View style={{ height: 64, width: 64, borderRadius: 100, backgroundColor: p.accentSoft, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Activity size={28} color={p.textMuted} />
              </View>
              <Text style={{ fontSize: 18, fontFamily: "Outfit-Bold", color: p.textPrimary, marginBottom: 8, textAlign: "center" }}>No Referral Yet</Text>
              <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary, textAlign: "center", lineHeight: 22 }}>
                Your coach has not assigned a referral for you yet. They will notify you when one is ready.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 24 }}>
              {/* Main Actions Card */}
              <View style={{
                borderRadius: 22,
                backgroundColor: p.accent,
                paddingHorizontal: 24,
                paddingVertical: 24,
                overflow: "hidden",
              }}>
                <Text style={{ fontSize: 22, fontFamily: "Outfit-Bold", color: p.buttonPrimaryText, marginBottom: 8 }}>
                  Open Referral
                </Text>

                {referral.discountPercent ? (
                  <View style={{ marginBottom: 20, flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ borderRadius: 100, backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 12, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 12, fontFamily: "Outfit-Bold", color: p.buttonPrimaryText, letterSpacing: 1 }}>
                        {referral.discountPercent}% OFF
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: "rgba(255,255,255,0.85)" }}>
                      Included with this referral link.
                    </Text>
                  </View>
                ) : (
                  <Text style={{ marginBottom: 20, fontSize: 14, fontFamily: "Outfit-Regular", color: "rgba(255,255,255,0.9)" }}>
                    Use your referral link below.
                  </Text>
                )}

                <Pressable
                  onPress={() => {
                    if (referralLink) Linking.openURL(referralLink).catch(() => null);
                  }}
                  disabled={!referralLink}
                  style={({ pressed }) => ({
                    width: "100%",
                    borderRadius: 100,
                    paddingVertical: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    backgroundColor: referralLink ? p.cardWhite : "rgba(255,255,255,0.25)",
                    opacity: (!referralLink || pressed) ? 0.75 : 1,
                  })}
                >
                  <Text style={{
                    fontSize: 16,
                    fontFamily: "Outfit-Bold",
                    color: referralLink ? p.accent : p.buttonPrimaryText,
                  }}>
                    {referralLink ? "Open Referral Link" : "Link not available"}
                  </Text>
                  {referralLink && <ExternalLink size={18} color={p.accent} />}
                </Pressable>
              </View>

              {meta.imageUrl ? (
                <View style={{ overflow: "hidden", borderRadius: 22, backgroundColor: p.cardWhite }}>
                  <Image
                    source={{ uri: meta.imageUrl }}
                    style={{ width: "100%", height: 220 }}
                    resizeMode="cover"
                  />
                </View>
              ) : null}

              {/* Physio Details Card */}
              {hasMeta && (
                <View style={{ borderRadius: 22, backgroundColor: p.cardWhite, paddingHorizontal: 24, paddingVertical: 24, gap: 20 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: p.divider, paddingBottom: 16 }}>
                    <View style={{ height: 40, width: 40, borderRadius: 100, backgroundColor: p.accentSoft, alignItems: "center", justifyContent: "center" }}>
                      <User size={20} color={p.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, fontFamily: "Outfit-Bold", color: p.textMuted, textTransform: "uppercase", letterSpacing: 2 }}>
                        {referralTypeLabel}
                      </Text>
                      <Text style={{ fontSize: 18, fontFamily: "Outfit-Bold", color: p.textPrimary, marginTop: 2 }} numberOfLines={1}>
                        {providerLabel}
                      </Text>
                      {organizationLabel && (
                        <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.textSecondary, marginTop: 2 }} numberOfLines={1}>
                          {organizationLabel}
                        </Text>
                      )}
                    </View>
                  </View>

                  {meta.specialty && (
                    <View>
                      <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.textMuted, marginBottom: 4 }}>Specialty</Text>
                      <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textPrimary }}>{meta.specialty}</Text>
                    </View>
                  )}

                  {(meta.phone || meta.email) && (
                    <View style={{ flexDirection: "row", gap: 16 }}>
                      {meta.phone && (
                        <View style={{ flex: 1, borderRadius: 16, backgroundColor: p.inputBg, padding: 16 }}>
                          <Phone size={16} color={p.textMuted} style={{ marginBottom: 8 }} />
                          <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.textPrimary }} selectable>{meta.phone}</Text>
                        </View>
                      )}
                      {meta.email && (
                        <View style={{ flex: 1, borderRadius: 16, backgroundColor: p.inputBg, padding: 16 }}>
                          <Mail size={16} color={p.textMuted} style={{ marginBottom: 8 }} />
                          <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.textPrimary }} selectable numberOfLines={1}>{meta.email}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {meta.location && (
                    <View>
                      <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.textMuted, marginBottom: 4 }}>Location</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <MapPin size={14} color={p.accent} />
                        <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textPrimary, flex: 1 }}>{meta.location}</Text>
                      </View>
                    </View>
                  )}

                  {meta.notes && (
                    <View style={{ borderRadius: 16, backgroundColor: p.accentSoft, padding: 16 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <Info size={14} color={p.accent} />
                        <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: p.accent, textTransform: "uppercase", letterSpacing: 1.4 }}>Coach Notes</Text>
                      </View>
                      <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textPrimary, lineHeight: 22 }}>{meta.notes}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
