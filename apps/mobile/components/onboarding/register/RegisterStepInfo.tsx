import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ScaledText";

interface RegisterStepInfoProps {
  currentStep: number;
  steps: readonly { title: string; body: string }[];
  colors: any;
}

export function RegisterStepInfo({
  currentStep,
  steps,
  colors,
}: RegisterStepInfoProps) {
  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
      <View
        style={{
          alignSelf: "flex-start",
          marginBottom: 10,
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: colors.cardElevated,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text
          className="font-outfit-semibold"
          style={{ color: colors.textSecondary, fontSize: 11 }}
        >
          ONBOARDING
        </Text>
      </View>
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          marginBottom: 10,
        }}
      >
        {steps.map((item, index) => {
          const isActive = index === currentStep;
          const isComplete = index < currentStep;
          return (
            <View
              key={item.title}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 999,
                backgroundColor:
                  isActive || isComplete
                    ? colors.accent
                    : `${colors.textSecondary}22`,
              }}
            />
          );
        })}
      </View>
      <Text
        className="font-outfit text-secondary"
        style={{ fontSize: 14, lineHeight: 20, maxWidth: "92%" }}
      >
        {steps[currentStep].body}
      </Text>
    </View>
  );
}
