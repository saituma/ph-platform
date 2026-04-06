import React, { useState, useEffect } from "react";
import { View, Text, Pressable, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, fonts, radius, icons as themeIcons } from "@/constants/theme";

import { useRunStore } from "../../../store/useRunStore";
import { saveRunRecord } from "../../../lib/sqliteRuns";

import { EffortSelector } from "../../../components/tracking/EffortSelector";
import { FeelTagSelector, FEEL_TAGS } from "../../../components/tracking/FeelTagSelector";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function FeedbackScreen() {
  const router = useRouter();
  const { distanceMeters, elapsedSeconds, coordinates, resetRun } = useRunStore();

  const [effort, setEffort] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);
  const toastTranslateY = useSharedValue(-100);
  const scaleSaveBtn = useSharedValue(1);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 350 });
    translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
  }, []);

  useEffect(() => {
    if (showToast) {
      toastTranslateY.value = withSpring(0, { damping: 15, stiffness: 200 });
      setTimeout(() => {
        toastTranslateY.value = withSpring(-100, { damping: 15, stiffness: 200 });
      }, 2500);
    }
  }, [showToast]);

  const toggleTag = (id: string) => {
    Haptics.selectionAsync();
    setSelectedTags(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    if (effort === null) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const distanceKm = distanceMeters / 1000;
      const avg_speed = distanceKm / (elapsedSeconds / 3600);
      const avg_pace = (elapsedSeconds / 60) / distanceKm;
      const calories = distanceKm * 60;

      saveRunRecord({
        id: Crypto.randomUUID(),
        date: new Date().toISOString(),
        distance_meters: distanceMeters,
        duration_seconds: elapsedSeconds,
        avg_pace: Number.isNaN(avg_pace) || !isFinite(avg_pace) ? 0 : avg_pace,
        avg_speed: Number.isNaN(avg_speed) || !isFinite(avg_speed) ? 0 : avg_speed,
        calories,
        coordinates: JSON.stringify(coordinates),
        effort_level: effort,
        feel_tags: JSON.stringify(selectedTags.map(st => FEEL_TAGS.find(t => t.id === st)?.label)),
        notes,
      });

      setShowToast(true);
      setTimeout(() => {
        resetRun();
        router.replace("/(tabs)/tracking" as any);
      }, 1000); // 1s visual feedback before navigate
    } catch (e) {
      console.error(e);
      Alert.alert("Error saving run");
    }
  };

  const animatedScreenStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
    flex: 1,
  }));

  const animatedToastStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toastTranslateY.value }]
  }));

  const animatedSaveBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleSaveBtn.value }]
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <Animated.ScrollView 
          bounces={true} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 40, paddingBottom: 60 }}
          style={animatedScreenStyle}
        >
          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <Ionicons name={themeIcons.edit.name as any} size={28} color={colors.lime} style={{ marginBottom: 12 }} />
            <Text style={{ fontFamily: fonts.heroDisplay, fontSize: 38, color: colors.textPrimary, letterSpacing: -1 }}>How did it go?</Text>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textSecondary, marginTop: 4 }}>
              Rate your run below
            </Text>
          </View>
          
          {/* Effort Level card */}
          <View style={{ 
            backgroundColor: colors.surface, 
            borderColor: colors.borderSubtle, 
            borderWidth: 1, 
            borderRadius: radius.xxl, 
            padding: 20, 
            marginBottom: 24 
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <MaterialCommunityIcons name={themeIcons.pace.name as any} size={18} color={colors.purple} style={{ marginRight: 8 }} />
              <Text style={{ fontFamily: fonts.labelCaps, fontSize: 11, color: colors.textSecondary, letterSpacing: 2.5 }}>EFFORT LEVEL</Text>
            </View>
            <EffortSelector 
               value={effort ?? 0} 
               onChange={(val) => { 
                  Haptics.selectionAsync(); 
                  setEffort(val); 
               }} 
            />
          </View>

          {/* Feel Tags card */}
          <View style={{ 
            backgroundColor: colors.surface, 
            borderColor: colors.borderSubtle, 
            borderWidth: 1, 
            borderRadius: radius.xxl, 
            padding: 20, 
            marginBottom: 24 
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name={themeIcons.speed.name as any} size={18} color={colors.cyan} style={{ marginRight: 8 }} />
              <Text style={{ fontFamily: fonts.labelCaps, fontSize: 11, color: colors.textSecondary, letterSpacing: 2.5 }}>HOW DID IT FEEL?</Text>
            </View>
            <FeelTagSelector selectedKeys={selectedTags} onToggle={toggleTag} />
          </View>

          {/* Notes card */}
          <View style={{ 
            backgroundColor: colors.surface, 
            borderColor: colors.borderSubtle, 
            borderWidth: 1, 
            borderRadius: radius.xxl, 
            padding: 20, 
            marginBottom: 32 
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name={themeIcons.edit.name as any} size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <Text style={{ fontFamily: fonts.labelCaps, fontSize: 11, color: colors.textSecondary, letterSpacing: 2.5 }}>
                NOTES
              </Text>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textDim, marginLeft: 8 }}>(optional)</Text>
            </View>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="What was on your mind?..."
              placeholderTextColor={colors.textDim}
              multiline
              maxLength={200}
              textAlignVertical="top"
              style={{
                backgroundColor: colors.surfaceHigh,
                borderColor: isFocused ? colors.borderLime : colors.borderMid,
                borderWidth: isFocused ? 1.5 : 1,
                borderRadius: radius.lg,
                padding: 14,
                minHeight: 100,
                fontFamily: fonts.bodyMedium,
                fontSize: 14,
                color: colors.textPrimary,
              }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 12 }}>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textDim }}>{notes.length} / 200</Text>
            </View>
          </View>

          {/* Save button */}
          <AnimatedPressable 
            onPress={handleSave}
            onPressIn={() => effort !== null && (scaleSaveBtn.value = withSpring(0.96, { damping: 15, stiffness: 300 }))}
            onPressOut={() => effort !== null && (scaleSaveBtn.value = withSpring(1, { damping: 15, stiffness: 300 }))}
            disabled={effort === null}
            style={[animatedSaveBtnStyle, {
              width: '100%',
              height: 68,
              backgroundColor: colors.lime,
              borderRadius: radius.xxl, 
              flexDirection: 'row', 
              justifyContent: 'center', 
              alignItems: 'center',
              opacity: effort === null ? 0.35 : 1,
              shadowColor: effort === null ? 'transparent' : colors.lime,
              shadowOpacity: 0.4,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 10 },
              elevation: effort === null ? 0 : 10,
            }]}
          >
             <Ionicons name={themeIcons.save.name as any} size={26} color={colors.textInverse} style={{ marginRight: 8 }} />
             <Text style={{ fontFamily: fonts.heading1, fontSize: 20, color: colors.textInverse, marginTop: 4 }}>SAVE RUN</Text>
          </AnimatedPressable>

        </Animated.ScrollView>
      </KeyboardAvoidingView>

      {/* Success Toast */}
      {showToast && (
        <Animated.View 
          style={[animatedToastStyle, { 
            position: 'absolute', top: 60, left: 20, right: 20, 
            backgroundColor: colors.surfaceHigh, 
            borderColor: colors.borderLime, 
            borderWidth: 1.5, 
            borderRadius: radius.xl, 
            padding: 16, 
            flexDirection: 'row', 
            justifyContent: 'center', 
            alignItems: 'center', 
            shadowColor: colors.lime, 
            shadowOpacity: 0.3, 
            shadowRadius: 10,
            zIndex: 999 
          }]}
        >
          <MaterialCommunityIcons name={themeIcons.medal.name as any} size={24} color={colors.lime} style={{ marginRight: 12 }} />
          <Text style={{ fontFamily: fonts.heading2, fontSize: 16, color: colors.textPrimary }}>Run saved!</Text>
        </Animated.View>
      )}

    </SafeAreaView>
  );
}
