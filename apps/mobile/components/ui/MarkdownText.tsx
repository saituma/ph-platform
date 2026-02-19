import React, { useMemo } from "react";
import { View, StyleProp, TextStyle, ViewStyle } from "react-native";
import { Text } from "@/components/ScaledText";

type MarkdownTextProps = {
  text: string;
  baseStyle?: StyleProp<TextStyle>;
  headingStyle?: StyleProp<TextStyle>;
  subheadingStyle?: StyleProp<TextStyle>;
  listItemStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
};

type InlineToken = { text: string; bold?: boolean; italic?: boolean };

const parseInline = (line: string): InlineToken[] => {
  const tokens: InlineToken[] = [];
  let i = 0;
  while (i < line.length) {
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
    const next =
      nextBold === -1
        ? nextItalic
        : nextItalic === -1
          ? nextBold
          : Math.min(nextBold, nextItalic);
    if (next === -1) {
      tokens.push({ text: line.slice(i) });
      break;
    }
    tokens.push({ text: line.slice(i, next) });
    i = next;
  }
  return tokens;
};

const renderInline = (line: string, baseStyle?: StyleProp<TextStyle>) => {
  const tokens = parseInline(line);
  return tokens.map((token, index) => (
    <Text
      key={`md-inline-${index}`}
      style={[
        baseStyle,
        token.bold ? { fontWeight: "700" } : null,
        token.italic ? { fontStyle: "italic" } : null,
      ]}
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
  const lines = useMemo(() => text.split(/\r?\n/), [text]);
  return (
    <View style={containerStyle}>
      {lines.map((raw, index) => {
        const line = raw.trimEnd();
        if (!line) {
          return <View key={`md-line-${index}`} style={{ height: 10 }} />;
        }
        if (line.startsWith("### ")) {
          return (
            <Text key={`md-line-${index}`} style={[baseStyle, subheadingStyle]}>
              {renderInline(line.slice(4), baseStyle)}
            </Text>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <Text key={`md-line-${index}`} style={[baseStyle, headingStyle]}>
              {renderInline(line.slice(3), baseStyle)}
            </Text>
          );
        }
        if (line.startsWith("# ")) {
          return (
            <Text key={`md-line-${index}`} style={[baseStyle, headingStyle]}>
              {renderInline(line.slice(2), baseStyle)}
            </Text>
          );
        }
        if (line.startsWith("- ")) {
          return (
            <Text key={`md-line-${index}`} style={[baseStyle, listItemStyle]}>
              {renderInline(`• ${line.slice(2)}`, baseStyle)}
            </Text>
          );
        }
        return (
          <Text key={`md-line-${index}`} style={baseStyle}>
            {renderInline(line, baseStyle)}
          </Text>
        );
      })}
    </View>
  );
}