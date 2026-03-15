import React from "react";
import { View, ViewProps } from "react-native";
import { Text } from "@/components/ScaledText";
import { useProgramPanel } from "./useProgramPanel";

export type ProgramPanelStatusVariant = "success" | "warning" | "info" | "default" | "accent" | "error";

interface ProgramPanelStatusBadgeProps extends ViewProps {
  label: string;
  variant?: ProgramPanelStatusVariant;
  className?: string;
}

export function ProgramPanelStatusBadge({ label, variant = "default", className = "", style, ...props }: ProgramPanelStatusBadgeProps) {
  const { isDark, colors } = useProgramPanel();

  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return {
          bg: isDark ? "rgba(34,197,94,0.16)" : "rgba(34,197,94,0.10)",
          border: isDark ? "rgba(34,197,94,0.3)" : "rgba(34,197,94,0.2)",
          text: colors.accent,
        };
      case "warning":
        return {
          bg: isDark ? "rgba(245,158,11,0.16)" : "rgba(245,158,11,0.10)",
          border: isDark ? "rgba(245,158,11,0.3)" : "rgba(245,158,11,0.2)",
          text: "#F59E0B",
        };
      case "accent":
        return {
          bg: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.82)",
          border: isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.06)",
          text: colors.accent,
        };
      case "error":
        return {
          bg: isDark ? "rgba(239,68,68,0.16)" : "rgba(239,68,68,0.10)",
          border: isDark ? "rgba(239,68,68,0.3)" : "rgba(239,68,68,0.2)",
          text: "#EF4444",
        };
      case "info":
        return {
          bg: isDark ? "rgba(59,130,246,0.16)" : "rgba(59,130,246,0.10)",
          border: isDark ? "rgba(59,130,246,0.3)" : "rgba(59,130,246,0.2)",
          text: "#3B82F6",
        };
      default:
        return {
          bg: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)",
          border: isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.1)",
          text: colors.textSecondary,
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <View
      className={`rounded-full border px-3 py-1 ${className}`}
      style={[
        {
          backgroundColor: styles.bg,
          borderColor: styles.border,
        },
        style
      ]}
      {...props}
    >
      <Text
        className="text-[10px] font-outfit font-bold uppercase tracking-[1.1px]"
        style={{ color: styles.text }}
      >
        {label}
      </Text>
    </View>
  );
}
