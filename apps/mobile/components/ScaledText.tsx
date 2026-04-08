import React, { useMemo } from "react";
import {
  Platform,
  StyleSheet,
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

const baseTextStyle: TextStyle = {
  fontFamily: "Outfit-Medium",
  ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
};

const getTypeAdjustments = (style: any): TextStyle => {
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const fontSize = flat?.fontSize;
  if (typeof fontSize !== "number") return {};

  const next: TextStyle = {};
  if (flat?.lineHeight == null) {
    const ratio =
      fontSize >= 32
        ? 1.06
        : fontSize >= 26
          ? 1.12
          : fontSize >= 20
            ? 1.2
            : fontSize >= 16
              ? 1.32
              : 1.42;
    next.lineHeight = Math.round(fontSize * ratio);
  }

  if (flat?.letterSpacing == null) {
    const spacing =
      fontSize >= 32
        ? -0.5
        : fontSize >= 26
          ? -0.35
          : fontSize >= 20
            ? -0.2
            : 0;
    if (spacing !== 0) {
      next.letterSpacing = spacing;
    }
  }

  return next;
};

const MIN_FONT_SIZE = 13;

const scaleStyle = (style: any, scale: number): any => {
  if (!style && scale === 1) return style;
  if (Array.isArray(style)) {
    return style.map((item) => scaleStyle(item, scale));
  }
  if (typeof style !== "object") return style;

  const next = { ...style } as TextStyle;
  if (typeof next.fontSize === "number") {
    const scaled = Math.round(next.fontSize * scale);
    next.fontSize = Math.max(scaled, MIN_FONT_SIZE);
  }
  if (typeof next.lineHeight === "number") {
    next.lineHeight = Math.round(next.lineHeight * scale);
  }
  if (typeof next.letterSpacing === "number") {
    next.letterSpacing = Number((next.letterSpacing * scale).toFixed(2));
  }
  return next;
};

export function Text(props: TextProps & { className?: string }) {
  const { fontScale } = useFontScale();
  const { colors } = useAppTheme();
  const { style, ...rest } = props;
  const scaledStyle = useMemo(() => {
    const adjustments = getTypeAdjustments(style);
    return scaleStyle(
      [baseTextStyle, { color: colors.text }, adjustments, style],
      fontScale,
    );
  }, [colors.text, fontScale, style]);

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
  const scaledStyle = useMemo(() => {
    const adjustments = getTypeAdjustments(style);
    return scaleStyle([baseTextStyle, adjustments, style], fontScale);
  }, [fontScale, style]);
  const shouldStabilizeControlledIosInput =
    Platform.OS === "ios" && props.value !== undefined;

  // iOS controlled inputs can drop characters or move the cursor when predictive text
  // rewrites the buffer mid-update. We default to safer typing behavior app-wide while
  // still allowing individual screens to opt back in explicitly.
  return (
    <InteropTextInput
      {...rest}
      autoCorrect={autoCorrect ?? !shouldStabilizeControlledIosInput}
      spellCheck={spellCheck ?? !shouldStabilizeControlledIosInput}
      smartInsertDelete={
        smartInsertDelete ?? !shouldStabilizeControlledIosInput
      }
      selectionColor={selectionColor ?? colors.accent}
      cursorColor={cursorColor ?? colors.accent}
      placeholderTextColor={placeholderTextColor ?? colors.placeholder}
      style={scaledStyle}
    />
  );
}

export function AnimatedText(props: TextProps & { className?: string }) {
  const { fontScale } = useFontScale();
  const { colors } = useAppTheme();
  const { style, ...rest } = props;
  const scaledStyle = useMemo(() => {
    const adjustments = getTypeAdjustments(style);
    return scaleStyle(
      [baseTextStyle, { color: colors.text }, adjustments, style],
      fontScale,
    );
  }, [colors.text, fontScale, style]);

  return <AnimatedInteropText {...rest} style={scaledStyle} />;
}
