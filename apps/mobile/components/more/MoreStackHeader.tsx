import { useAdminPastel } from "@/components/admin/AdminUI";
import { Text } from "@/components/ScaledText";
import { ArrowLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";

type MoreStackHeaderProps = {
  title: string;
  subtitle?: string;
  badge?: string;
  backHref?: string;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
};

export function MoreStackHeader({
  title,
  subtitle,
  badge,
  backHref = "/(tabs)/more",
  onBack,
  rightSlot,
}: MoreStackHeaderProps) {
  const router = useRouter();
  const p = useAdminPastel();

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 8, paddingTop: 12, backgroundColor: p.pageBg }}>
      <View
        style={{
          overflow: "hidden",
          borderRadius: 24,
          paddingHorizontal: 16,
          paddingBottom: 20,
          paddingTop: 16,
          backgroundColor: p.inputBg,
          borderWidth: 1,
          borderColor: p.divider,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Pressable
            onPress={() => {
              if (onBack) {
                onBack();
                return;
              }
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace(backHref as any);
              }
            }}
            hitSlop={10}
            style={({ pressed }) => ({
              height: 40,
              width: 40,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 100,
              backgroundColor: p.accentSoft,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <ArrowLeft size={18} color={p.accent} strokeWidth={2} />
          </Pressable>

          {rightSlot ?? (badge ? (
            <View
              style={{
                borderRadius: 99,
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: p.accentSoft,
                borderWidth: 1,
                borderColor: p.divider,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: "Outfit-Bold",
                  textTransform: "uppercase",
                  letterSpacing: 1.4,
                  color: p.accent,
                }}
              >
                {badge}
              </Text>
            </View>
          ) : <View style={{ width: 40 }} />)}
        </View>

        <View style={{ marginTop: 16 }}>
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: 28,
              letterSpacing: -0.3,
              color: p.textPrimary,
            }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={{
                marginTop: 6,
                fontSize: 14,
                lineHeight: 20,
                fontFamily: "Outfit-Regular",
                color: p.textSecondary,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}
