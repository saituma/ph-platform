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
import React, { PropsWithChildren } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "./global.css";
import AppThemeProvider from "./theme/AppThemeProvider";
import { StripeProvider } from "@stripe/stripe-react-native";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { Compose } from "@/lib/compose";

const GestureRoot = ({ children }: PropsWithChildren) => (
  <GestureHandlerRootView style={{ flex: 1 }}>{children}</GestureHandlerRootView>
);

const StripeWrapper = ({ children }: PropsWithChildren) => {
  const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  return <StripeProvider publishableKey={publishableKey}>{children}</StripeProvider>;
};

export default function RootLayout() {
  return (
    <Compose
      providers={[
        GestureRoot,
        KeyboardProvider,
        BottomSheetModalProvider,
        ReduxProvider,
        SafeAreaProvider,
        StripeWrapper,
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
      <View style={{ flex: 1 }}>
        <AuthPersist />
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
            name="schedule/event"
            options={({ route }: any) => ({
              gestureEnabled: true,
              gestureDirection: "vertical",
              ...Transition.Presets.SharedAppleMusic({
                sharedBoundTag: String(route?.params?.sharedBoundTag ?? "schedule-event"),
              }),
            })}
          />
        </Stack>
        <StatusBar style="auto" />
      </View>
    </Compose>
  );
}
