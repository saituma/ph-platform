import React from "react";
import {
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from "react-native";
import Animated from "react-native-reanimated";
import { cssInterop } from "nativewind";
import { useFontScale } from "@/context/FontScaleContext";

const InteropText = cssInterop(RNText, { className: "style" });
const InteropTextInput = cssInterop(RNTextInput, { className: "style" });
const AnimatedInteropText = Animated.createAnimatedComponent(InteropText);

const scaleStyle = (style: any, scale: number): any => {
  if (!style || scale === 1) return style;
  if (Array.isArray(style)) {
    return style.map((item) => scaleStyle(item, scale));
  }
  if (typeof style !== "object") return style;

  const next = { ...style } as TextStyle;
  if (typeof next.fontSize === "number") {
    next.fontSize = Math.round(next.fontSize * scale);
  }
  if (typeof next.lineHeight === "number") {
    next.lineHeight = Math.round(next.lineHeight * scale);
  }
  return next;
};

export function Text(props: TextProps & { className?: string }) {
  const { fontScale } = useFontScale();
  const { style, ...rest } = props;
  const scaledStyle = scaleStyle(style, fontScale);

  return <InteropText {...rest} style={scaledStyle} />;
}

export function TextInput(props: TextInputProps & { className?: string }) {
  const { fontScale } = useFontScale();
  const { style, ...rest } = props;
  const scaledStyle = scaleStyle(style, fontScale);

  return <InteropTextInput {...rest} style={scaledStyle} />;
}

export function AnimatedText(props: TextProps & { className?: string }) {
  const { fontScale } = useFontScale();
  const { style, ...rest } = props;
  const scaledStyle = scaleStyle(style, fontScale);

  return <AnimatedInteropText {...rest} style={scaledStyle} />;
}
