import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, ScrollView, Pressable, Platform, Dimensions } from 'react-native';
import { Stack } from 'expo-router';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  withSequence,
  Easing 
} from 'react-native-reanimated';
import { LiquidGlass, LiquidGlassContainer } from '@/components/ui/LiquidGlass';
import { Colors, fonts, radius, spacing, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@/components/ui/theme-icons';
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { MeshGradientView } from "expo-mesh-gradient";

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const MESH_POINTS: number[][] = [
  [0, 0],
  [0.5, 0],
  [1, 0],
  [0, 0.5],
  [0.5, 0.5],
  [1, 0.5],
  [0, 1],
  [0.5, 1],
  [1, 1],
];

const MESH_COLORS: string[] = [
  "#07070F",
  "#7B61FF",
  "#07070F",
  "#00E5FF",
  "#07070F",
  "#C8F135",
  "#07070F",
  "#7B61FF",
  "#07070F",
];

export default function LiquidGlassDemo() {
  const scheme = useColorScheme();
  const colorScheme = scheme === "dark" ? "dark" : "light";
  const colors = Colors[colorScheme];
  const insets = useAppSafeAreaInsets();
  const [glassStyle, setGlassStyle] = useState<'regular' | 'clear' | 'none'>('regular');
  
  // Floating animation values
  const floatValue = useSharedValue(0);

  useEffect(() => {
    floatValue.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const floatingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatValue.value * 10 }],
  }));

  const floatingStyleDelayed = useAnimatedStyle(() => ({
    transform: [{ translateY: -floatValue.value * 8 }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerTransparent: true,
          headerTintColor: '#FFFFFF',
        }}
      />
      
      <ScrollView 
        bounces={false}
        contentContainerStyle={styles.scrollContent}
        style={StyleSheet.absoluteFill}
      >
        {/* Full Height Hero Section with iOS 26 Mesh Gradient */}
        <View style={[styles.heroSection, { height: SCREEN_HEIGHT }]}>
          <MeshGradientView
            columns={3}
            rows={3}
            points={MESH_POINTS}
            colors={MESH_COLORS}
            style={StyleSheet.absoluteFill}
          />
          
          <View style={[styles.overlay, { paddingTop: insets.top + 60 }]}>
            <Animated.View style={[styles.badge, floatingStyleDelayed]}>
              <Text style={[styles.badgeText, { color: colors.accent, fontFamily: fonts.labelCaps }]}>
                NATIVE EXPERIMENT
              </Text>
            </Animated.View>

            <Text style={[styles.title, { fontFamily: fonts.heroNumber, color: '#FFFFFF' }]}>
              LIQUID{'\n'}GLASS
            </Text>
            
            {/* Floating Glass Card */}
            <Animated.View style={[styles.mainGlassContainer, floatingStyle]}>
              <LiquidGlass 
                style={[styles.mainGlass, Shadows.lg]} 
                glassStyle={glassStyle}
                isInteractive
              >
                <View style={styles.glassHeader}>
                  <Text style={[styles.glassText, { fontFamily: fonts.heading1, color: '#FFFFFF' }]}>
                    IMMERSIVE
                  </Text>
                  <View style={[styles.liveDot, { backgroundColor: colors.accent }]} />
                </View>
                <Text style={[styles.glassSubtext, { fontFamily: fonts.bodyMedium, color: 'rgba(255,255,255,0.7)' }]}>
                  {Platform.OS === 'ios' ? 'Native UIVisualEffectView' : 'High-fidelity Blur Fallback'}
                </Text>
              </LiquidGlass>
            </Animated.View>
          </View>
        </View>

        <View style={[styles.content, { backgroundColor: colors.background }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIndicator} />
            <Text style={[styles.sectionTitle, { fontFamily: fonts.heading2, color: colors.text }]}>
              Dynamic Interaction
            </Text>
          </View>
          <Text style={[styles.description, { fontFamily: fonts.bodyMedium, color: colors.textSecondary }]}>
            Liquid glass elements react to proximity. On compatible iOS devices, these "blobs" will merge into a single fluid shape when moved.
          </Text>

          <View style={[styles.demoContainer, { backgroundColor: colors.surface }]}>
             <Image
              style={styles.demoBg}
              source={{
                uri: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop',
              }}
            />
            <LiquidGlassContainer spacing={15} style={styles.glassRow}>
              <LiquidGlass style={[styles.circleGlass, Shadows.md]} isInteractive />
              <LiquidGlass style={[styles.circleGlass, { width: 60, height: 60 }, Shadows.md]} isInteractive />
              <LiquidGlass style={[styles.circleGlass, { width: 50, height: 50 }, Shadows.md]} isInteractive />
            </LiquidGlassContainer>
          </View>

          <View style={[styles.sectionHeader, { marginTop: spacing.xxl }]}>
            <View style={styles.sectionIndicator} />
            <Text style={[styles.sectionTitle, { fontFamily: fonts.heading2, color: colors.text }]}>
              Effect Configuration
            </Text>
          </View>
          
          <View style={styles.styleRow}>
            {(['regular', 'clear', 'none'] as const).map((style) => (
              <Pressable
                key={style}
                onPress={() => setGlassStyle(style)}
                style={[
                  styles.styleButton,
                  { 
                    backgroundColor: glassStyle === style ? colors.accent : colors.surfaceHigh,
                    borderColor: glassStyle === style ? colors.accent : colors.border
                  }
                ]}
              >
                <Text style={[
                  styles.buttonText, 
                  { 
                    color: glassStyle === style ? colors.textInverse : colors.text,
                    fontFamily: fonts.labelCaps 
                  }
                ]}>
                  {style}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.tintRow}>
            <LiquidGlass 
              style={[styles.tintedGlass, Shadows.sm]} 
              tintColor={colors.lime}
              glassStyle="regular"
            >
              <Ionicons name="flash" size={24} color={colors.lime} />
              <Text style={[styles.tintLabel, { color: colors.lime, fontFamily: fonts.labelCaps }]}>LIME</Text>
            </LiquidGlass>

            <LiquidGlass 
              style={[styles.tintedGlass, Shadows.sm]} 
              tintColor={colors.purple}
              glassStyle="regular"
            >
              <Ionicons name="moon" size={24} color={colors.purple} />
              <Text style={[styles.tintLabel, { color: colors.purple, fontFamily: fonts.labelCaps }]}>PURPLE</Text>
            </LiquidGlass>
          </View>

          <View style={{ height: insets.bottom + spacing.xl }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroSection: {
    width: '100%',
    overflow: 'hidden',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    padding: spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  badge: {
    backgroundColor: 'rgba(200, 241, 53, 0.25)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(200, 241, 53, 0.4)',
  },
  badgeText: {
    fontSize: 10,
    letterSpacing: 2,
  },
  title: {
    fontSize: 72,
    lineHeight: 68,
    marginBottom: spacing.xxl,
    letterSpacing: -3,
  },
  mainGlassContainer: {
    width: '100%',
    marginTop: 'auto',
    marginBottom: spacing.xxl * 2,
  },
  mainGlass: {
    width: '100%',
    padding: spacing.xl,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  glassHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  glassText: {
    fontSize: 32,
    letterSpacing: -1,
  },
  glassSubtext: {
    fontSize: 15,
    lineHeight: 22,
  },
  content: {
    padding: spacing.xl,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    marginTop: -radius.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionIndicator: {
    width: 4,
    height: 16,
    borderRadius: radius.pill,
    backgroundColor: '#C8F135',
  },
  sectionTitle: {
    fontSize: 22,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  demoContainer: {
    height: 200,
    borderRadius: radius.xl,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8,
  },
  glassRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  circleGlass: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  styleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  styleButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 12,
  },
  tintRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  tintedGlass: {
    flex: 1,
    height: 110,
    borderRadius: radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tintLabel: {
    fontSize: 11,
    marginTop: spacing.sm,
    letterSpacing: 1,
  },
});
