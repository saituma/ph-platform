import { RefreshProvider } from "@/context/RefreshContext";
import { RoleProvider } from "@/context/RoleContext";
import { AppLockProvider } from "@/context/AppLockContext";
import { ReduxProvider } from "@/store/Provider";
import { AuthPersist } from "@/store/AuthPersist";
import { Colors } from "@/constants/theme";
import { StripeProvider } from "@stripe/stripe-react-native";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useColorScheme, vars } from "nativewind";
import React, { useEffect, useState } from "react";
import { LogBox, Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppLockGate } from "@/components/AppLockGate";
import { getNotifications } from "@/lib/notifications";
import "./global.css";
import useLoadFonts from "./hooks/useLoadFonts";
import AppThemeProvider from "./theme/AppThemeProvider";
import { FontScaleProvider } from "@/context/FontScaleContext";
import { AgeExperienceProvider } from "@/context/AgeExperienceContext";
import { TabVisibilityProvider } from "@/context/TabVisibilityContext";
import { SocketProvider } from "@/context/SocketContext";

SplashScreen.preventAutoHideAsync();

LogBox.ignoreLogs([
  "SafeAreaView has been deprecated",
]);

if (__DEV__) {
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    const firstArg = typeof args[0] === "string" ? args[0] : "";
    if (firstArg.includes("SafeAreaView has been deprecated")) {
      return;
    }
    originalWarn(...args);
  };
}

if (Platform.OS === "web") {
  void import("./fonts.css");
}

getNotifications().then((Notifications) => {
  if (!Notifications || typeof Notifications.setNotificationHandler !== "function") return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
});

if (typeof global !== "undefined") {
  const anyGlobal = global as any;
  if (!anyGlobal.__keepAwakeGuard) {
    anyGlobal.__keepAwakeGuard = true;
    const handler = (reason: any) => {
      const message = typeof reason === "string" ? reason : reason?.message;
      if (message && message.toLowerCase().includes("keep awake")) {
        return;
      }
      console.warn("Unhandled promise rejection", reason);
    };
    if (anyGlobal?.process?.on) {
      anyGlobal.process.on("unhandledRejection", handler);
    }
  }
}


export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const fontsLoaded = useLoadFonts();
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        if (fontsLoaded || Platform.OS === "web") {
          setAppIsReady(true);
        }
      } catch (e) {
        console.warn(e);
      }
    }
    prepare();
  }, [fontsLoaded]);

  useEffect(() => {
    if (!__DEV__ || Platform.OS === "web") return;
    let isActive = true;
    (async () => {
      try {
        await activateKeepAwakeAsync();
      } catch (err) {
        const message = typeof err === "string" ? err : (err as any)?.message;
        if (message && message.toLowerCase().includes("keep awake")) return;
        console.warn("Failed to activate keep awake", err);
      }
    })();
    return () => {
      if (isActive) {
        void deactivateKeepAwake();
      }
      isActive = false;
    };
  }, []);

  useEffect(() => {
    async function configureNotifications() {
      const Notifications = await getNotifications();
      if (!Notifications) return;

      if (Platform.OS === "android") {
        if (
          Notifications.AndroidImportance &&
          typeof Notifications.setNotificationChannelAsync === "function"
        ) {
          await Notifications.setNotificationChannelAsync("messages", {
            name: "Messages",
            importance: Notifications.AndroidImportance.MAX,
            sound: "default",
          });
          await Notifications.setNotificationChannelAsync("bookings", {
            name: "Bookings",
            importance: Notifications.AndroidImportance.DEFAULT,
            sound: "default",
          });
          await Notifications.setNotificationChannelAsync("birthday", {
            name: "Birthday",
            importance: Notifications.AndroidImportance.HIGH,
            sound: "default",
          });
        }
      }

      if (typeof Notifications.setNotificationCategoryAsync === "function") {
        await Notifications.setNotificationCategoryAsync("messages", [
          {
            identifier: "mark-read",
            buttonTitle: "Mark Read",
            options: { opensAppToForeground: false },
          },
          {
            identifier: "reply",
            buttonTitle: "Reply",
            options: { opensAppToForeground: true },
            textInput: {
              submitButtonTitle: "Send",
              placeholder: "Type your reply",
            },
          },
        ]);
      }

      if (typeof Notifications.getPermissionsAsync === "function") {
        const settings = await Notifications.getPermissionsAsync();
        if (settings?.status !== "granted" && typeof Notifications.requestPermissionsAsync === "function") {
          await Notifications.requestPermissionsAsync();
        }
      }
    }

    configureNotifications();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  const themeVars: Record<`--${string}`, string> = colorScheme === "dark" ? {
    "--color-bg": "#0F1115",
    "--color-bg-secondary": "#1A1D27",
    "--color-bg-input": "#1A1D27",
    "--color-card": "#181B23",
    "--color-card-elevated": "#1F2330",
    "--color-separator": "rgba(255, 255, 255, 0.08)",
    "--color-text": "#f8fafc",
    "--color-text-secondary": "#94a3b8",
    "--color-text-muted": "#64748b",
    "--color-accent": "#22c55e",
    "--color-accent-light": "#064e3b",
    "--color-border": "rgba(255, 255, 255, 0.12)",
    "--color-border-10": "rgba(255, 255, 255, 0.12)",
    "--color-border-15": "rgba(255, 255, 255, 0.16)",
    "--color-border-20": "rgba(255, 255, 255, 0.20)",
    "--color-icon": "#94a3b8",
    "--color-success": "#10b981",
    "--color-success-soft": "#064e3b",
    "--color-warning": "#f59e0b",
    "--color-warning-soft": "#451a03",
    "--color-danger": "#ef4444",
    "--color-danger-soft": "#450a0a",
  } : {};

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ReduxProvider>
        <SafeAreaProvider>
          <TabVisibilityProvider>
            <RoleProvider>
              <AppLockProvider>
                <SocketProvider>
                  <AppThemeProvider>
                    <FontScaleProvider>
                      <AgeExperienceProvider>
                        <RefreshProvider>
                          <View
                            style={[
                              {
                                flex: 1,
                                backgroundColor:
                                  colorScheme === "dark"
                                    ? Colors.dark.background
                                    : Colors.light.background,
                              },
                              colorScheme === "dark" ? vars(themeVars) : undefined,
                            ]}
                          >
                            <StripeProvider
                              publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""}
                              merchantIdentifier="merchant.ph.performance"
                            >
                              <AuthPersist />
                              <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
                              <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
                              <AppLockGate />
                            </StripeProvider>
                          </View>
                        </RefreshProvider>
                      </AgeExperienceProvider>
                    </FontScaleProvider>
                  </AppThemeProvider>
                </SocketProvider>
              </AppLockProvider>
            </RoleProvider>
          </TabVisibilityProvider>
        </SafeAreaProvider>
      </ReduxProvider>
    </GestureHandlerRootView>
  );
}
