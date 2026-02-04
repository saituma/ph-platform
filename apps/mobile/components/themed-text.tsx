import { StyleSheet, Text, type TextProps } from 'react-native';

import { useAppTheme } from '@/app/theme/AppThemeProvider';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'secondary';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const { colors, colorScheme } = useAppTheme();
  const color = lightColor && darkColor
    ? (colorScheme === 'light' ? lightColor : darkColor)
    : (type === 'secondary' ? colors.textSecondary : colors.text);

  const linkColor = colors.accent;

  return (
    <Text
      style={[
        { color: type === 'link' ? linkColor : color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        type === 'secondary' ? styles.secondary : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Outfit',
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    fontFamily: 'Outfit',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 40,
    fontFamily: 'ClashDisplay',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'ClashDisplay',
  },
  secondary: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Outfit',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    fontFamily: 'Outfit',
    fontWeight: '600',
  },
});
