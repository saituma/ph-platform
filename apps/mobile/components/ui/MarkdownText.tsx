import React, { useMemo } from "react";
import { Linking, View, StyleProp, TextStyle, ViewStyle } from "react-native";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

type MarkdownTextProps = {
  text: string;
  baseStyle?: StyleProp<TextStyle>;
  headingStyle?: StyleProp<TextStyle>;
  subheadingStyle?: StyleProp<TextStyle>;
  listItemStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
};

type InlineToken = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  href?: string;
};

const parseInline = (line: string): InlineToken[] => {
  const tokens: InlineToken[] = [];
  let i = 0;
  while (i < line.length) {
    if (line.startsWith("[", i)) {
      const closeLabel = line.indexOf("]", i + 1);
      if (closeLabel !== -1 && line[closeLabel + 1] === "(") {
        const closeUrl = line.indexOf(")", closeLabel + 2);
        if (closeUrl !== -1) {
          const label = line.slice(i + 1, closeLabel);
          const href = line.slice(closeLabel + 2, closeUrl);
          if (label && href) {
            tokens.push({ text: label, href });
            i = closeUrl + 1;
            continue;
          }
        }
      }
    }
    if (line.startsWith("**", i)) {
      const end = line.indexOf("**", i + 2);
      if (end !== -1) {
        tokens.push({ text: line.slice(i + 2, end), bold: true });
        i = end + 2;
        continue;
      }
    }
    if (line.startsWith("_", i)) {
      const end = line.indexOf("_", i + 1);
      if (end !== -1) {
        tokens.push({ text: line.slice(i + 1, end), italic: true });
        i = end + 1;
        continue;
      }
    }
    const nextBold = line.indexOf("**", i);
    const nextItalic = line.indexOf("_", i);
    const nextLink = line.indexOf("[", i);
    const nextCandidates = [nextBold, nextItalic, nextLink].filter(
      (val) => val !== -1,
    );
    const next = nextCandidates.length ? Math.min(...nextCandidates) : -1;
    if (next === -1) {
      tokens.push({ text: line.slice(i) });
      break;
    }
    tokens.push({ text: line.slice(i, next) });
    i = next;
  }
  return tokens;
};

const renderInline = (
  line: string,
  baseStyle: StyleProp<TextStyle> | undefined,
  linkStyle: StyleProp<TextStyle>,
) => {
  const tokens = parseInline(line);
  return tokens.map((token, index) => (
    <Text
      key={`md-inline-${index}`}
      style={[
        baseStyle,
        token.href ? linkStyle : null,
        token.bold ? { fontWeight: "700" } : null,
        token.italic ? { fontStyle: "italic" } : null,
      ]}
      onPress={
        token.href
          ? () => {
              Linking.openURL(token.href!);
            }
          : undefined
      }
    >
      {token.text}
    </Text>
  ));
};

export function MarkdownText({
  text,
  baseStyle,
  headingStyle,
  subheadingStyle,
  listItemStyle,
  containerStyle,
}: MarkdownTextProps) {
  const { colors } = useAppTheme();
  const lines = useMemo(() => text.split(/\r?\n/), [text]);
  const resolvedBaseStyle: StyleProp<TextStyle> = [
    { color: colors.text },
    baseStyle,
  ];
  const resolvedLinkStyle: StyleProp<TextStyle> = {
    color: colors.accent,
    textDecorationLine: "underline",
  };
  return (
    <View style={containerStyle}>
      {lines.map((raw, index) => {
        const line = raw.trimEnd();
        if (!line) {
          return <View key={`md-line-${index}`} style={{ height: 10 }} />;
        }
        if (line.startsWith("### ")) {
          return (
            <Text
              key={`md-line-${index}`}
              style={[resolvedBaseStyle, subheadingStyle]}
            >
              {renderInline(
                line.slice(4),
                resolvedBaseStyle,
                resolvedLinkStyle,
              )}
            </Text>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <Text
              key={`md-line-${index}`}
              style={[resolvedBaseStyle, headingStyle]}
            >
              {renderInline(
                line.slice(3),
                resolvedBaseStyle,
                resolvedLinkStyle,
              )}
            </Text>
          );
        }
        if (line.startsWith("# ")) {
          return (
            <Text
              key={`md-line-${index}`}
              style={[resolvedBaseStyle, headingStyle]}
            >
              {renderInline(
                line.slice(2),
                resolvedBaseStyle,
                resolvedLinkStyle,
              )}
            </Text>
          );
        }
        if (line.startsWith("- ")) {
          return (
            <Text
              key={`md-line-${index}`}
              style={[resolvedBaseStyle, listItemStyle]}
            >
              {renderInline(
                `• ${line.slice(2)}`,
                resolvedBaseStyle,
                resolvedLinkStyle,
              )}
            </Text>
          );
        }
        return (
          <Text key={`md-line-${index}`} style={resolvedBaseStyle}>
            {renderInline(line, resolvedBaseStyle, resolvedLinkStyle)}
          </Text>
        );
      })}
    </View>
  );
}
