import React from "react";
import { ViewProps } from "react-native";

import { UIChip } from "@/components/ui/hero";

export type ProgramPanelStatusVariant = "success" | "warning" | "info" | "default" | "accent" | "error";

interface ProgramPanelStatusBadgeProps extends ViewProps {
  label: string;
  variant?: ProgramPanelStatusVariant;
  className?: string;
}

export function ProgramPanelStatusBadge({ label, variant = "default", className = "", style, ...props }: ProgramPanelStatusBadgeProps) {
  const color =
    variant === "success"
      ? "success"
      : variant === "warning"
        ? "warning"
        : variant === "error"
          ? "danger"
          : variant === "accent"
            ? "accent"
            : "default";

  return (
    <UIChip
      label={label}
      color={color}
      className={className}
      style={style}
      {...props}
    />
  );
}
