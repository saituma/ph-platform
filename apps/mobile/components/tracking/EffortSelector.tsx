import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withSpring,
  useSharedValue,
  withSequence
} from 'react-native-reanimated';
import { fonts, radius, icons as themeIcons } from '@/constants/theme';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAppTheme } from "@/app/theme/AppThemeProvider";

interface EffortSelectorProps {
  value: number;
  onChange: (val: number) => void;
}

const EFFORT_CONFIG = [
  { level: 1, label: 'EZZ', icon: themeIcons.effortVeryEasy },
  { level: 2, label: 'EZ', icon: themeIcons.effortEasy },
  { level: 3, label: 'MOD', icon: themeIcons.effortModerate },
  { level: 4, label: 'HRD', icon: themeIcons.effortHard },
  { level: 5, label: 'MAX', icon: themeIcons.effortMaximum },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const EffortButton = ({ config, isSelected, onPress }: { config: any, isSelected: boolean, onPress: () => void }) => {
  const { colors, isDark } = useAppTheme();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isSelected) {
      scale.value = withSequence(
        withSpring(0.9, { damping: 8, stiffness: 400 }),
        withSpring(1.05, { damping: 10, stiffness: 350 }),
        withSpring(1.0, { damping: 12, stiffness: 300 })
      );
    }
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const IconComponent = config.icon.lib === 'Ionicons' ? Ionicons : MaterialCommunityIcons;

  return (
    <AnimatedPressable 
      onPress={onPress}
      style={[
        animatedStyle,
        {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isSelected ? colors.accentLight : colors.cardElevated,
          borderColor: isSelected ? colors.accent : colors.border,
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: 12,
          ...(isDark || !isSelected
            ? {}
            : { shadowColor: colors.accent, shadowOpacity: 0.14, shadowRadius: 12, elevation: 4 }),
        }
      ]}
    >
      <IconComponent 
        name={config.icon.name as any} 
        size={24} 
        color={isSelected ? colors.accent : colors.textSecondary} 
      />
      <Text 
        style={{
          fontFamily: fonts.heroDisplay, // Britney-Bold
          fontSize: 22,
          color: isSelected ? colors.text : colors.textSecondary,
          textAlign: 'center',
          marginTop: 4,
        }}
      >
        {config.level}
      </Text>
      <Text 
        style={{
          fontFamily: fonts.bodyMedium, // Satoshi-Medium
          fontSize: 9,
          color: colors.textSecondary,
          textAlign: 'center',
          marginTop: 2,
        }}
        numberOfLines={3}
      >
        {config.label}
      </Text>
    </AnimatedPressable>
  );
};

export const EffortSelector = ({ value, onChange }: EffortSelectorProps) => {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
      {EFFORT_CONFIG.map((config) => (
        <EffortButton 
          key={config.level} 
          config={config} 
          isSelected={value === config.level} 
          onPress={() => onChange(config.level)} 
        />
      ))}
    </View>
  );
};
