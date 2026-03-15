import React from "react";
import { View, ViewProps } from "react-native";
import { useProgramPanel } from "./useProgramPanel";

interface ProgramPanelCardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

export function ProgramPanelCard({ children, className = "", style, ...props }: ProgramPanelCardProps) {
  const { isDark, shadows } = useProgramPanel();

  return (
    <View
      className={`rounded-3xl bg-card px-6 py-5 ${className}`}
      style={[
        isDark ? shadows.none : shadows.md,
        style
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
