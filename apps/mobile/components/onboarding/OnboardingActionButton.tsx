import { Feather } from "@expo/vector-icons";
import React from "react";
import { Button } from "@/components/ui/Button";

type OnboardingActionButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Feather>["name"];
  minHeight?: number;
};

export function OnboardingActionButton({
  label,
  onPress,
  disabled = false,
  icon,
  minHeight = 56,
}: OnboardingActionButtonProps) {
  return (
    <Button
      label={label}
      onPress={onPress}
      disabled={disabled}
      icon={icon}
      size="lg"
      radius={18}
      style={{ minHeight }}
    />
  );
}
