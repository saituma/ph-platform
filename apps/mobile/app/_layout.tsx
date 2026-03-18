import { AgeExperienceProvider } from "@/context/AgeExperienceContext";
import { FontScaleProvider } from "@/context/FontScaleContext";
import { RefreshProvider } from "@/context/RefreshContext";
import { RoleProvider } from "@/context/RoleContext";
import { SocketProvider } from "@/context/SocketContext";
import { InAppNotificationsProvider } from "@/context/InAppNotificationsContext";
import { AuthPersist } from "@/store/AuthPersist";
import { ReduxProvider } from "@/store/Provider";
import { Stack, Transition, slideFromRight } from "@/components/navigation/TransitionStack";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import "./global.css";
import AppThemeProvider from "./theme/AppThemeProvider";
import { StripeProvider } from "@stripe/stripe-react-native";

export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  const forceLogout =
    process.env.EXPO_PUBLIC_FORCE_LOGOUT === "1" ||
    process.env.EXPO_PUBLIC_FORCE_LOGOUT === "true";
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ReduxProvider>
        <SafeAreaProvider>
          <StripeProvider publishableKey={publishableKey}>
            <AppThemeProvider>
              <FontScaleProvider>
                <AgeExperienceProvider>
                  <RoleProvider>
                    <InAppNotificationsProvider>
                      <SocketProvider>
                        <RefreshProvider>
                          <View style={{ flex: 1 }}>
                            <AuthPersist />
                            <Stack
                              screenOptions={{ headerShown: false, ...slideFromRight }}
                              initialRouteName={forceLogout ? "(auth)" : undefined}
                            >
                              <Stack.Screen
                                name="programs/[id]"
                                options={({ route }: any) => ({
                                  gestureEnabled: false,
                                  ...Transition.Presets.SharedAppleMusic({
                                    sharedBoundTag: String(route?.params?.sharedBoundTag ?? "program-card"),
                                  }),
                                })}
                              />
                              <Stack.Screen
                                name="programs/content/[contentId]"
                                options={({ route }: any) => ({
                                  gestureDirection: ["horizontal"],
                                  gestureEnabled: false,
                                  ...Transition.Presets.SharedAppleMusic({
                                    sharedBoundTag: String(route?.params?.sharedBoundTag ?? "program-content"),
                                  }),
                                })}
                              />
                              <Stack.Screen
                                name="messages/[id]"
                                options={({ route }: any) => ({
                                  ...Transition.Presets.SharedAppleMusic({
                                    sharedBoundTag: String(route?.params?.sharedBoundTag ?? "thread-card"),
                                  }),
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
                            <StatusBar style="dark" />
                          </View>
                        </RefreshProvider>
                      </SocketProvider>
                    </InAppNotificationsProvider>
                  </RoleProvider>
                </AgeExperienceProvider>
              </FontScaleProvider>
            </AppThemeProvider>
          </StripeProvider>
        </SafeAreaProvider>
      </ReduxProvider>
    </GestureHandlerRootView>
  );
}
