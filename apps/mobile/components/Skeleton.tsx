import React from "react";
import { ViewStyle } from "react-native";

import { UISkeleton } from "@/components/ui/hero";

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
  circle?: boolean;
}

export function Skeleton({
  width,
  height,
  borderRadius = 8,
  style,
  circle,
}: SkeletonProps) {
  return (
    <UISkeleton
      className={circle ? "rounded-full" : "rounded-2xl"}
      style={[
        {
          width: width as any,
          height: height as any,
          borderRadius: circle ? 999 : borderRadius,
        },
        style,
      ]}
    >
      {/* HeroUI skeleton needs a child frame to size the placeholder consistently. */}
      <></>
    </UISkeleton>
  );
}
