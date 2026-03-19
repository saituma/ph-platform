import { AgeExperienceProvider } from "@/context/AgeExperienceContext";
import { FontScaleProvider } from "@/context/FontScaleContext";
import { RefreshProvider } from "@/context/RefreshContext";
import { RoleProvider } from "@/context/RoleContext";
import { SocketProvider } from "@/context/SocketContext";
import { InAppNotificationsProvider } from "@/context/InAppNotificationsContext";
import { AuthPersist } from "@/store/AuthPersist";
import { ReduxProvider } from "@/store/Provider";
import { Stack } from "expo-router";
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
                            <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
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
