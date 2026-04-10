import React from "react";
import { View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";

interface RegisterHeaderProps {
  title: string;
  subtitle: string;
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  colors: any;
}

export function RegisterHeader({
  title,
  subtitle,
  currentStep,
  totalSteps,
  onBack,
  colors,
}: RegisterHeaderProps) {
  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Pressable
        onPress={onBack}
        style={{
          width: 42,
          height: 42,
          borderRadius: 16,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.cardElevated,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Feather name="arrow-left" size={20} color={colors.textSecondary} />
      </Pressable>

      <View style={{ flex: 1, paddingHorizontal: 14 }}>
        <Text
          className="font-outfit-semibold text-app"
          style={{ fontSize: 19 }}
        >
          {title}
        </Text>
        <Text
          className="font-outfit text-secondary"
          style={{ fontSize: 13, lineHeight: 18 }}
        >
          {subtitle}
        </Text>
      </View>

      <View
        style={{
          minWidth: 54,
          paddingHorizontal: 10,
          paddingVertical: 7,
          borderRadius: 999,
          alignItems: "center",
          backgroundColor: `${colors.accent}12`,
          borderWidth: 1,
          borderColor: `${colors.accent}22`,
        }}
      >
        <Text
          className="font-outfit-semibold"
          style={{ color: colors.accent, fontSize: 12 }}
        >
          {`${currentStep + 1}/${totalSteps}`}
        </Text>
      </View>
    </View>
  );
}
