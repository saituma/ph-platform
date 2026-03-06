import React, { useMemo } from "react";
import {
  Platform,
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from "react-native";
import Animated from "react-native-reanimated";
import { cssInterop } from "nativewind";
import { useFontScale } from "@/context/FontScaleContext";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

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
  const scaledStyle = useMemo(() => scaleStyle(style, fontScale), [fontScale, style]);

  return <InteropText {...rest} style={scaledStyle} />;
}

export function TextInput(props: TextInputProps & { className?: string }) {
  const { fontScale } = useFontScale();
  const { colors } = useAppTheme();
  const {
    style,
    selectionColor,
    cursorColor,
    placeholderTextColor,
    autoCorrect,
    spellCheck,
    smartInsertDelete,
    ...rest
  } = props;
  const scaledStyle = useMemo(() => scaleStyle(style, fontScale), [fontScale, style]);
  const shouldStabilizeControlledIosInput = Platform.OS === "ios" && props.value !== undefined;

  // iOS controlled inputs can drop characters or move the cursor when predictive text
  // rewrites the buffer mid-update. We default to safer typing behavior app-wide while
  // still allowing individual screens to opt back in explicitly.
  return (
    <InteropTextInput
      {...rest}
      autoCorrect={autoCorrect ?? !shouldStabilizeControlledIosInput}
      spellCheck={spellCheck ?? !shouldStabilizeControlledIosInput}
      smartInsertDelete={smartInsertDelete ?? !shouldStabilizeControlledIosInput}
      selectionColor={selectionColor ?? colors.accent}
      cursorColor={cursorColor ?? colors.accent}
      placeholderTextColor={placeholderTextColor ?? colors.placeholder}
      style={scaledStyle}
    />
  );
}

export function AnimatedText(props: TextProps & { className?: string }) {
  const { fontScale } = useFontScale();
  const { style, ...rest } = props;
  const scaledStyle = useMemo(() => scaleStyle(style, fontScale), [fontScale, style]);

  return <AnimatedInteropText {...rest} style={scaledStyle} />;
}
