import React from "react";
import { Text } from "react-native";
import Animated from "react-native-reanimated";
import { fonts, radius } from "@/constants/theme";

interface RunToastProps {
  message: string | null;
  toastStyle: any;
  colors: any;
}

export function RunToast({ message, toastStyle, colors }: RunToastProps) {
  if (!message) return null;

  return (
    <Animated.View
      style={[
        toastStyle,
        {
          position: "absolute",
          top: 0,
          left: 16,
          right: 16,
          padding: 12,
          borderRadius: radius.xl,
          backgroundColor: colors.surfaceHigh,
          borderColor: colors.borderSubtle,
          borderWidth: 1,
          alignItems: "center",
          justifyContent: "center",
          zIndex: 200,
        },
      ]}
    >
      <Text
        style={{
          fontFamily: fonts.heading3,
          fontSize: 14,
          color: colors.textPrimary,
        }}
      >
        {message}
      </Text>
    </Animated.View>
  );
}
