import { View, type ViewProps } from 'react-native';

import { useAppTheme } from '@/app/theme/AppThemeProvider';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  variant?: 'default' | 'secondary';
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  variant = 'default',
  ...otherProps
}: ThemedViewProps) {
  const { colors, colorScheme } = useAppTheme();
  const backgroundColor = lightColor && darkColor
    ? (colorScheme === 'light' ? lightColor : darkColor)
    : (variant === 'secondary' ? colors.backgroundSecondary : colors.background);

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
