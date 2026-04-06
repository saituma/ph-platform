import React, { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSequence,
  withSpring 
} from 'react-native-reanimated';
import { colors, fonts, radius, icons as themeIcons } from '@/constants/theme';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

export interface FeelTag {
  id: string;
  label: string;
  icon: any;
}

export const FEEL_TAGS: FeelTag[] = [
  { id: '1', label: 'Energized', icon: themeIcons.feelEnergized },
  { id: '2', label: 'Tired', icon: themeIcons.feelTired },
  { id: '3', label: 'Heavy Legs', icon: themeIcons.feelHeavyLegs },
  { id: '4', label: 'Breathless', icon: themeIcons.feelBreathless },
  { id: '5', label: 'Strong', icon: themeIcons.feelStrong },
  { id: '6', label: 'Struggled', icon: themeIcons.feelStruggled },
  { id: '7', label: 'In The Zone', icon: themeIcons.feelInZone },
  { id: '8', label: 'Pain/Discomfort', icon: themeIcons.feelDiscomfort },
];

interface FeelTagSelectorProps {
  selectedKeys: string[];
  onToggle: (id: string) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TagPill = ({ tag, isSelected, onPress }: { tag: FeelTag, isSelected: boolean, onPress: () => void }) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isSelected) {
      scale.value = withSequence(
        withSpring(0.92, { damping: 8, stiffness: 400 }),
        withSpring(1.04, { damping: 10, stiffness: 350 }),
        withSpring(1.0, { damping: 12, stiffness: 300 })
      );
    }
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const IconComponent = tag.icon.lib === 'Ionicons' ? Ionicons : MaterialCommunityIcons;

  return (
    <AnimatedPressable
      onPress={onPress}
      style={[
        animatedStyle,
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isSelected ? colors.lime : colors.surfaceHigh,
          borderWidth: isSelected ? 0 : 1,
          borderColor: colors.borderMid,
          borderRadius: radius.pill,
          paddingHorizontal: 14,
          paddingVertical: 9,
          shadowColor: isSelected ? colors.lime : 'transparent',
          shadowOpacity: isSelected ? 0.4 : 0,
          shadowRadius: isSelected ? 12 : 0,
          elevation: isSelected ? 6 : 0,
        }
      ]}
    >
      <IconComponent 
        name={tag.icon.name as any} 
        size={14} 
        color={isSelected ? colors.textInverse : colors.textSecondary} 
        style={{ marginRight: 6 }} 
      />
      <Text 
        style={{
          fontFamily: fonts.accent, // ClashDisplay-Semibold
          fontSize: 13,
          color: isSelected ? colors.textInverse : colors.textSecondary,
        }}
      >
        {tag.label}
      </Text>
    </AnimatedPressable>
  );
};

export const FeelTagSelector = ({ selectedKeys, onToggle }: FeelTagSelectorProps) => {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {FEEL_TAGS.map((tag) => (
        <TagPill 
          key={tag.id}
          tag={tag}
          isSelected={selectedKeys.includes(tag.id)}
          onPress={() => onToggle(tag.id)}
        />
      ))}
    </View>
  );
};
