import { RefreshProvider } from "@/context/RefreshContext";
import { RoleProvider } from "@/context/RoleContext";
import { AppLockProvider } from "@/context/AppLockContext";
import { ReduxProvider } from "@/store/Provider";
import { AuthPersist } from "@/store/AuthPersist";
import { useAppSelector } from "@/store/hooks";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { StripeProvider } from "@stripe/stripe-react-native";
import { SplashScreen, Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useColorScheme } from "nativewind";
import React, { useEffect, useState } from "react";
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
                          <GlobalRefreshLayout>
                            <StripeProvider
                              publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""}
                              merchantIdentifier="merchant.ph.performance"
                            >
                              <AuthPersist />
                              <AppShell colorScheme={colorScheme ?? "light"} />
                            </StripeProvider>
                          </GlobalRefreshLayout>
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

function AppShell({ colorScheme }: { colorScheme: "light" | "dark" }) {
  const { colors } = useAppTheme();
  const hydrated = useAppSelector((state) => state.user.hydrated);
  const router = useRouter();
  const lastHandledNotificationRef = React.useRef<string | null>(null);

  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    const handleNotificationResponse = (response: any) => {
      const identifier = response?.notification?.request?.identifier;
      if (identifier && identifier === lastHandledNotificationRef.current) return;
      if (identifier) lastHandledNotificationRef.current = identifier;

      const data = response?.notification?.request?.content?.data as
        | { threadId?: string; type?: string; screen?: string }
        | undefined;
      const threadId = data?.threadId;
      if (threadId) {
        router.push(`/messages/${String(threadId)}`);
        return;
      }
      if (data?.type === "booking" || data?.screen === "schedule") {
        router.push("/(tabs)/schedule");
        return;
      }
      if (data?.screen === "messages") {
        router.push("/(tabs)/messages");
        return;
      }
      if (data?.screen === "plans") {
        router.push("/plans");
        return;
      }
      if (data?.screen === "physio-referral" || data?.type === "physio-referral") {
        router.push("/physio-referral");
      }
    };

    getNotifications().then(async (Notifications) => {
      if (!Notifications) return;
      if (typeof Notifications.addNotificationResponseReceivedListener === "function") {
        sub = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
      }
      if (typeof Notifications.getLastNotificationResponseAsync === "function") {
        const response = await Notifications.getLastNotificationResponseAsync();
        if (response) {
          handleNotificationResponse(response);
        }
      }
    });

    return () => {
      sub?.remove();
    };
  }, [router]);

  if (!hydrated) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
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
