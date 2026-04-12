import { Feather } from "@expo/vector-icons";
import React from "react";
import { Button } from "@/components/ui/Button";

type OnboardingActionButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Feather>["name"];
  iconPosition?: "left" | "right";
  /** Primary = main CTA; outline = secondary (e.g. Back). */
  variant?: "primary" | "outline" | "secondary";
  minHeight?: number;
};

export function OnboardingActionButton({
  label,
  onPress,
  disabled = false,
  icon,
  iconPosition = "left",
  variant = "primary",
  minHeight = 54,
}: OnboardingActionButtonProps) {
  const mapVariant =
    variant === "primary"
      ? "primary"
      : variant === "secondary"
        ? "secondary"
        : "outline";

  return (
    <Button
      label={label}
      onPress={onPress}
      disabled={disabled}
      icon={icon}
      iconPosition={iconPosition}
      variant={mapVariant}
      size="lg"
      radius={16}
      style={{ minHeight }}
    />
  );
}
