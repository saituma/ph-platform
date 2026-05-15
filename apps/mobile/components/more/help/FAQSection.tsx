import React from "react";
import { Pressable, View } from "react-native";
import { Plus, Minus } from "lucide-react-native";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { FAQS } from "./constants";

interface FAQSectionProps {
  expandedFaq: string | null;
  setExpandedFaq: (id: string | null) => void;
}

export function FAQSection({ expandedFaq, setExpandedFaq }: FAQSectionProps) {
  const p = useAdminPastel();

  return (
    <View style={{ marginBottom: 24, gap: 12 }}>
      {FAQS.map((item) => {
        const isOpen = expandedFaq === item.id;

        return (
          <Pressable
            key={item.id}
            onPress={() => setExpandedFaq(isOpen ? null : item.id)}
            style={({ pressed }) => ({
              borderRadius: 22,
              padding: 20,
              backgroundColor: p.cardWhite,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  height: 40,
                  width: 40,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 14,
                  backgroundColor: p.inputBg,
                }}
              >
                {isOpen ? (
                  <Minus size={18} color={p.accent} />
                ) : (
                  <Plus size={18} color={p.accent} />
                )}
              </View>
              <Text style={{ flex: 1, fontFamily: "Outfit-Bold", fontSize: 15, color: p.textPrimary, lineHeight: 22 }}>
                {item.question}
              </Text>
            </View>

            {isOpen ? (
              <Text style={{ marginTop: 16, fontFamily: "Outfit-Regular", fontSize: 14, color: p.textSecondary, lineHeight: 22 }}>
                {item.answer}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
