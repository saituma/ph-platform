import { AgeExperienceProvider } from "@/context/AgeExperienceContext";
import { FontScaleProvider } from "@/context/FontScaleContext";
import { RefreshProvider } from "@/context/RefreshContext";
import { RoleProvider } from "@/context/RoleContext";
import { SocketProvider } from "@/context/SocketContext";
import { InAppNotificationsProvider } from "@/context/InAppNotificationsContext";
import { Stack, slideFromRight, Transition } from "@/components/navigation/TransitionStack";
import { HeroAppProvider } from "@/components/ui/hero";
import { AuthPersist } from "@/store/AuthPersist";
import { ReduxProvider } from "@/store/Provider";
import { StatusBar } from "expo-status-bar";
import React, { PropsWithChildren, ReactElement, useEffect } from "react";
import { View, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "./global.css";
/** Registers expo-task-manager background location task at startup (before any screen). */
import "@/lib/backgroundTask";
import AppThemeProvider from "./theme/AppThemeProvider";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { Compose } from "@/lib/compose";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { RootErrorBoundary } from "@/components/RootErrorBoundary";
import { AndroidBackToTabs } from "@/components/navigation/AndroidBackToTabs";
import { runStartupSelfTest } from "@/lib/startupDiagnostics";

const GestureRoot = ({ children }: { children: ReactElement }) => (
  <GestureHandlerRootView style={{ flex: 1 }}>{children}</GestureHandlerRootView>
);

const QueryWrapper = ({ children }: { children: ReactElement }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

export default function RootLayout() {
  useEffect(() => {
    void runStartupSelfTest();
  }, []);

  return (
    <Compose
      providers={[
        GestureRoot,
        QueryWrapper,
        KeyboardProvider,
        BottomSheetModalProvider,
        ReduxProvider,
        SafeAreaProvider,
        AppThemeProvider,
        HeroAppProvider,
        FontScaleProvider,
        AgeExperienceProvider,
        RoleProvider,
        InAppNotificationsProvider,
        SocketProvider,
        RefreshProvider,
      ]}
    >
      <RootErrorBoundary>
      <View style={{ flex: 1 }}>
        <AuthPersist />
        <AndroidBackToTabs />
        <Stack
          screenOptions={{
            ...slideFromRight,
          }}
        >
          <Stack.Screen
            name="programs/[id]"
            options={({ route }: any) => ({
              ...Transition.Presets.SharedAppleMusic({
                sharedBoundTag: String(route?.params?.sharedBoundTag ?? "program-card"),
              }),
              gestureEnabled: false,
            })}
          />
          <Stack.Screen
            name="programs/content/[contentId]"
            options={({ route }: any) => ({
              ...Transition.Presets.SharedAppleMusic({
                sharedBoundTag: String(route?.params?.sharedBoundTag ?? "program-content"),
              }),
              gestureEnabled: false,
            })}
          />
          <Stack.Screen
            name="programs/exercise/[planExerciseId]"
            options={({ route }: any) => ({
              ...Transition.Presets.SharedAppleMusic({
                sharedBoundTag: String(route?.params?.sharedBoundTag ?? "program-exercise"),
              }),
              gestureEnabled: false,
            })}
          />
          <Stack.Screen
            name="messages/[id]"
            options={({ route }: any) => ({
              ...Transition.Presets.SharedAppleMusic({
                sharedBoundTag: String(route?.params?.sharedBoundTag ?? "thread-card"),
              }),
              gestureEnabled: false,
            })}
          />
          <Stack.Screen
            name="team/messages/[id]"
            options={({ route }: any) => ({
              ...Transition.Presets.SharedAppleMusic({
                sharedBoundTag: String(route?.params?.sharedBoundTag ?? "thread-card"),
              }),
              gestureEnabled: false,
            })}
          />
          <Stack.Screen
            name="adult/messages/[id]"
            options={({ route }: any) => ({
              ...Transition.Presets.SharedAppleMusic({
                sharedBoundTag: String(route?.params?.sharedBoundTag ?? "thread-card"),
              }),
              gestureEnabled: false,
            })}
          />
          <Stack.Screen
            name="youth/messages/[id]"
            options={({ route }: any) => ({
              ...Transition.Presets.SharedAppleMusic({
                sharedBoundTag: String(route?.params?.sharedBoundTag ?? "thread-card"),
              }),
              gestureEnabled: false,
            })}
          />
          <Stack.Screen
            name="admin/messages/[id]"
            options={({ route }: any) => ({
              ...Transition.Presets.SharedAppleMusic({
                sharedBoundTag: String(route?.params?.sharedBoundTag ?? "thread-card"),
              }),
              gestureEnabled: false,
            })}
          />
          <Stack.Screen
            name="admin-audience-workspace/[audienceLabel]"
            options={{ title: "Content Workspace" }}
          />
          <Stack.Screen
            name="admin-audience-workspace/modules/[moduleId]"
            options={{ title: "Module Detail" }}
          />
          <Stack.Screen
            name="admin-audience-workspace/sessions/[sessionId]"
            options={{ title: "Session Detail" }}
          />
          <Stack.Screen
            name="schedule/event"
            options={({ route }: any) => ({
              gestureEnabled: true,
              gestureDirection: "vertical",
              ...Transition.Presets.SharedAppleMusic({
                sharedBoundTag: String(route?.params?.sharedBoundTag ?? "schedule-event"),
              }),
            })}
          />
          {/* Standalone route (same pattern as nutrition.tsx) — explicit screen helps blank-stack registration */}
          <Stack.Screen name="progress" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </View>
      </RootErrorBoundary>
    </Compose>
  );
}
