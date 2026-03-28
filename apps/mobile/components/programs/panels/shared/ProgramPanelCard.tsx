import React from "react";
import { ViewProps } from "react-native";

import { UICard } from "@/components/ui/hero";

interface ProgramPanelCardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

export function ProgramPanelCard({ children, className = "", style, ...props }: ProgramPanelCardProps) {
  return (
    <UICard
      className={className}
      style={style}
      {...props}
    >
      {children}
    </UICard>
  );
}
