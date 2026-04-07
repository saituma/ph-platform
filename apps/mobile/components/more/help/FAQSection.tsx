import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { FAQS } from "./constants";

interface FAQSectionProps {
  expandedFaq: string | null;
  setExpandedFaq: (id: string | null) => void;
}

export function FAQSection({ expandedFaq, setExpandedFaq }: FAQSectionProps) {
  const { colors, isDark } = useAppTheme();

  return (
    <View className="mb-8 gap-3">
      {FAQS.map((item) => {
        const isOpen = expandedFaq === item.id;

        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => setExpandedFaq(isOpen ? null : item.id)}
            className="rounded-[24px] border p-5"
            style={{
              backgroundColor: colors.card,
              borderColor: isOpen ? colors.accent : isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
              ...(isDark ? Shadows.none : Shadows.sm),
            }}
            activeOpacity={0.9}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: isOpen ? colors.accentLight : isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)" }}>
                <Feather name={isOpen ? "minus" : "plus"} size={18} color={colors.accent} />
              </View>
              <Text className="flex-1 font-outfit text-base font-bold text-app leading-6">{item.question}</Text>
            </View>

            {isOpen ? (
              <Text className="mt-4 font-outfit text-sm text-secondary leading-6">{item.answer}</Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
