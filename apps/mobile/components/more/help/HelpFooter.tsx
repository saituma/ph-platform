import React from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { MessageCircle } from "lucide-react-native";
import { useRouter } from "expo-router";

export function HelpFooter() {
  const router = useRouter();
  const p = useAdminPastel();

  return (
    <View
      style={{
        marginBottom: 24,
        overflow: "hidden",
        borderRadius: 22,
        padding: 20,
        backgroundColor: p.cardPeach,
      }}
    >
      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 22, color: p.textPrimary, marginBottom: 8 }}>
        Still need a hand?
      </Text>
      <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textSecondary, lineHeight: 22, marginBottom: 20 }}>
        For the fastest support, include the athlete name, device type, and a short description of what changed right before the issue started.
      </Text>

      <Pressable
        onPress={() => router.push("/feedback")}
        style={({ pressed }) => ({
          height: 52,
          borderRadius: 100,
          backgroundColor: p.accent,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        <MessageCircle size={20} color={p.buttonPrimaryText} />
        <Text style={{ color: p.buttonPrimaryText, fontFamily: "Outfit-Bold", fontSize: 15 }}>
          Contact Support
        </Text>
      </Pressable>
    </View>
  );
}
