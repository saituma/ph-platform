export async function getNotifications() {
  try {
    const { Platform } = await import("react-native");
    if (Platform.OS === "web") {
      return null;
    }

    const ConstantsMod = await import("expo-constants");
    const anyConstants = ConstantsMod as any;
    const constants = anyConstants?.default ?? anyConstants;
    const ownership = constants?.appOwnership ?? null;
    const executionEnvironment = constants?.executionEnvironment ?? null;
    const ExecutionEnvironment = anyConstants?.ExecutionEnvironment;
    const isStoreClient =
      ExecutionEnvironment &&
      executionEnvironment === ExecutionEnvironment.StoreClient;
    const isExpoGo =
      ownership === "expo" || isStoreClient || executionEnvironment === "storeClient";

    if (isExpoGo) {
      // Expo Go does not support remote push notifications.
      return null;
    }
    const mod = await import("expo-notifications");
    // Expo Go can miss some native methods; only return if core APIs exist.
    const api = mod as any;
    if (
      typeof api?.scheduleNotificationAsync !== "function" ||
      typeof api?.setNotificationHandler !== "function" ||
      typeof api?.getPermissionsAsync !== "function" ||
      typeof api?.requestPermissionsAsync !== "function" ||
      typeof api?.getExpoPushTokenAsync !== "function"
    ) {
      return null;
    }
    return mod;
  } catch {
    return null;
  }
}
