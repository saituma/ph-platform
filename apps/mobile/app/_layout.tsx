import { AgeExperienceProvider } from "@/context/AgeExperienceContext";
import { FontScaleProvider } from "@/context/FontScaleContext";
import { RefreshProvider } from "@/context/RefreshContext";
import { RoleProvider } from "@/context/RoleContext";
import { SocketProvider } from "@/context/SocketContext";
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

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ReduxProvider>
        <SafeAreaProvider>
          <AppThemeProvider>
            <FontScaleProvider>
              <AgeExperienceProvider>
                <RoleProvider>
                  <SocketProvider>
                    <RefreshProvider>
                      <View style={{ flex: 1 }}>
                        <AuthPersist />
                        <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
                        <StatusBar style="dark" />
                      </View>
                    </RefreshProvider>
                  </SocketProvider>
                </RoleProvider>
              </AgeExperienceProvider>
            </FontScaleProvider>
          </AppThemeProvider>
        </SafeAreaProvider>
      </ReduxProvider>
    </GestureHandlerRootView>
  );
}
