import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { Text } from "@/components/ScaledText";

interface LegalModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function LegalModal({
  visible,
  onClose,
  title,
  children,
}: LegalModalProps) {
  const { colors } = useAppTheme();
  const { height: windowHeight } = useWindowDimensions();
  const [isMounted, setIsMounted] = useState(visible);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetProgress = useRef(new Animated.Value(0)).current;
  const sheetHeight = Math.max(340, Math.min(windowHeight * 0.8, 720));

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(sheetProgress, {
          toValue: 1,
          damping: 18,
          stiffness: 180,
          mass: 0.9,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sheetProgress, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
      }
    });
  }, [backdropOpacity, sheetProgress, visible]);

  if (!isMounted) return null;

  const sheetTranslateY = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [420, 0],
  });

  return (
    <Modal
      visible={isMounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View className="flex-1">
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              opacity: backdropOpacity,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
            },
          ]}
        >
          <Pressable className="flex-1" onPress={onClose} />
        </Animated.View>

        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              justifyContent: "flex-end",
            },
          ]}
          pointerEvents="box-none"
        >
          <Animated.View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              transform: [{ translateY: sheetTranslateY }],
            }}
          >
            <View
              className="bg-app w-full rounded-t-[32px] overflow-hidden shadow-xl border-t border-l border-r border-app"
              style={{
                height: sheetHeight,
                marginBottom: 0,
              }}
            >
              <View className="px-6 pt-3 pb-4 border-b border-app bg-app">
                <View className="items-center mb-3">
                  <View
                    className="h-1.5 w-12 rounded-full"
                    style={{ backgroundColor: colors.textSecondary + "33" }}
                  />
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-xl font-clash text-app font-bold">
                    {title}
                  </Text>
                  <Pressable
                    accessibilityLabel="Close legal sheet"
                    accessibilityRole="button"
                    className="w-9 h-9 items-center justify-center bg-secondary rounded-full"
                    hitSlop={8}
                    onPress={onClose}
                  >
                    <Feather name="x" size={16} color={colors.textSecondary} />
                  </Pressable>
                </View>
              </View>

              <ScrollView
                contentContainerStyle={{ padding: 24, paddingBottom: 36 }}
                showsVerticalScrollIndicator={false}
              >
                {children}
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

export function LegalSection({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <View className="mb-6">
      <Text className="text-lg font-bold font-clash text-app mb-2 tracking-tight">
        {title}
      </Text>
      <Text className="text-base font-outfit text-secondary leading-relaxed">
        {content}
      </Text>
    </View>
  );
}
