import React from "react";
import { Pressable, View } from "react-native";
import { MessageSquare, Smartphone, Lock, ChevronRight } from "lucide-react-native";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useRouter } from "expo-router";
import { QUICK_ACTIONS } from "./constants";

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  "message-square": MessageSquare,
  smartphone: Smartphone,
  lock: Lock,
};

export function QuickActions() {
  const router = useRouter();
  const p = useAdminPastel();

  return (
    <View style={{ marginBottom: 24, gap: 12 }}>
      {QUICK_ACTIONS.map((action) => {
        const Icon = ICON_MAP[action.icon] || MessageSquare;
        return (
          <Pressable
            key={action.id}
            onPress={() => router.push(action.route as never)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              borderRadius: 22,
              padding: 16,
              backgroundColor: p.cardSage,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <View
              style={{
                marginRight: 16,
                height: 48,
                width: 48,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 16,
                backgroundColor: p.accentSoft,
              }}
            >
              <Icon size={20} color={p.accent} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 16, color: p.textPrimary, marginBottom: 4 }}>
                {action.label}
              </Text>
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textSecondary, lineHeight: 18 }}>
                {action.description}
              </Text>
            </View>

            <ChevronRight size={18} color={p.textMuted} />
          </Pressable>
        );
      })}
    </View>
  );
}
