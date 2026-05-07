import React, { useState } from "react";
import { Image, Modal, Pressable, View } from "react-native";
import { ChevronRight, Shield, User } from "lucide-react-native";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { ManagedAthlete } from "./hooks/useProfileSettings";

interface ManagedAthletesSectionProps {
  managedAthletes: ManagedAthlete[];
  managedAthleteCount: number;
}

export function ManagedAthletesSection({
  managedAthletes,
  managedAthleteCount,
}: ManagedAthletesSectionProps) {
  const p = useAdminPastel();
  const [isVisible, setIsVisible] = useState(false);

  const displayValue = (value: unknown) => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "string") return value || "—";
    if (typeof value === "number" || typeof value === "boolean")
      return String(value);
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  return (
    <View
      style={{
        backgroundColor: p.cardSage,
        borderRadius: 22,
        padding: 24,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: p.accentSoft, alignItems: "center", justifyContent: "center" }}>
          <Shield size={18} color={p.accent} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 16, color: p.textPrimary }}>
            Guardian Settings
          </Text>
          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textMuted }}>
            Manage your household settings.
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() => setIsVisible(true)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 16,
          borderTopWidth: 1,
          borderTopColor: p.divider,
          marginTop: 8,
        }}
      >
        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 16, color: p.textPrimary }}>
          Managed Athletes
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.accent }}>
            {managedAthleteCount} Active
          </Text>
          <ChevronRight size={18} color={p.textMuted} strokeWidth={2} />
        </View>
      </Pressable>

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}
          onPress={() => setIsVisible(false)}
        >
          <Pressable
            style={{
              width: "100%",
              borderRadius: 22,
              backgroundColor: p.cardWhite,
              padding: 24,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{ fontFamily: "Outfit-Bold", fontSize: 18, color: p.textPrimary, marginBottom: 4 }}>
              Managed Athletes
            </Text>
            <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textMuted, marginBottom: 16 }}>
              Review the athlete profiles managed by this account.
            </Text>
            {managedAthletes.length ? (
              <View style={{ gap: 16 }}>
                {managedAthletes.map((athlete, index) => (
                  <View
                    key={athlete.id ?? athlete.name ?? `athlete-${index}`}
                    style={{ gap: 12 }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      {athlete.profilePicture ? (
                        <View style={{ width: 52, height: 52, borderRadius: 26, overflow: "hidden", borderWidth: 2, borderColor: p.accent }}>
                          <Image
                            source={{ uri: athlete.profilePicture }}
                            style={{ width: 48, height: 48 }}
                          />
                        </View>
                      ) : (
                        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: p.cardMint, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: p.accent }}>
                          <User size={24} color={p.accent} strokeWidth={2} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 16, color: p.textPrimary }}>
                          {athlete.name ?? "Athlete"}
                        </Text>
                        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textMuted }}>
                          {athlete.team ?? "Team not set"} • {athlete.level ?? "Level not set"}
                        </Text>
                      </View>
                    </View>
                    <View style={{ gap: 4, paddingLeft: 4 }}>
                      <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textSecondary }}>
                        Age: {athlete.age ?? "—"}
                      </Text>
                      <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textSecondary }}>
                        Training days: {athlete.trainingPerWeek ?? "—"}
                      </Text>
                      <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textSecondary }}>
                        Goals: {athlete.performanceGoals ?? "—"}
                      </Text>
                      <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textSecondary }}>
                        Equipment: {athlete.equipmentAccess ?? "—"}
                      </Text>
                      <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textSecondary }}>
                        Injuries: {displayValue(athlete.injuries)}
                      </Text>
                    </View>
                    <View style={{ height: 1, backgroundColor: p.divider }} />
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textMuted }}>
                No athlete profile found for this account.
              </Text>
            )}
            <Pressable
              onPress={() => setIsVisible(false)}
              style={{
                marginTop: 20,
                borderRadius: 100,
                backgroundColor: p.accent,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.buttonPrimaryText }}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
