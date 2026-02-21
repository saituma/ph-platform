import { RefreshProvider } from "@/context/RefreshContext";
import { RoleProvider } from "@/context/RoleContext";
import { AppLockProvider } from "@/context/AppLockContext";
import { ReduxProvider } from "@/store/Provider";
import { AuthPersist } from "@/store/AuthPersist";
import { useAppSelector } from "@/store/hooks";
import { DarkTheme, DefaultTheme, NavigationContainerRefContext, NavigationContext } from "@react-navigation/native";
import { StripeProvider } from "@stripe/stripe-react-native";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import React, { useEffect, useMemo, useState } from "react";
import { LogBox, Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppLockGate } from "@/components/AppLockGate";
import { getNotifications } from "@/lib/notifications";
import "./global.css";
import useLoadFonts from "./hooks/useLoadFonts";
import AppThemeProvider from "./theme/AppThemeProvider";
import { useAppTheme } from "./theme/AppThemeProvider";
import { FontScaleProvider } from "@/context/FontScaleContext";
import { AgeExperienceProvider } from "@/context/AgeExperienceContext";
import { TabVisibilityProvider } from "@/context/TabVisibilityContext";

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
      shouldSetBadge: false,
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

function GlobalRefreshLayout({ children }: { children: React.ReactNode }) {
  const { colorScheme } = useColorScheme();
  const theme = colorScheme === "dark" ? DarkTheme : DefaultTheme;

  return (
    <View
      className={colorScheme === "dark" ? "dark" : ""}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      {children}
    </View>
  );
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

  const navigationStub = useMemo(
    () =>
      ({
        navigate: () => undefined,
        goBack: () => undefined,
        dispatch: () => undefined,
        addListener: () => () => undefined,
        removeListener: () => undefined,
        reset: () => undefined,
        canGoBack: () => false,
        isFocused: () => true,
        getParent: () => undefined,
        setOptions: () => undefined,
        getState: () => undefined,
      }) as any,
    []
  );

  if (!appIsReady) {
    return null;
  }

  return (
    <NavigationContainerRefContext.Provider value={navigationStub}>
      <NavigationContext.Provider value={navigationStub}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ReduxProvider>
            <SafeAreaProvider>
              <TabVisibilityProvider>
                <RoleProvider>
                  <AppLockProvider>
                    <AppThemeProvider>
                      <FontScaleProvider>
                        <AgeExperienceProvider>
                          <RefreshProvider>
                            <GlobalRefreshLayout>
                              <StripeProvider
                                publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""}
                                merchantIdentifier="merchant.ph.performance"
                              >
                                <AuthPersist />
                                <AppShell colorScheme={colorScheme} />
                              </StripeProvider>
                            </GlobalRefreshLayout>
                          </RefreshProvider>
                        </AgeExperienceProvider>
                      </FontScaleProvider>
                    </AppThemeProvider>
                  </AppLockProvider>
                </RoleProvider>
              </TabVisibilityProvider>
            </SafeAreaProvider>
          </ReduxProvider>
        </GestureHandlerRootView>
      </NavigationContext.Provider>
    </NavigationContainerRefContext.Provider>
  );
}

function AppShell({ colorScheme }: { colorScheme: "light" | "dark" }) {
  const { colors } = useAppTheme();
  const hydrated = useAppSelector((state) => state.user.hydrated);

  if (!hydrated) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false, animation: "none" }} />
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <AppLockGate />
      <SafeNavigationLayer />
    </>
  );
}

function SafeNavigationLayer() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <>
    </>
  );
}
