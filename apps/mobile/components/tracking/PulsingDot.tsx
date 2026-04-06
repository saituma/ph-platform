import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  Easing,
  withDelay
} from 'react-native-reanimated';
import { colors, radius } from '@/constants/theme';

interface PulsingDotProps {
  color?: string;
}

export const PulsingDot = ({ color = '#00E5FF' }: PulsingDotProps) => {
  // 3 rings: outer, mid, inner
  const scaleOuter = useSharedValue(1);
  const opacityOuter = useSharedValue(0.15);
  
  const scaleMid = useSharedValue(1);
  const opacityMid = useSharedValue(0.3);

  useEffect(() => {
    // Outer ring scale 1->1.8, opacity 0.15->0, 0ms delay
    scaleOuter.value = withRepeat(
      withTiming(1.8, { duration: 1500, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    opacityOuter.value = withRepeat(
      withTiming(0, { duration: 1500, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );

    // Mid ring
    scaleMid.value = withDelay(
      300,
      withRepeat(
        withTiming(1.8, { duration: 1500, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );
    opacityMid.value = withDelay(
      300,
      withRepeat(
        withTiming(0, { duration: 1500, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );
  }, []);

  const animatedStyleOuter = useAnimatedStyle(() => ({
    transform: [{ scale: scaleOuter.value }],
    opacity: opacityOuter.value,
  }));

  const animatedStyleMid = useAnimatedStyle(() => ({
    transform: [{ scale: scaleMid.value }],
    opacity: opacityMid.value,
  }));

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 40, height: 40 }}>
      {/* Outer Ring */}
      <Animated.View style={[animatedStyleOuter, {
        position: 'absolute',
        width: 40,
        height: 40,
        borderRadius: radius.pill,
        backgroundColor: color,
      }]} />
      
      {/* Mid Ring */}
      <Animated.View style={[animatedStyleMid, {
        position: 'absolute',
        width: 24,
        height: 24,
        borderRadius: radius.pill,
        backgroundColor: color,
      }]} />
      
      {/* Inner Solid Dot */}
      <View style={{
        width: 8,
        height: 8,
        borderRadius: radius.pill,
        backgroundColor: color,
        zIndex: 10,
      }} />
    </View>
  );
};
