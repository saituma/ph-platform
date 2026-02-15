export async function getNotifications() {
  try {
    const Constants = await import("expo-constants");
    const ownership = Constants?.default?.appOwnership ?? Constants?.appOwnership;
    if (ownership === "expo") {
      // Expo Go does not support remote push notifications.
      return null;
    }
    const mod = await import("expo-notifications");
    // Expo Go can miss some native methods; only return if core APIs exist.
    const api = mod as any;
    if (
      typeof api?.scheduleNotificationAsync !== "function" ||
      typeof api?.setNotificationHandler !== "function"
    ) {
      return null;
    }
    return mod;
  } catch {
    return null;
  }
}
