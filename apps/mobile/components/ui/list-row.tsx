import React from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { radius, spacing } from "@/constants/theme";

/**
 * Composable “list item” / card row (shadcn-style: Frame + Main + Media + Body + slots).
 * Use a fixed `frameWidth` in px so the bordered surface and row layout don’t “detach” in lists.
 */
type ListRowFrameProps = {
  children: React.ReactNode;
  /** Total row width in px (e.g. screen width − list horizontal insets). */
  frameWidth: number;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderLeftColor?: string;
  borderLeftWidth?: number;
};

function ListRowFrame({
  children,
  frameWidth,
  style,
  backgroundColor,
  borderColor,
  borderWidth = 1,
  borderLeftColor,
  borderLeftWidth,
}: ListRowFrameProps) {
  return (
    <View
      style={[
        {
          width: frameWidth,
          maxWidth: frameWidth,
          borderRadius: radius.md,
          overflow: "hidden" as const,
          borderWidth,
          backgroundColor,
          borderColor,
          borderLeftColor: borderLeftColor ?? borderColor,
          borderLeftWidth: borderLeftWidth ?? borderWidth,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type ListRowMainProps = { children: React.ReactNode; style?: StyleProp<ViewStyle> };
function ListRowMain({ children, style }: ListRowMainProps) {
  return <View style={[listStyles.main, style]}>{children}</View>;
}

type ListRowMediaProps = { children: React.ReactNode; style?: StyleProp<ViewStyle> };
function ListRowMedia({ children, style }: ListRowMediaProps) {
  return <View style={[listStyles.media, style]}>{children}</View>;
}

type ListRowBodyProps = { children: React.ReactNode; style?: StyleProp<ViewStyle> };
function ListRowBody({ children, style }: ListRowBodyProps) {
  return <View style={[listStyles.body, style]}>{children}</View>;
}

type ListRowHeaderProps = { children: React.ReactNode; style?: StyleProp<ViewStyle> };
function ListRowHeader({ children, style }: ListRowHeaderProps) {
  return <View style={[listStyles.header, style]}>{children}</View>;
}

type ListRowFooterProps = { children: React.ReactNode; style?: StyleProp<ViewStyle> };
function ListRowFooter({ children, style }: ListRowFooterProps) {
  return <View style={[listStyles.footer, style]}>{children}</View>;
}

type ListRowMetaProps = { children: React.ReactNode; style?: StyleProp<ViewStyle> };
function ListRowMeta({ children, style }: ListRowMetaProps) {
  return <View style={[listStyles.meta, style]}>{children}</View>;
}

const listStyles = StyleSheet.create({
  main: {
    width: "100%" as const,
    flexDirection: "row" as const,
    alignItems: "stretch" as const,
    minWidth: 0,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  media: {
    marginRight: spacing.sm + 2,
    justifyContent: "center" as const,
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center" as const,
    gap: spacing.xs,
  },
  header: {
    width: "100%" as const,
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    justifyContent: "space-between" as const,
    gap: spacing.sm,
    minWidth: 0,
  },
  footer: {
    width: "100%" as const,
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
    justifyContent: "space-between" as const,
    gap: spacing.sm,
    minWidth: 0,
  },
  meta: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    flexGrow: 0,
    flexShrink: 0,
    gap: 2,
  },
});

export const ListRow = {
  Frame: ListRowFrame,
  Main: ListRowMain,
  Media: ListRowMedia,
  Body: ListRowBody,
  Header: ListRowHeader,
  Footer: ListRowFooter,
  Meta: ListRowMeta,
};
