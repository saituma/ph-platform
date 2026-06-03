import React from "react";
import { Pressable, View } from "react-native";
import { RotateCw, WifiOff } from "lucide-react-native";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";

/** Error + retry card for team-manager screens. Mirrors the empty-state card so a
 * failed fetch never reads as real "0" data. */
export function ErrorRetry({
  title = "Couldn't load",
  message = "Check your connection and try again.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry: () => void;
}) {
  const p = useAdminPastel();

  return (
    <View style={{ paddingHorizontal: 20 }}>
      <View
        style={{
          borderRadius: 22,
          backgroundColor: p.cardSage,
          padding: 28,
          alignItems: "center",
          gap: 10,
        }}
      >
        <WifiOff size={30} color={p.textMuted} />
        <Text
          style={{
            fontSize: 14,
            fontFamily: "Outfit-Bold",
            color: p.textPrimary,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontSize: 12,
            fontFamily: "Outfit-Regular",
            color: p.textSecondary,
            textAlign: "center",
            lineHeight: 17,
          }}
        >
          {message}
        </Text>
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Try again"
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            backgroundColor: p.accentSoft,
            paddingHorizontal: 18,
            paddingVertical: 10,
            borderRadius: 100,
            marginTop: 4,
            opacity: pressed ? 0.72 : 1,
          })}
        >
          <RotateCw size={14} color={p.textSecondary} />
          <Text
            style={{
              fontSize: 13,
              fontFamily: "Outfit-Bold",
              color: p.textSecondary,
            }}
          >
            Try again
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
