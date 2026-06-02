import React from "react";
import { Pressable, View } from "react-native";
import { AlertCircle, RotateCw } from "lucide-react-native";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";

type InlineErrorBannerProps = {
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
};

/** Inline "couldn't load — retry" banner. Used by nutrition/wellbeing/sleep instead of failing silently. */
export function InlineErrorBanner({ message, onRetry, retrying }: InlineErrorBannerProps) {
  const p = useAdminPastel();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderRadius: 18,
        backgroundColor: p.dangerSoft ?? "rgba(255,107,107,0.12)",
        borderWidth: 1,
        borderColor: p.danger ?? "#FF6B6B",
        paddingVertical: 14,
        paddingHorizontal: 16,
      }}
    >
      <AlertCircle size={20} color={p.danger ?? "#FF6B6B"} strokeWidth={2} />
      <Text style={{ flex: 1, fontFamily: "Outfit-SemiBold", fontSize: 13, color: p.textPrimary }}>
        {message?.trim() || "Couldn't load — check your connection."}
      </Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          disabled={retrying}
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            borderRadius: 100,
            backgroundColor: p.cardWhite,
            paddingVertical: 8,
            paddingHorizontal: 14,
            opacity: pressed || retrying ? 0.6 : 1,
          })}
        >
          <RotateCw size={14} color={p.textPrimary} strokeWidth={2.5} />
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 12, color: p.textPrimary }}>
            {retrying ? "…" : "Retry"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
