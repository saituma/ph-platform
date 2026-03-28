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
import React from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "./global.css";
import AppThemeProvider from "./theme/AppThemeProvider";
import { StripeProvider } from "@stripe/stripe-react-native";

export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ReduxProvider>
        <SafeAreaProvider>
          <StripeProvider publishableKey={publishableKey}>
            <AppThemeProvider>
              <HeroAppProvider>
                <FontScaleProvider>
                  <AgeExperienceProvider>
                    <RoleProvider>
                      <InAppNotificationsProvider>
                        <SocketProvider>
                          <RefreshProvider>
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
                                      sharedBoundTag: String(
                                        route?.params?.sharedBoundTag ?? "program-card"
                                      ),
                                    }),
                                    // Preset sets gestureEnabled + vertical gestures; must run after preset
                                    // or scroll is interpreted as interactive dismiss.
                                    gestureEnabled: false,
                                  })}
                                />
                                <Stack.Screen
                                  name="programs/content/[contentId]"
                                  options={({ route }: any) => ({
                                    ...Transition.Presets.SharedAppleMusic({
                                      sharedBoundTag: String(
                                        route?.params?.sharedBoundTag ?? "program-content"
                                      ),
                                    }),
                                    gestureEnabled: false,
                                  })}
                                />
                                <Stack.Screen
                                  name="programs/exercise/[planExerciseId]"
                                  options={({ route }: any) => ({
                                    ...Transition.Presets.SharedAppleMusic({
                                      sharedBoundTag: String(
                                        route?.params?.sharedBoundTag ?? "program-exercise"
                                      ),
                                    }),
                                    gestureEnabled: false,
                                  })}
                                />
                                <Stack.Screen
                                  name="messages/[id]"
                                  options={({ route }: any) => ({
                                    ...Transition.Presets.SharedAppleMusic({
                                      sharedBoundTag: String(
                                        route?.params?.sharedBoundTag ?? "thread-card"
                                      ),
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
                                      sharedBoundTag: String(
                                        route?.params?.sharedBoundTag ?? "schedule-event"
                                      ),
                                    }),
                                  })}
                                />
                              </Stack>
                              <StatusBar style="auto" />
                            </View>
                          </RefreshProvider>
                        </SocketProvider>
                      </InAppNotificationsProvider>
                    </RoleProvider>
                  </AgeExperienceProvider>
                </FontScaleProvider>
              </HeroAppProvider>
            </AppThemeProvider>
          </StripeProvider>
        </SafeAreaProvider>
      </ReduxProvider>
    </GestureHandlerRootView>
  );
}
