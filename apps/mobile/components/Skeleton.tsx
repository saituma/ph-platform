import React from "react";
import { ViewStyle } from "react-native";
import { Skeleton as HeroSkeleton, cn } from "heroui-native";

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
    <HeroSkeleton
      variant="pulse"
      className={cn(circle ? "rounded-full" : "rounded-2xl")}
      style={[
        {
          width: width as any,
          height: height as any,
          borderRadius: circle ? 999 : borderRadius,
        },
        style,
      ]}
    />
  );
}
