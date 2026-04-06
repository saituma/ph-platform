import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring 
} from 'react-native-reanimated';
import { colors, fonts, radius } from '@/constants/theme';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Feel tag pill type for passing in data
export type FeelTagDetails = {
  icon: any;
  label: string;
};

interface RunCardProps {
  distance: string;
  date: string;
  time: string;
  pace: string;
  effortLevel?: number;
  feelTags?: FeelTagDetails[];
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const RunCard = ({ 
  distance, 
  date, 
  time, 
  pace, 
  effortLevel, 
  feelTags,
  onPress 
}: RunCardProps) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Resolve accent color based on effort mapping: 
  // 1-2 (Lime), 3 (Purple), 4-5 (Coral)
  const getEffortColor = () => {
    if (effortLevel === undefined) return colors.lime;
    if (effortLevel <= 2) return colors.lime;
    if (effortLevel === 3) return colors.purple;
    return colors.coral; // 4 or 5
  };

  const effortColor = getEffortColor();
  const getEffortBorderColor = () => {
    if (effortLevel === undefined) return colors.borderLime;
    if (effortLevel <= 2) return colors.borderLime;
    if (effortLevel === 3) return colors.borderPurple;
    return colors.borderCoral; // 4 or 5
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        animatedStyle,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderSubtle,
          borderWidth: 1,
          borderRadius: radius.xl,
          padding: 16,
          overflow: 'hidden',
        }
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View 
          style={{
            width: 48,
            height: 48,
            borderRadius: radius.md,
            backgroundColor: colors.surfaceHigh,
            borderColor: getEffortBorderColor(),
            borderWidth: 1,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 16,
          }}
        >
          <MaterialCommunityIcons name="shoe-print" size={22} color={effortColor} />
        </View>

        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={{ fontFamily: fonts.heading2, fontSize: 18, color: colors.textPrimary }}>
            {distance}
          </Text>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
            {date}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end', justifyContent: 'center', marginRight: 16 }}>
          <Text style={{ fontFamily: fonts.statNumber, fontSize: 16, color: colors.textPrimary, fontVariant: ['tabular-nums'] }}>
            {time}
          </Text>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
            {pace}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
      </View>

      {/* Bottom Row tags */}
      {feelTags && feelTags.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 16 }}>
          {feelTags.map((tag, i) => (
            <View 
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.surfaceHigh,
                borderColor: colors.borderMid,
                borderWidth: 1,
                borderRadius: radius.pill,
                paddingHorizontal: 10,
                paddingVertical: 4,
                gap: 4,
              }}
            >
               {/* Note: tag.icon comes from constants mapping */}
               <Text style={{ color: colors.textSecondary, fontFamily: fonts.accent, fontSize: 11 }}>
                 {tag.label}
               </Text>
            </View>
          ))}
        </View>
      )}

      {/* Gradient overlay at bottom for subtle effect */}
      <LinearGradient
        colors={[colors.surface + '00', colors.surface]}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 12, // subtle height
        }}
        pointerEvents="none"
      />
    </AnimatedPressable>
  );
};
