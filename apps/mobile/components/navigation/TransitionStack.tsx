import React from "react";
import { Stack } from "expo-router";
import { Pressable, View } from "react-native";

export { Stack };

type TransitionComponentProps = {
  children?: React.ReactNode;
  sharedBoundTag?: string;
  style?: any;
  [key: string]: any;
};

function TransitionView({
  children,
  sharedBoundTag: _sharedBoundTag,
  ...props
}: TransitionComponentProps) {
  return <View {...props}>{children}</View>;
}

function TransitionPressable({
  children,
  sharedBoundTag: _sharedBoundTag,
  ...props
}: TransitionComponentProps) {
  return <Pressable {...props}>{children}</Pressable>;
}

// Safe replacement for react-native-screen-transitions. iOS 26 has been
// unstable with custom native transition stacks, so keep navigation native-stack
// based and degrade shared-bound animations to normal views.
export const Transition = {
  View: TransitionView,
  Pressable: TransitionPressable,
  MaskedView: TransitionView,
  Presets: {
    SharedAppleMusic: (_options?: Record<string, unknown>) => ({}),
    ZoomIn: () => ({ animation: "fade" as const }),
  },
};

export function SafeMaskedView({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  return <View style={style}>{children}</View>;
}

export const slideFromRight = {
  animation: "slide_from_right" as const,
};
